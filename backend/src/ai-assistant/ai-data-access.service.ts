import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
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
/**
 * Tarjeta de proveedor devuelta por `search_providers`. El shape replica el
 * del catálogo público (`/providers`) para que el cliente Flutter lo consuma
 * con el MISMO `ProviderModel.fromJson` (cero parser nuevo) y renderice las
 * mismas tarjetas navegables.
 *
 * Privacidad: `phone`/`whatsapp` se enmascaran para planes NO pagos (regla
 * anti-burla del plan gratis) y el ORQUESTADOR los elimina de la copia que ve
 * el modelo — el modelo nunca recibe datos de contacto.
 */
export interface ProviderCardDto {
  id: number;
  slug: string | null;
  businessName: string;
  /** 'OFICIO' | 'NEGOCIO'. */
  type: string;
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  /** Estado de disponibilidad (enum como string). */
  availability: string;
  /** Vacío si el plan no es de pago (anti-burla). */
  phone: string;
  whatsapp: string | null;
  /** Distancia en km si la búsqueda fue geolocalizada; null si no. */
  distanceKm: number | null;
  images: Array<{ url: string; isCover: boolean }>;
  providerCategories: Array<{
    category: { name: string; slug: string | null };
  }>;
  locality: {
    department: string | null;
    province: string | null;
    district: string | null;
  } | null;
  subscription: { plan: string } | null;
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
  whatsappClicks: number;
  favorites: number;
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

// ── DTOs de las tools ADMIN (persona ADMIN) ─────────────────────

/** Métricas globales de plataforma para el panel admin. */
export interface PlatformStatsDto {
  /** Total de usuarios registrados (todos los roles). */
  totalUsers: number;
  /** Usuarios registrados hoy (desde medianoche). */
  newUsersToday: number;
  /** Registros de los últimos 7 días. */
  newUsersThisWeek: number;
  /** Registros de los 7 días anteriores (para comparar crecimiento). */
  newUsersLastWeek: number;
  /** Total de proveedores (todos los estados). */
  totalProviders: number;
  /** Proveedores aprobados (verificationStatus APROBADO). */
  approvedProviders: number;
  /** Proveedores en cola de verificación (verificationStatus PENDIENTE). */
  pendingProviders: number;
  /** Ingresos confirmados del mes en curso (suma de pagos, en PEN). */
  monthlyRevenue: number;
}

/** Proveedor destacado del ranking admin. */
export interface TopProviderDto {
  businessName: string;
  type: string;
  averageRating: number;
  totalReviews: number;
  /** Movimiento reciente: nº de eventos (vistas + clics de contacto). */
  movement: number;
}

/** Item de una cola de aprobación (proveedor o trust validation). */
export interface PendingApprovalItemDto {
  businessName: string;
  type: string;
  /** Fecha de ingreso a la cola (YYYY-MM-DD). */
  since: string;
}

/** Colas de aprobación pendientes para moderación admin. */
export interface PendingApprovalsDto {
  providers: PendingApprovalItemDto[];
  trustValidations: PendingApprovalItemDto[];
  totalProviders: number;
  totalTrustValidations: number;
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
   * Busca proveedores verificados filtrando por la UBICACIÓN configurada del
   * usuario (department/province/district) vía la relación `locality`. SIN
   * PostGIS: los usuarios prefieren buscar por su ciudad, no por GPS. Tope: 5
   * resultados con `select` estricto, ranking por plan + rating.
   */
  async searchProvidersSafe(
    category?: string,
    department?: string,
    province?: string,
    district?: string,
  ): Promise<ProviderCardDto[]> {
    const limit = Math.min(AiDataAccessService.MAX_RESULTS, 5);

    // Filtro por la relación locality — solo los campos efectivamente provistos.
    const locality: {
      department?: string;
      province?: string;
      district?: string;
    } = {};
    if (department && department.trim())
      locality.department = department.trim();
    if (province && province.trim()) locality.province = province.trim();
    if (district && district.trim()) locality.district = district.trim();

    const run = this.prisma.provider
      .findMany({
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
          ...(Object.keys(locality).length > 0 ? { locality } : {}),
        },
        select: {
          id: true,
          slug: true,
          businessName: true,
          type: true,
          averageRating: true,
          totalReviews: true,
          isVerified: true,
          availability: true,
          phone: true,
          whatsapp: true,
          images: {
            orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
            select: { url: true, isCover: true },
          },
          providerCategories: {
            select: { category: { select: { name: true, slug: true } } },
            orderBy: { isPrimary: 'desc' },
            take: 1,
          },
          locality: {
            select: { department: true, province: true, district: true },
          },
          subscription: { select: { plan: true } },
        },
        orderBy: [{ planPriority: 'asc' }, { averageRating: 'desc' }],
        take: limit,
      })
      .then((rows) =>
        rows.map((r): ProviderCardDto => {
          const plan = r.subscription?.plan ?? 'GRATIS';
          // Solo planes de pago exponen contacto directo (anti-burla).
          const paid = plan === 'PREMIUM' || plan === 'ESTANDAR';
          return {
            id: r.id,
            slug: r.slug,
            businessName: r.businessName,
            type: r.type,
            averageRating: r.averageRating,
            totalReviews: r.totalReviews,
            isVerified: r.isVerified,
            availability: r.availability,
            phone: paid ? (r.phone ?? '') : '',
            whatsapp: paid ? (r.whatsapp ?? null) : null,
            distanceKm: null,
            images: r.images.map((i) => ({ url: i.url, isCover: i.isCover })),
            providerCategories: r.providerCategories.map((pc) => ({
              category: { name: pc.category.name, slug: pc.category.slug },
            })),
            locality: r.locality
              ? {
                  department: r.locality.department,
                  province: r.locality.province,
                  district: r.locality.district,
                }
              : null,
            subscription: { plan },
          };
        }),
      );

