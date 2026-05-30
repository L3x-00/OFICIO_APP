import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../generated/client/client.js';
import { TOOL_TIMEOUT_MS } from './ai-assistant.constants.js';

/**
 * Capa de acceso a datos para "Ofi" (Fase 3 — tools reales).
 *
 * REGLAS INQUEBRANTABLES:
 *   • Regla 2: NUNCA se devuelven entidades Prisma completas a Gemini.
 *     Cada método retorna un DTO plano con `select` explícito de SOLO los
 *     campos públicos necesarios. Prohibido `include` indiscriminado.
 *   • Regla 3: para PostGIS se usa EXCLUSIVAMENTE `Prisma.sql` con bind
 *     params (sin `$queryRawUnsafe`, sin string-concat). El esquema real
 *     tiene `providers.location_geog geography` con índice GiST
 *     `providers_location_geog_gist`.
 *   • Regla 4 (protección de costos): TODO método público corre con un
 *     timeout duro (`TOOL_TIMEOUT_MS` = 3 s) vía `withTimeout`. Si la
 *     consulta excede o falla, se devuelve un fallback vacío — la tool
 *     nunca cuelga el flujo ni tumba la app.
 *
 * El userId SIEMPRE llega del orquestador (derivado del JWT), nunca de
 * los argumentos del modelo → sin IDOR.
 */

// ── DTOs estrictos (lo único que ve Gemini) ─────────────────────
export interface ProviderCardDto {
  id: number;
  businessName: string;
  averageRating: number;
  totalReviews: number;
  slug: string | null;
  /** Distancia en km si la búsqueda fue geolocalizada; null si no. */
  distanceKm: number | null;
}

export interface CategoryDto {
  name: string;
  slug: string;
}

export interface OfferDto {
  title: string;
  description: string;
  price: number | null;
  provider: string;
}

export interface SubscriptionDto {
  plan: string;
  status: string;
  /** YYYY-MM-DD. */
  endDate: string;
}

export interface ReferralStatsDto {
  code: string | null;
  totalInvites: number;
  successfulInvites: number;
}

export interface ProviderStatsDto {
  averageRating: number;
  totalReviews: number;
  totalRecommendations: number;
  profileViews: number;
}

export interface KnowledgeDto {
  topic: string;
  content: unknown;
}

export interface RecommendedActionDto {
  label: string;
  hint: string;
}

/** Contexto del perfil de proveedor del solicitante (agente contextual). */
export interface MyProviderContextDto {
  businessName: string;
  profileViews: number;
  favorites: number;
  averageRating: number;
  totalReviews: number;
  photosCount: number;
  activeOffers: number;
  plan: string;
  planStatus: string;
  trustStatus: string;
  isTrusted: boolean;
}

/** Contexto de cuenta del solicitante cuando NO es proveedor. */
export interface MyUserContextDto {
  coins: number;
  favorites: number;
}

/** Contexto propio del solicitante (uno de los dos sub-objetos presente). */
export interface MyContextDto {
  role: string;
  provider?: MyProviderContextDto;
  user?: MyUserContextDto;
}

/** Fila cruda del search geolocalizado (raw SQL → DTO). */
interface ProviderGeoRow {
  id: number;
  businessName: string;
  averageRating: number;
  totalReviews: number;
  slug: string | null;
  distanceKm: number;
}

@Injectable()
export class AiDataAccessService {
  private readonly logger = new Logger(AiDataAccessService.name);

