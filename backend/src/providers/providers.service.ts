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
      // Muestra proveedores cuya categoría es hija de la macrocategoría dada
      where.category = { parent: { slug: parentCategorySlug } };
    } else if (categorySlug) {
      where.category = { slug: categorySlug };
    }
    if (availability) {
      where.availability = availability as AvailabilityStatus;
    }
    if (localityId) {
      where.localityId = localityId;
    }

    // Filtro de ubicación estructurado (jerarquía: departamento → provincia → distrito)
    // Si se pasa distrito, filtra con máxima precisión. Si solo provincia, filtra por ella.
    if (department || province || district) {
      const localityFilter: Prisma.LocalityWhereInput = {};
      if (department) localityFilter.department = { equals: department, mode: 'insensitive' };
      if (province)   localityFilter.province   = { equals: province,   mode: 'insensitive' };
      if (district)   localityFilter.district   = { equals: district,   mode: 'insensitive' };
      where.locality = localityFilter;
    }

    // Filtro por tipo de proveedor. Acepta tanto los nombres canónicos
    // (OFICIO|NEGOCIO) como los alias legacy que aún puede enviar Flutter.
    if (type === 'OFICIO' || type === 'PROFESSIONAL') {
      where.type = 'OFICIO';
    } else if (type === 'NEGOCIO' || type === 'BUSINESS') {
      where.type = 'NEGOCIO';
    }

    // Búsqueda por texto libre (nombre y descripción)
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { description:  { contains: search, mode: 'insensitive' } },
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
          category:     { select: { name: true, slug: true, iconUrl: true } },
          images:       { orderBy: { order: 'asc' } },
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
        category: { select: { name: true, slug: true } },
        images: { orderBy: { order: 'asc' } },
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
  async trackEvent(providerId: number, eventType: string, userId?: number) {
    return this.prisma.providerAnalytic.create({
      data: { providerId, eventType, userId },
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
          reason:      data.reason,
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
  // backend/src/providers/providers.service.ts

async getAnalyticsSummary(days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // 1. Obtenemos los eventos de la base de datos (clicks en whatsapp/llamadas)
  // Asumiendo que tienes una tabla 'ProviderEvent' o similar del Hito 4
  const events = await this.prisma.providerAnalytic.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        eventType: true,
        createdAt: true,
      },
    });

    // 2. Agrupamos los datos por día para la gráfica
    const dailyData: Record<string, { date: string; whatsapp: number; calls: number }> = {};
    
    // Inicializamos los días con 0 para que la gráfica no tenga huecos
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyData[dateStr] = { date: dateStr, whatsapp: 0, calls: 0 };
    }

    // Llenamos con datos reales
    events.forEach(event => {
      const dateStr = event.createdAt.toISOString().split('T')[0];
      if (dailyData[dateStr]) {
        if (event.eventType === 'WHATSAPP') dailyData[dateStr].whatsapp++;
        if (event.eventType === 'CALL') dailyData[dateStr].calls++;
      }
    });

    // Devolvemos el array ordenado por fecha
    return {
      dailyClicks: Object.values(dailyData as Record<string, { date: string; whatsapp: number; calls: number }>)
        .sort((a, b) => a.date.localeCompare(b.date))
    };
  }
}