    return this.withTimeout(run, [], 'search_providers');
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
      // Feature OCULTA (2026-07): tip de ofertas retirado — offer_posts
      // desactivado (FEATURE_OFERTAS). Restaurar al reactivar:
      // if (p.activeOffers === 0) {
      //   actions.push({
      //     label: 'Publica una oferta',
      //     hint: 'Las ofertas activas atraen más clientes a tu perfil.',
      //   });
      // }
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

    // Las métricas reales viven en ProviderAnalytic / Favorite, NO en Provider.
    // IMPORTANTE: las vistas se registran como eventType 'view' (ver
    // track-event.dto: enum ['whatsapp_click','call_click','view']) — 'profile_view'
    // NO se escribe nunca, por eso antes la IA reportaba 0.
    const [profileViews, whatsappClicks, favorites] = await Promise.all([
      this.prisma.providerAnalytic.count({
        where: { providerId: provider.id, eventType: 'view' },
      }),
      this.prisma.providerAnalytic.count({
        where: { providerId: provider.id, eventType: 'whatsapp_click' },
      }),
      this.prisma.favorite.count({ where: { providerId: provider.id } }),
    ]);

    return {
      averageRating: provider.averageRating,
      totalReviews: provider.totalReviews,
      totalRecommendations: provider.totalRecommendations,
      profileViews,
      whatsappClicks,
      favorites,
    };
  }

  // ── Util ────────────────────────────────────────────────────

  /**
   * Promise.race contra `TOOL_TIMEOUT_MS` (regla 4). Si la consulta excede
   * o lanza, loguea y devuelve `fallback` — la tool falla en suave, sin
   * romper el ciclo de function-calling ni la app.
   */
  // ── Tools ADMIN (persona ADMIN) ─────────────────────────────
  // Consultas agregadas de plataforma. Solo se ofrecen a la persona ADMIN
  // (allowlist del tool-registry) → un no-admin no puede invocarlas. Todas
  // corren con timeout y fallback vacío como el resto.

  /**
   * KPIs globales: usuarios nuevos de hoy, proveedores pendientes de
   * verificación e ingresos confirmados del mes en curso (PEN).
   */
  async getPlatformStatsSafe(): Promise<PlatformStatsDto> {
    const fallback: PlatformStatsDto = {
      totalUsers: 0,
      newUsersToday: 0,
      newUsersThisWeek: 0,
      newUsersLastWeek: 0,
      totalProviders: 0,
      approvedProviders: 0,
      pendingProviders: 0,
      monthlyRevenue: 0,
    };

    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const d = new Date();
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);

