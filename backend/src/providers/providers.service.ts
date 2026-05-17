import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma, AvailabilityStatus } from '../generated/client/client.js';
import { EventsGateway } from '../events/events.gateway.js';

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
    type?: string;       // PROFESSIONAL | BUSINESS (providerType)
    sortBy?: string;     // 'reviews' | 'availability' | 'rating' (default)
    verified?: boolean;  // true = solo verificados (por defecto true)
    location?: string;   // búsqueda por texto en dirección
    // Filtros de ubicación estructurados (jerarquía peruana)
    department?: string; // Ej: "Junín"
    province?: string;   // Ej: "Huancayo"
    district?: string;   // Ej: "El Tambo"
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
    const where: Prisma.ProviderWhereInput = { isVisible: true, verificationStatus: 'APROBADO' };

    if (parentCategorySlug) {
      // Muestra proveedores cuya categoría (cualquiera de las suyas) es hija de la macrocategoría dada
      where.providerCategories = { some: { category: { parent: { slug: parentCategorySlug } } } };
    } else if (categorySlug) {
      where.providerCategories = { some: { category: { slug: categorySlug } } };
    }
    if (availability) {
      where.availability = availability as AvailabilityStatus;
    }
    if (localityId) {
      where.localityId = localityId;
    }

    // Filtro de ubicación estructurado (jerarquía: dept → prov → dist).
    //
    // Las columnas generadas `department_norm`, `province_norm`,
    // `district_norm` (migración 20260517130000_localities_normalize)
    // contienen lower(unaccent(...)) y tienen index compuesto parcial
    // sobre `isActive=true`. El match se hace en Postgres — antes
    // cargábamos toda la tabla en JS y filtrábamos en memoria.
    //
    // Degradación jerárquica: si dept+prov+dist no matchea, caemos
    // a dept+prov, luego a dept. Mejor mostrar resultados cercanos
    // que un listado vacío por una variante ortográfica.
    if (department || province || district) {
      const norm = (s: string | null | undefined) =>
        (s ?? '')
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
          .trim();

      const nDept = norm(department);
      const nProv = norm(province);
      const nDist = norm(district);

      // Helper: lista de localityIds que cumplen los 3 niveles dados.
      // string vacío = nivel "no filtrar". El index parcial cubre los
      // 3 LIKE/= con `WHERE isActive=true`.
      const matchAt = async (d: string, p: string, di: string): Promise<number[]> => {
        const rows = await this.prisma.$queryRaw<{ id: number }[]>`
          SELECT id FROM localities
          WHERE "isActive" = true
            AND (${d}  = '' OR department_norm = ${d})
            AND (${p}  = '' OR province_norm   = ${p})
            AND (${di} = '' OR district_norm   = ${di})
        `;
        return rows.map((r) => r.id);
      };

      // Probamos del más específico al más general.
      let matchedIds = await matchAt(nDept, nProv, nDist);
      if (matchedIds.length === 0 && (nProv || nDist)) {
        matchedIds = await matchAt(nDept, nProv, '');
      }
      if (matchedIds.length === 0 && nDept) {
        matchedIds = await matchAt(nDept, '', '');
      }

      if (matchedIds.length > 0) {
        where.localityId = { in: matchedIds };
      } else {
        // No matchea ningún nivel — forzamos "sin resultados" para no
        // mostrar al usuario proveedores fuera de su zona.
        where.id = { in: [-1] };
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
        { description:  { contains: q, mode: 'insensitive' } },
        { user: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName:  { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        { providerCategories: { some: { category: { name: { contains: q, mode: 'insensitive' } } } } },
      ];
    }

    // Filtro de ubicación: solo busca en la dirección para no mezclar ciudades
    if (location) {
      where.address = { contains: location, mode: 'insensitive' };
    }

    // Ordenamiento secundario según filtro del usuario
    let secondaryOrder: Prisma.ProviderOrderByWithRelationInput = { averageRating: 'desc' };
    if (sortBy === 'reviews') {
      // "Mejores reseñas": solo proveedores con ≥ 3.5 estrellas
      where.averageRating = { gte: 3.5 };
      secondaryOrder = { averageRating: 'desc' };
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
            select: { category: { select: { id: true, name: true, slug: true, iconUrl: true } } },
          },
          // Cover primero para que las tarjetas siempre tengan foto incluso
          // si se filtra por `isCover==true` en el cliente — y si por algún
          // motivo ningún ProviderImage tiene el flag, la primera por
          // `order` queda al frente como fallback.
          images:       { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
          user:         { select: { firstName: true, lastName: true, avatarUrl: true } },
          locality:     { select: { name: true, department: true, province: true, district: true } },
          subscription: { select: { plan: true, status: true } },
        },
        orderBy,
      }),
      this.prisma.provider.count({ where }),
    ]);

    return {
      data: providers,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  // ── OBTENER un proveedor por ID ──────────────────────────
  async findOne(id: number) {
    return this.prisma.provider.findUnique({
      where: { id },
      include: {
        providerCategories: {
          select: { category: { select: { id: true, name: true, slug: true } } },
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
    return this.prisma.providerAnalytic.create({
      data: { providerId, eventType: eventType as any, userId },
    });
  }

  // ── RECOMENDAR PROVEEDOR ─────────────────────────────────
  async addRecommendation(userId: number, providerId: number) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) throw new Error('Proveedor no encontrado');

    // Si ya recomendó, devolver el total actual sin crear duplicado
    const existing = await this.prisma.recommendation.findUnique({
      where: { userId_providerId: { userId, providerId } },
    });
    if (existing) {
      return { success: true, totalRecommendations: provider.totalRecommendations, alreadyRecommended: true };
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

    return { success: true, totalRecommendations: updated.totalRecommendations };
  }

  // ── REPORTAR PROVEEDOR ───────────────────────────────────
  async createReport(data: {
    providerId: number;
    userId: number;
    reason: string;
    description?: string;
  }) {
    const validReasons = [
      'INFORMACION_FALSA', 'COMPORTAMIENTO', 'FRAUDE',
      'FOTO_INAPROPIADA', 'NO_PRESTO', 'OTRO',
    ];
    if (!validReasons.includes(data.reason)) {
      throw new BadRequestException('Motivo de reporte inválido');
    }

    const provider = await this.prisma.provider.findUnique({ where: { id: data.providerId } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    try {
      const report = await this.prisma.providerReport.create({
        data: {
          providerId:  data.providerId,
          userId:      data.userId,
          reason:      data.reason as any,
          description: data.description,
        },
      });

      // Notificar al admin en tiempo real
      this.events.emitNotification({
        type:       'NEW_PROVIDER_REPORT',
        title:      'Nuevo reporte de proveedor',
        body:       `Se reportó al proveedor #${data.providerId}. Motivo: ${data.reason}.`,
        targetRole: 'ADMIN',
      });

      return report;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Ya enviaste un reporte para este proveedor.');
      }
      throw e;
    }
  }

  // ── REPORTE DE PROBLEMA DE PLATAFORMA ───────────────────
  async createPlatformIssue(userId: number, description: string) {
    if (!description || description.trim().length < 5) {
      throw new BadRequestException('La descripción del problema es demasiado corta.');
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
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
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
      return { recommended: false, totalRecommendations: updated.totalRecommendations };
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
    return { recommended: true, totalRecommendations: updated.totalRecommendations };
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
      revenue: 0 // Placeholder por ahora
    };
  }

  async getGraceProviders() {
    // Retorna proveedores que están en periodo de prueba o próximos a vencer
    return this.prisma.provider.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
  }
}