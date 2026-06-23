import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma, AvailabilityStatus } from '../generated/client/client.js';
import { EventsGateway } from '../events/events.gateway.js';
import { MinioService } from '../common/minio.service.js';
import { effectiveFeaturesFromCategories } from '../common/provider-features.service.js';

@Injectable()
export class ProvidersService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  // ── LISTAR proveedores con filtros opcionales ────────────
  async findAll(filters: {
    categorySlug?: string;
    parentCategorySlug?: string; // filtra por macrocategoría (incluye subcategorías)
    availability?: string;
    search?: string;
    localityId?: number;
    // Nuevos filtros
    type?: string; // PROFESSIONAL | BUSINESS (providerType)
    sortBy?: string; // 'reviews' | 'availability' | 'rating' (default)
    verified?: boolean; // true = solo verificados (por defecto true)
    location?: string; // búsqueda por texto en dirección
    // Filtros de ubicación estructurados (jerarquía peruana)
    department?: string; // Ej: "Junín"
    province?: string; // Ej: "Huancayo"
    district?: string; // Ej: "El Tambo"
    lat?: number;
    lng?: number;
    page?: number;
    limit?: number;
  }) {
    const {
      categorySlug,
      parentCategorySlug,
      availability,
      search,
      localityId,
      type,
      sortBy,
      verified = true,
      location,
      department,
      province,
      district,
      page = 1,
      limit = 20,
    } = filters;

    // Solo proveedores visibles y aprobados por el admin
    const where: Prisma.ProviderWhereInput = {
      isVisible: true,
      verificationStatus: 'APROBADO',
    };

    if (parentCategorySlug) {
      // Muestra proveedores cuya categoría (cualquiera de las suyas) es hija de la macrocategoría dada
      where.providerCategories = {
        some: { category: { parent: { slug: parentCategorySlug } } },
      };
    } else if (categorySlug) {
      where.providerCategories = { some: { category: { slug: categorySlug } } };
    }
    if (availability) {
      where.availability = availability as AvailabilityStatus;
    }
    if (localityId) {
      where.localityId = localityId;
    }

    // Filtro de ubicación estructurado (jerarquía: dept -> prov -> dist).
    //
    // Match accent/case-insensitive en JS contra el catálogo `localities`.
    //
    // Degradación jerárquica: si dept+prov+dist no matchea, caemos
    // a dept+prov, luego a dept. Mejor mostrar resultados cercanos
    // que un listado vacío por una variante ortográfica.
    if (department || province || district) {
      const norm = (s: string | null | undefined) =>
        (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

      const nDept = norm(department);
      const nProv = norm(province);
      const nDist = norm(district);

      // Match accent/case-insensitive en JS sobre el catálogo de
      // localidades. No depende de columnas generadas (`*_norm`) ni de
      // extensiones SQL — el catálogo peruano es pequeño y esto es
      // 100% determinista sin importar cómo se aplicó la migración.
      const localities = await this.prisma.locality.findMany({
        where: { isActive: true },
        select: { id: true, department: true, province: true, district: true },
      });

      // Helper: localityIds que cumplen los 3 niveles dados.
      // string vacío = nivel "no filtrar".
      const matchAt = (d: string, p: string, di: string): number[] =>
        localities
          .filter(
            (l) =>
              (d === '' || norm(l.department) === d) &&
              (p === '' || norm(l.province) === p) &&
              (di === '' || norm(l.district) === di),
          )
          .map((l) => l.id);

      // "Solo departamento" (sin provincia ni distrito) = búsqueda
      // ampliada: los NEGOCIO se acotan al departamento (un negocio
      // lejano no le sirve al cliente), pero los OFICIO se muestran de
      // todo el Perú (un profesional sí puede desplazarse / atender a
      // distancia, o el cliente lo busca por nombre).
      const onlyDepartment = !!nDept && !nProv && !nDist;
      const wantsOficio = type === 'OFICIO' || type === 'PROFESSIONAL';
      const wantsNegocio = type === 'NEGOCIO' || type === 'BUSINESS';

      if (onlyDepartment) {
        const deptIds = matchAt(nDept, '', '');
        const inDept = deptIds.length > 0 ? deptIds : [-1];
        if (wantsOficio) {
          // Solo profesionales — sin filtro de ubicación (todo el Perú).
        } else if (wantsNegocio) {
          where.localityId = { in: inDept };
        } else {
          // Todos: OFICIO de cualquier zona + NEGOCIO del departamento.
          where.AND = [
            {
              OR: [
                { type: 'OFICIO' },
                { type: 'NEGOCIO', localityId: { in: inDept } },
              ],
            },
          ];
        }
      } else {
        // Filtro normal con degradación jerárquica:
        // dept+prov+dist → dept+prov → dept.
        let matchedIds = matchAt(nDept, nProv, nDist);
        if (matchedIds.length === 0 && (nProv || nDist)) {
          matchedIds = matchAt(nDept, nProv, '');
        }
        if (matchedIds.length === 0 && nDept) {
          matchedIds = matchAt(nDept, '', '');
        }

        if (matchedIds.length > 0) {
          where.localityId = { in: matchedIds };
        } else {
          // No matchea ningún nivel — forzamos "sin resultados" para no
          // mostrar al usuario proveedores fuera de su zona.
          where.id = { in: [-1] };
        }
      }
    }

    // Filtro por tipo de proveedor. Acepta tanto los nombres canónicos
    // (OFICIO|NEGOCIO) como los alias legacy que aún puede enviar Flutter.
    if (type === 'OFICIO' || type === 'PROFESSIONAL') {
      where.type = 'OFICIO';
    } else if (type === 'NEGOCIO' || type === 'BUSINESS') {
      where.type = 'NEGOCIO';
    }

    // Búsqueda por texto libre. OR sobre múltiples campos para que la
    // búsqueda en tiempo real sea robusta — el usuario puede tipear el
    // nombre del negocio, el del profesional o el de la categoría y
    // obtener resultados igualmente.
    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { businessName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        {
          providerCategories: {
            some: { category: { name: { contains: q, mode: 'insensitive' } } },
          },
        },
      ];
    }

    // Filtro de ubicación: solo busca en la dirección para no mezclar ciudades
    if (location) {
      where.address = { contains: location, mode: 'insensitive' };
    }

    // Ordenamiento secundario según filtro del usuario
    let secondaryOrder: Prisma.ProviderOrderByWithRelationInput = {
      averageRating: 'desc',
    };
    if (sortBy === 'reviews') {
      // "Más reseñas": ordena por CANTIDAD de reseñas (totalReviews), no por
      // calificación. Antes filtraba averageRating ≥ 3.5 + ordenaba por
      // averageRating, así que ignoraba el criterio de cantidad y recortaba
      // resultados. Ahora muestra TODOS ordenados por número de reseñas.
      secondaryOrder = { totalReviews: 'desc' };
    } else if (sortBy === 'availability') {
      secondaryOrder = { availability: 'asc' };
    } else if (sortBy === 'rating') {
      secondaryOrder = { averageRating: 'desc' };
    }

    // planPriority SIEMPRE primero: los planes de pago activos aparecen antes
    // que GRATIS/GRACIA, sin importar reseñas ni disponibilidad.
    const orderBy: Prisma.ProviderOrderByWithRelationInput[] = [
      { planPriority: 'asc' },
      secondaryOrder,
    ];

    const skip = (page - 1) * limit;

    const [providers, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: limit,
        include: {
          providerCategories: {
            select: {
              isPrimary: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  iconUrl: true,
                  features: true,
                  parent: { select: { features: true } },
                },
              },
            },
            orderBy: { isPrimary: 'desc' },
          },
          // Cover primero para que las tarjetas siempre tengan foto incluso
          // si se filtra por `isCover==true` en el cliente — y si por algún
          // motivo ningún ProviderImage tiene el flag, la primera por
          // `order` queda al frente como fallback.
          images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
          user: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
          locality: {
            select: {
              name: true,
              department: true,
              province: true,
              district: true,
            },
          },
          subscription: { select: { plan: true, status: true } },
        },
        orderBy,
      }),
      this.prisma.provider.count({ where }),
    ]);

    return {
      data: providers.map((p) => {
        const base = this._thumbImages(this.maskContactIfFree(p));
        // `features` efectivos para el badge de la tarjeta del listado.
        return {
          ...base,
          features: effectiveFeaturesFromCategories(p.providerCategories),
        };
      }),
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  /**
   * Oculta los datos de contacto directo (teléfono, whatsapp, redes
   * sociales) de los proveedores cuyo plan NO es de pago. Así un cliente
   * no puede contactarlos sin que el proveedor pague — anti-burla del
   * plan gratis. El proveedor SÍ ve sus propios datos en su panel
   * (endpoint /provider-profile/me, que no pasa por aquí).
   */

  /// LISTADOS: cambia las URLs de imágenes por su thumbnail del CDN (más
  /// liviano). No-op si la URL no es del CDN público (legacy/firmada). Se usa
  /// SOLO en listas; el detalle (findOne, perfil público) sirve alta calidad.
  private _thumbImages(p: any): any {
    if (!p || !Array.isArray(p.images)) return p;
    return {
      ...p,
      images: p.images.map((img: any) =>
        img?.url ? { ...img, url: MinioService.publicThumbUrl(img.url) } : img,
      ),
    };
  }

  private maskContactIfFree(p: any): any {
    if (!p) return p;
    const plan = p.subscription?.plan;
    if (plan === 'ESTANDAR' || plan === 'PREMIUM') return p;
    // Plan GRATIS (o sin suscripción vigente): además de enmascarar el
    // contacto, limitamos las fotos VISIBLES a 2 en lectura. Las imágenes
    // ya vienen ordenadas (isCover desc, order asc), así que slice(0,2)
    // conserva la portada. No se borra nada en BD.
    return {
      ...p,
      images: Array.isArray(p.images) ? p.images.slice(0, 2) : p.images,
      phone: '',
      whatsapp: null,
      website: null,
      instagram: null,
      tiktok: null,
      facebook: null,
      linkedin: null,
      twitterX: null,
      telegram: null,
      whatsappBiz: null,
    };
  }

  // ── HOME AGRUPADA (carruseles por categoría padre) ───────
  /**
   * Devuelve las top categorías PADRE con más proveedores aprobados/visibles
   * y, dentro de cada una, los primeros proveedores ordenados por prioridad de
   * plan (PREMIUM > ESTANDAR > GRATIS). Alimenta los carruseles del home móvil
   * sin tocar la paginación de `findAll`.
   */
  async getFeaturedGrouped(opts?: { province?: string; department?: string }) {
    const { province, department } = opts ?? {};

    // Filtro por localidad (mirrors lógica de findAll, nivel provincia).
    let localityIds: number[] | null = null;
    if (province || department) {
      const norm = (s: string | null | undefined) =>
        (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
      const nDept = norm(department);
      const nProv = norm(province);
      const localities = await this.prisma.locality.findMany({
        where: { isActive: true },
        select: { id: true, department: true, province: true },
      });
      const matchAt = (d: string, p: string): number[] =>
        localities
          .filter(
            (l) =>
              (d === '' || norm(l.department) === d) &&
              (p === '' || norm(l.province) === p),
          )
          .map((l) => l.id);
      let ids = matchAt(nDept, nProv);
      if (ids.length === 0 && nDept) ids = matchAt(nDept, '');
      localityIds = ids.length > 0 ? ids : null;
    }

    const VISIBLE_APPROVED = {
      isVisible: true,
      verificationStatus: 'APROBADO' as const,
      ...(localityIds ? { localityId: { in: localityIds } } : {}),
    };

    // 1. Conteo de proveedores aprobados/visibles por categoría (hoja).
    const counts = await this.prisma.providerCategory.groupBy({
      by: ['categoryId'],
      where: { provider: VISIBLE_APPROVED },
      _count: { providerId: true },
    });
    const countByCat = new Map<number, number>();
    for (const c of counts) countByCat.set(c.categoryId, c._count.providerId);

    // 2. Categorías padre + sus hijas (para mapear los conteos al padre).
    const parents = await this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        iconUrl: true,
        children: { where: { isActive: true }, select: { id: true } },
      },
    });

    // 3. Total de proveedores por padre (suma de sus categorías) → ranking.
    const ranked = parents
      .map((p) => {
        const catIds = [p.id, ...p.children.map((c) => c.id)];
        const total = catIds.reduce(
          (sum, id) => sum + (countByCat.get(id) ?? 0),
          0,
        );
        return { parent: p, catIds, total };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);

    // 4. Para cada padre top, los primeros 8 proveedores por prioridad de plan.
    const groups = await Promise.all(
      ranked.map(async (r) => {
        const providers = await this.prisma.provider.findMany({
          where: {
            ...VISIBLE_APPROVED,
            providerCategories: { some: { categoryId: { in: r.catIds } } },
          },
          include: {
            providerCategories: {
              select: {
                isPrimary: true,
                category: {
                  select: { id: true, name: true, slug: true, iconUrl: true },
                },
              },
              orderBy: { isPrimary: 'desc' },
            },
            images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
            user: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
            locality: {
              select: {
                name: true,
                department: true,
                province: true,
                district: true,
              },
            },
            subscription: { select: { plan: true, status: true } },
          },
          orderBy: [{ planPriority: 'asc' }, { averageRating: 'desc' }],
          take: 8,
        });
        return {
          category: {
            id: r.parent.id,
            name: r.parent.name,
            slug: r.parent.slug,
            iconUrl: r.parent.iconUrl,
          },
          providers: providers.map((p) =>
            this._thumbImages(this.maskContactIfFree(p)),
          ),
        };
      }),
    );

    return groups;
  }

  // ── BÚSQUEDA GEOESPACIAL POR RADIO (PostGIS) ─────────────
  /**
   * Proveedores aprobados/visibles dentro de `radiusKm` de (lat,lng), con la
   * distancia exacta (`distanceKm`). Usa `ST_DWithin` sobre `location_geog`
   * (geography), que aprovecha el índice GIST `providers_location_geog_gist`
   * (sin full scan). `radiusKm` se acota a [1, 50].
   */
  async getNearby(latitude: number, longitude: number, radiusKm: number) {
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new BadRequestException('Coordenadas inválidas');
    }
    const km = Math.min(50, Math.max(1, Number(radiusKm) || 1));
    const radiusM = km * 1000;

    // 1. IDs + distancia (metros) ordenados por cercanía. ST_DWithin(geography)
    //    usa el índice GIST; ST_MakePoint recibe (lng, lat).
    const rows = await this.prisma.$queryRaw<
      Array<{ id: number; dist_m: number }>
    >`
      SELECT id, ST_Distance(location_geog, ST_MakePoint(${longitude}, ${latitude})::geography) AS dist_m
      FROM providers
      WHERE "isVisible" = true
        AND "verificationStatus" = 'APROBADO'
        AND location_geog IS NOT NULL
        AND ST_DWithin(location_geog, ST_MakePoint(${longitude}, ${latitude})::geography, ${radiusM})
      ORDER BY dist_m ASC
      LIMIT 50
    `;
    if (rows.length === 0) return [];

    const distByIdKm = new Map<number, number>();
    for (const r of rows) {
      distByIdKm.set(
        Number(r.id),
        Math.round((Number(r.dist_m) / 1000) * 10) / 10,
      );
    }
    const ids = rows.map((r) => Number(r.id));

    // 2. Hidratamos el shape de tarjeta completo para esos ids.
    const providers = await this.prisma.provider.findMany({
      where: { id: { in: ids } },
      include: {
        providerCategories: {
          select: {
            isPrimary: true,
            category: {
              select: { id: true, name: true, slug: true, iconUrl: true },
            },
          },
          orderBy: { isPrimary: 'desc' },
        },
        images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        locality: {
          select: {
            name: true,
            department: true,
            province: true,
            district: true,
          },
        },
        subscription: { select: { plan: true, status: true } },
      },
    });

    // 3. Re-ordenamos por cercanía (el orden del raw) + adjuntamos distanceKm.
    const byId = new Map(providers.map((p) => [p.id, p]));
    return ids
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map((p) => ({
        ...this._thumbImages(this.maskContactIfFree(p)),
        distanceKm: distByIdKm.get(p.id) ?? null,
      }));
  }

  // ── OBTENER un proveedor por ID ──────────────────────────
  async findOne(id: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        providerCategories: {
          select: {
            isPrimary: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                iconUrl: true,
                features: true,
                parent: { select: { features: true } },
              },
            },
          },
          orderBy: { isPrimary: 'desc' },
        },
        images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        locality: { select: { name: true, department: true } },
        reviews: {
          where: { isVisible: true },
          include: {
            user: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        subscription: {
          select: { plan: true, status: true, endDate: true },
        },
      },
    });
    const masked = this.maskContactIfFree(provider);
    if (masked && provider) {
      // `features` efectivos (propios o heredados del padre) para que el
      // cliente sepa qué módulos ofrece el proveedor (carta/catálogo/agenda…).
      (masked as { features?: string[] }).features =
        effectiveFeaturesFromCategories(provider.providerCategories);
    }
    return masked;
  }

  // ── LISTAR CATEGORÍAS ────────────────────────────────────
  async getCategories(forType?: string) {
    return this.prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null,
        ...(forType ? { forType } : {}),
      },
      include: {
        children: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true, iconUrl: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── REGISTRAR ANALYTIC (click WhatsApp, llamada) ─────────
  // `eventType` se valida via DTO con @IsEnum contra los valores
  // permitidos de AnalyticEvent — el cast a `any` aquí solo
  // satisface al type checker porque Prisma ahora exige el enum.
  async trackEvent(providerId: number, eventType: string, userId?: number) {
    const created = await this.prisma.providerAnalytic.create({
      data: { providerId, eventType: eventType as any, userId },
    });

    // FASE 4 #3: avisa al dueño del provider en tiempo real para que sus
    // contadores (WhatsApp/Llamadas/Vistas) suban sin recargar. Best-effort:
    // resolver el dueño no debe romper el tracking si falla.
    try {
      const owner = await this.prisma.provider.findUnique({
        where: { id: providerId },
        select: { userId: true, type: true },
      });
      if (owner?.userId) {
        this.events.emitProviderAnalytics(owner.userId, {
          providerId,
          eventType,
          providerType: owner.type,
        });
      }
    } catch {
      /* el evento ya quedó registrado en BD */
    }

    return created;
  }

  // ── RECOMENDAR PROVEEDOR ─────────────────────────────────
  async addRecommendation(userId: number, providerId: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });
    if (!provider) throw new Error('Proveedor no encontrado');

    // Si ya recomendó, devolver el total actual sin crear duplicado
    const existing = await this.prisma.recommendation.findUnique({
      where: { userId_providerId: { userId, providerId } },
    });
    if (existing) {
      return {
        success: true,
        totalRecommendations: provider.totalRecommendations,
        alreadyRecommended: true,
      };
    }

    // Crear recomendación e incrementar contador atómicamente
    const [, updated] = await this.prisma.$transaction([
      this.prisma.recommendation.create({ data: { userId, providerId } }),
      this.prisma.provider.update({
        where: { id: providerId },
        data: { totalRecommendations: { increment: 1 } },
        select: { totalRecommendations: true },
      }),
    ]);

    return {
      success: true,
      totalRecommendations: updated.totalRecommendations,
    };
  }

  // ── REPORTAR PROVEEDOR ───────────────────────────────────
  async createReport(data: {
    providerId: number;
    userId: number;
    reason: string;
    description?: string;
  }) {
    const validReasons = [
      'INFORMACION_FALSA',
      'COMPORTAMIENTO',
      'FRAUDE',
      'FOTO_INAPROPIADA',
      'NO_PRESTO',
      'OTRO',
    ];
    if (!validReasons.includes(data.reason)) {
      throw new BadRequestException('Motivo de reporte inválido');
    }

    const provider = await this.prisma.provider.findUnique({
      where: { id: data.providerId },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    try {
      const report = await this.prisma.providerReport.create({
        data: {
          providerId: data.providerId,
          userId: data.userId,
          reason: data.reason as any,
          description: data.description,
        },
      });

      // Notificar al admin en tiempo real
      this.events.emitNotification({
        type: 'NEW_PROVIDER_REPORT',
        title: 'Nuevo reporte de proveedor',
        body: `Se reportó al proveedor #${data.providerId}. Motivo: ${data.reason}.`,
        targetRole: 'ADMIN',
      });

      return report;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'Ya enviaste un reporte para este proveedor.',
        );
      }
      throw e;
    }
  }

  // ── REPORTE DE PROBLEMA DE PLATAFORMA ───────────────────
  async createPlatformIssue(userId: number, description: string) {
    if (!description || description.trim().length < 5) {
      throw new BadRequestException(
        'La descripción del problema es demasiado corta.',
      );
    }
    return this.prisma.platformIssue.create({
      data: { userId, description: description.trim() },
    });
  }

  // ── ESTADO DE RECOMENDACIÓN ──────────────────────────────
  async getRecommendationStatus(userId: number, providerId: number) {
    const existing = await this.prisma.recommendation.findUnique({
      where: { userId_providerId: { userId, providerId } },
    });
    return { recommended: !!existing };
  }

  // ── TOGGLE RECOMENDACIÓN (añadir o quitar) ───────────────
  async toggleRecommendation(userId: number, providerId: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });
    if (!provider) throw new Error('Proveedor no encontrado');

    const existing = await this.prisma.recommendation.findUnique({
      where: { userId_providerId: { userId, providerId } },
    });

    if (existing) {
      // Quitar recomendación
      const [, updated] = await this.prisma.$transaction([
        this.prisma.recommendation.delete({
          where: { userId_providerId: { userId, providerId } },
        }),
        this.prisma.provider.update({
          where: { id: providerId },
          data: { totalRecommendations: { decrement: 1 } },
          select: { totalRecommendations: true },
        }),
      ]);
      return {
        recommended: false,
        totalRecommendations: updated.totalRecommendations,
      };
    }

    // Añadir recomendación
    const [, updated] = await this.prisma.$transaction([
      this.prisma.recommendation.create({ data: { userId, providerId } }),
      this.prisma.provider.update({
        where: { id: providerId },
        data: { totalRecommendations: { increment: 1 } },
        select: { totalRecommendations: true },
      }),
    ]);
    return {
      recommended: true,
      totalRecommendations: updated.totalRecommendations,
    };
  }

  async getAdminMetrics() {
    const [totalProviders, totalUsers, totalReviews] = await Promise.all([
      this.prisma.provider.count(),
      this.prisma.user.count({ where: { role: 'USUARIO' } }),
      this.prisma.review.count(),
    ]);

    // Esto es lo que espera tu frontend para el Dashboard
    return {
      totalProviders,
      totalUsers,
      totalReviews,
      activeServices: totalProviders, // Puedes ajustar la lógica después
      revenue: 0, // Placeholder por ahora
    };
  }

  async getGraceProviders() {
    // Retorna proveedores que están en periodo de prueba o próximos a vencer
    return this.prisma.provider.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
  }
}