    const run = (async (): Promise<PlatformStatsDto> => {
      const [
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersLastWeek,
        totalProviders,
        approvedProviders,
        pendingProviders,
        revenue,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
        this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
        this.prisma.user.count({
          where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
        }),
        this.prisma.provider.count(),
        this.prisma.provider.count({
          where: { verificationStatus: 'APROBADO' },
        }),
        this.prisma.provider.count({
          where: { verificationStatus: 'PENDIENTE' },
        }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { confirmedAt: { gte: startOfMonth } },
        }),
      ]);
      return {
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersLastWeek,
        totalProviders,
        approvedProviders,
        pendingProviders,
        monthlyRevenue: revenue._sum.amount ?? 0,
      };
    })();

    return this.withTimeout(run, fallback, 'get_platform_stats');
  }

  /**
   * Ranking de proveedores con más MOVIMIENTO reciente: cantidad de eventos
   * (vistas + clics de WhatsApp/llamada) en `provider_analytics`. Si no hay
   * analítica registrada, cae a un ranking por mejor rating.
   */
  async getTopProvidersSafe(): Promise<TopProviderDto[]> {
    const limit = AiDataAccessService.MAX_RESULTS;

    const run = (async (): Promise<TopProviderDto[]> => {
      const top = await this.prisma.providerAnalytic.groupBy({
        by: ['providerId'],
        _count: { id: true },
        where: {
          eventType: { in: ['view', 'whatsapp_click', 'call_click'] },
        },
        orderBy: { _count: { id: 'desc' } },
        take: limit,
      });

      // Sin movimiento registrado → fallback a mejor rating (movement = 0).
      if (top.length === 0) {
        const byRating = await this.prisma.provider.findMany({
          where: { isVisible: true, verificationStatus: 'APROBADO' },
          select: {
            businessName: true,
            type: true,
            averageRating: true,
            totalReviews: true,
          },
          orderBy: [{ averageRating: 'desc' }, { totalReviews: 'desc' }],
          take: limit,
        });
        return byRating.map((r) => ({
          businessName: r.businessName,
          type: r.type as string,
          averageRating: r.averageRating,
          totalReviews: r.totalReviews,
          movement: 0,
        }));
      }

      const ids = top.map((t) => t.providerId);
      const providers = await this.prisma.provider.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          businessName: true,
          type: true,
          averageRating: true,
          totalReviews: true,
        },
      });
      const byId = new Map(providers.map((p) => [p.id, p]));

      // Conserva el orden del ranking (por movimiento desc).
      return top.flatMap((t) => {
        const p = byId.get(t.providerId);
        if (!p) return [];
        return [
          {
            businessName: p.businessName,
            type: p.type as string,
            averageRating: p.averageRating,
            totalReviews: p.totalReviews,
            movement: t._count.id,
          },
        ];
      });
    })();

    return this.withTimeout(run, [], 'get_top_providers');
  }

  /**
   * Colas de aprobación: proveedores PENDIENTE de verificación + solicitudes
   * de validación de confianza PENDING, con sus totales.
   */
  async getPendingApprovalsSafe(): Promise<PendingApprovalsDto> {
    const fallback: PendingApprovalsDto = {
      providers: [],
      trustValidations: [],
      totalProviders: 0,
      totalTrustValidations: 0,
    };
    const limit = AiDataAccessService.MAX_RESULTS;
    const ymd = (d: Date) => d.toISOString().slice(0, 10);

    const run = (async (): Promise<PendingApprovalsDto> => {
      const [providers, totalProviders, trust, totalTrust] = await Promise.all([
        this.prisma.provider.findMany({
          where: { verificationStatus: 'PENDIENTE' },
          select: { businessName: true, type: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: limit,
        }),
        this.prisma.provider.count({
          where: { verificationStatus: 'PENDIENTE' },
        }),
        this.prisma.trustValidationRequest.findMany({
          where: { status: 'PENDING' },
          select: {
            createdAt: true,
            provider: { select: { businessName: true, type: true } },
          },
          orderBy: { createdAt: 'asc' },
          take: limit,
        }),
        this.prisma.trustValidationRequest.count({
          where: { status: 'PENDING' },
        }),
      ]);

      return {
        providers: providers.map((p) => ({
          businessName: p.businessName,
          type: p.type as string,
          since: ymd(p.createdAt),
        })),
        trustValidations: trust.map((t) => ({
          businessName: t.provider.businessName,
          type: t.provider.type as string,
          since: ymd(t.createdAt),
        })),
        totalProviders,
        totalTrustValidations: totalTrust,
      };
    })();

    return this.withTimeout(run, fallback, 'get_pending_approvals');
  }

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