  /** Tope duro de resultados que se exponen al modelo. */
  private static readonly MAX_RESULTS = 5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Health-check liviano — confirma que la capa de datos responde.
   * No expone ningún dato; solo valida conectividad para diagnósticos.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (e) {
      this.logger.warn(
        `AiDataAccess health-check falló: ${(e as Error)?.message ?? e}`,
      );
      return false;
    }
  }

  // ── Tools comunes ───────────────────────────────────────────

  /**
   * Busca proveedores verificados. Si hay lat/lng usa PostGIS
   * (`ST_DWithin` parametrizado sobre `location_geog`); si no, ordena por
   * rating. Tope: 5 resultados con `select` estricto.
   */
  async searchProvidersSafe(
    category?: string,
    lat?: number,
    lng?: number,
    radiusKm?: number,
  ): Promise<ProviderCardDto[]> {
    const limit = Math.min(AiDataAccessService.MAX_RESULTS, 5);
    const geo = typeof lat === 'number' && typeof lng === 'number';

    const run = geo
      ? this.searchProvidersGeo(category, lat, lng, radiusKm, limit)
      : this.searchProvidersByRating(category, limit);

    return this.withTimeout(run, [], 'search_providers');
  }

  /** Rama geolocalizada: Prisma.sql + ST_DWithin (regla 3). */
  private async searchProvidersGeo(
    category: string | undefined,
    lat: number,
    lng: number,
    radiusKm: number | undefined,
    limit: number,
  ): Promise<ProviderCardDto[]> {
    // Radio en metros, acotado a [1, 50] km para no escanear de más.
    const radiusMeters = Math.min(Math.max(radiusKm ?? 10, 1), 50) * 1000;

    // Filtro opcional de categoría como fragmento parametrizado (bind).
    const catFilter =
      category && category.trim().length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM provider_categories pc
            JOIN categories c ON c.id = pc."categoryId"
            WHERE pc."providerId" = p.id
              AND (c.name ILIKE ${`%${category}%`} OR c.slug ILIKE ${`%${category}%`})
          )`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<ProviderGeoRow[]>(Prisma.sql`
      SELECT
        p.id,
        p."businessName" AS "businessName",
        p."averageRating" AS "averageRating",
        p."totalReviews"  AS "totalReviews",
        p.slug,
        (ST_Distance(
           p.location_geog,
           ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
         ) / 1000.0)::float8 AS "distanceKm"
      FROM providers p
      WHERE p."isVisible" = true
        AND p."verificationStatus" = 'APROBADO'
        AND p.location_geog IS NOT NULL
        AND ST_DWithin(
              p.location_geog,
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
              ${radiusMeters}
            )
        ${catFilter}
      ORDER BY "distanceKm" ASC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      businessName: r.businessName,
      averageRating: r.averageRating,
      totalReviews: r.totalReviews,
      slug: r.slug,
      distanceKm: Math.round(r.distanceKm * 100) / 100,
    }));
  }

  /** Rama sin ubicación: ranking por plan + rating (Prisma typed). */
  private async searchProvidersByRating(
    category: string | undefined,
    limit: number,
  ): Promise<ProviderCardDto[]> {
    const rows = await this.prisma.provider.findMany({
      where: {
        isVisible: true,
        verificationStatus: 'APROBADO',
        ...(category && category.trim().length > 0
          ? {
              providerCategories: {
                some: {
                  category: {
                    OR: [
                      { name: { contains: category, mode: 'insensitive' } },
                      { slug: { contains: category, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        businessName: true,
        averageRating: true,
        totalReviews: true,
        slug: true,
      },
      orderBy: [{ planPriority: 'asc' }, { averageRating: 'desc' }],
      take: limit,
    });

    return rows.map((r) => ({ ...r, distanceKm: null }));
  }

  /** Categorías activas (opcionalmente filtradas por nombre). */
  async searchCategoriesSafe(query?: string): Promise<CategoryDto[]> {
    const run = this.prisma.category
      .findMany({
        where: {
          isActive: true,
          ...(query && query.trim().length > 0
            ? { name: { contains: query, mode: 'insensitive' } }
            : {}),
        },
        select: { name: true, slug: true },
        orderBy: { name: 'asc' },
        take: 20,
      })
      .then((rows) => rows.map((r) => ({ name: r.name, slug: r.slug })));

    return this.withTimeout(run, [], 'search_categories');
  }

  /** Ofertas/promociones activas vigentes (máx 5). */
  async searchOffersSafe(category?: string): Promise<OfferDto[]> {
    const run = this.prisma.offerPost
      .findMany({
        where: {
          isActive: true,
          expiresAt: { gt: new Date() },
          ...(category && category.trim().length > 0
            ? {
                categories: {
                  some: {
                    category: {
                      OR: [
                        { name: { contains: category, mode: 'insensitive' } },
                        { slug: { contains: category, mode: 'insensitive' } },
                      ],
                    },
                  },
                },
              }
            : {}),
        },
        select: {
          title: true,
          description: true,
          price: true,
          provider: { select: { businessName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: AiDataAccessService.MAX_RESULTS,
      })
      .then((rows) =>
        rows.map((r) => ({
          title: r.title,
          description: r.description,
          price: r.price,
          provider: r.provider.businessName,
        })),
      );

    return this.withTimeout(run, [], 'search_offers');
  }

  /** Explicación oficial de una función de Servi desde la Knowledge Base. */
  async explainFeatureSafe(feature: string): Promise<KnowledgeDto | null> {
    const run = this.prisma.aiKnowledgeEntry
      .findFirst({
        where: {
          isActive: true,
          topic: { contains: feature, mode: 'insensitive' },
        },
        select: { topic: true, content: true },
      })
      .then((row) =>
        row
          ? ({ topic: row.topic, content: row.content } as KnowledgeDto)
          : null,
      );

    return this.withTimeout(run, null, 'explain_feature');
  }

  /**
   * Recomienda próximas acciones basándose EXCLUSIVAMENTE en el contexto
   * real del usuario (getMyContextSafe). NO inventa datos: cada sugerencia
   * deriva de un valor concreto del DTO (fotos<3, sin reseñas, etc.).
   */
  async recommendActionsSafe(
    userId: number,
    role: string,
  ): Promise<RecommendedActionDto[]> {
    const ctx = await this.getMyContextSafe(userId, role);
    const actions: RecommendedActionDto[] = [];

    const p = ctx.provider;
    if (p) {
      if (p.photosCount < 3) {
        actions.push({
          label: 'Agrega más fotos',
          hint: `Tienes ${p.photosCount} foto(s). Los perfiles con 3 o más fotos reciben más contactos.`,
        });
      }
      if (p.totalReviews === 0) {
        actions.push({
          label: 'Consigue tu primera reseña',
          hint: 'Pide a tus clientes que te califiquen para generar confianza.',
        });
      }
      if (!p.isTrusted && p.trustStatus !== 'PENDING') {
        actions.push({
          label: 'Solicita el sello de confianza',
          hint: 'Verifica tu identidad para destacar como proveedor confiable.',
        });
      }
      if (p.activeOffers === 0) {
        actions.push({
          label: 'Publica una oferta',
          hint: 'Las ofertas activas atraen más clientes a tu perfil.',
        });
      }
      if (p.plan === 'GRATIS') {
        actions.push({
          label: 'Mejora tu plan',
          hint: 'Un plan superior te da más visibilidad y más especialidades.',
        });
      }
      return actions;
    }

    const u = ctx.user;
    if (u) {
      if (u.favorites === 0) {
        actions.push({
          label: 'Explora y guarda favoritos',
          hint: 'Guarda proveedores en favoritos para contactarlos rápido.',
        });
      }
      actions.push({
        label: 'Invita y gana monedas',
        hint: `Tienes ${u.coins} moneda(s). Invita amigos con tu código para ganar más.`,
      });
    }
    return actions;
  }

  /**
   * Contexto propio del solicitante (Fase 7 — agente contextual). Para
   * PROVEEDOR: visitas, favoritos, rating, reseñas, fotos, ofertas, plan y
   * sello de confianza. Para el resto: monedas + favoritos. DTO estricto;
   * JAMÁS entidades Prisma completas (regla 2). Con timeout (regla 4).
   */
  async getMyContextSafe(userId: number, role: string): Promise<MyContextDto> {
    if (role === 'PROVEEDOR') {
      return this.withTimeout(
        this.computeProviderContext(userId),
        { role },
        'get_my_context',
      );
    }
    return this.withTimeout(
      this.computeUserContext(userId, role),
      { role },
      'get_my_context',
    );
  }

  private async computeProviderContext(userId: number): Promise<MyContextDto> {
    const provider = await this.prisma.provider.findFirst({
      where: { userId },
      select: {
        id: true,
        businessName: true,
        averageRating: true,
        totalReviews: true,
        isTrusted: true,
        trustStatus: true,
        subscription: { select: { plan: true, status: true } },
        _count: { select: { images: true, favorites: true } },
      },
    });
    if (!provider) return { role: 'PROVEEDOR' };

    const [profileViews, activeOffers] = await Promise.all([
      this.prisma.providerAnalytic.count({
        where: { providerId: provider.id, eventType: 'profile_view' },
      }),
      this.prisma.offerPost.count({
        where: {
          providerId: provider.id,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return {
      role: 'PROVEEDOR',
      provider: {
        businessName: provider.businessName,
        profileViews,
        favorites: provider._count.favorites,
        averageRating: provider.averageRating,
        totalReviews: provider.totalReviews,
        photosCount: provider._count.images,
        activeOffers,
        plan: provider.subscription?.plan ?? 'GRATIS',
        planStatus: provider.subscription?.status ?? 'GRACIA',
        trustStatus: provider.trustStatus,
        isTrusted: provider.isTrusted,
      },
    };
  }

  private async computeUserContext(
    userId: number,
    role: string,
  ): Promise<MyContextDto> {
    const [user, favorites] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { coins: true },
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);
    return {
      role,
      user: { coins: user?.coins ?? 0, favorites },
    };
  }

  // ── Tools de cuenta (userId del JWT) ────────────────────────

  /** Saldo de monedas del usuario actual. */
  async getUserCoinsSafe(userId: number): Promise<number> {
    const run = this.prisma.user
      .findUnique({ where: { id: userId }, select: { coins: true } })
      .then((u) => u?.coins ?? 0);

    return this.withTimeout(run, 0, 'get_user_coins');
  }

  /** Estadísticas de referidos del usuario actual. */
  async getReferralStatsSafe(userId: number): Promise<ReferralStatsDto> {
    const run = this.prisma.referralCode
      .findUnique({
        where: { userId },
        select: { code: true, totalInvites: true, successfulInvites: true },
      })
      .then((rc) => ({
        code: rc?.code ?? null,
        totalInvites: rc?.totalInvites ?? 0,
        successfulInvites: rc?.successfulInvites ?? 0,
      }));

    return this.withTimeout(
      run,
      { code: null, totalInvites: 0, successfulInvites: 0 },
      'get_referral_stats',
    );
  }

  // ── Tools de proveedor (userId del JWT) ─────────────────────

  /** Estado de la suscripción del proveedor del usuario actual. */
  async getSubscriptionStatusSafe(
    userId: number,
  ): Promise<SubscriptionDto | null> {
    const run = this.prisma.provider
      .findFirst({
        where: { userId, type: 'NEGOCIO' },
        select: {
          subscription: { select: { plan: true, status: true, endDate: true } },
        },
      })
      // Si no hay perfil NEGOCIO, intenta cualquiera con suscripción.
      .then(async (negocio) => {
        if (negocio?.subscription) return negocio.subscription;
        const any = await this.prisma.provider.findFirst({
          where: { userId },
          select: {
            subscription: {
              select: { plan: true, status: true, endDate: true },
            },
          },
        });
        return any?.subscription ?? null;
      })
      .then((sub) =>
        sub
          ? ({
              plan: sub.plan,
              status: sub.status,
              endDate: sub.endDate.toISOString().slice(0, 10),
            } as SubscriptionDto)
          : null,
      );

    return this.withTimeout(run, null, 'get_subscription_status');
  }

  /** Métricas del perfil del proveedor del usuario actual. */
  async getProviderStatsSafe(userId: number): Promise<ProviderStatsDto | null> {
    const run = this.computeProviderStats(userId);
    return this.withTimeout(run, null, 'get_provider_stats');
  }

  private async computeProviderStats(
    userId: number,
  ): Promise<ProviderStatsDto | null> {
    const provider = await this.prisma.provider.findFirst({
      where: { userId },
      select: {
        id: true,
        averageRating: true,
        totalReviews: true,
        totalRecommendations: true,
      },
    });
    if (!provider) return null;

    const profileViews = await this.prisma.providerAnalytic.count({
      where: { providerId: provider.id, eventType: 'profile_view' },
    });

    return {
      averageRating: provider.averageRating,
      totalReviews: provider.totalReviews,
      totalRecommendations: provider.totalRecommendations,
      profileViews,
    };
  }

  // ── Util ────────────────────────────────────────────────────

  /**
   * Promise.race contra `TOOL_TIMEOUT_MS` (regla 4). Si la consulta excede
   * o lanza, loguea y devuelve `fallback` — la tool falla en suave, sin
   * romper el ciclo de function-calling ni la app.
   */
  private async withTimeout<T>(
    op: Promise<T>,
    fallback: T,
    label: string,
  ): Promise<T> {
    try {
      return await Promise.race([
        op,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`${label} timeout`)),
            TOOL_TIMEOUT_MS,
          ),
        ),
      ]);
    } catch (e) {
      this.logger.warn(
        `Tool ${label} falló/timeout: ${(e as Error)?.message ?? e}`,
      );
      return fallback;
    }
  }
}
