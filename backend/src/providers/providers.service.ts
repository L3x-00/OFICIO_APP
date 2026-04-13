import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma, AvailabilityStatus } from '../generated/client/client.js';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

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

    // Filtro por tipo de proveedor: el frontend envía PROFESSIONAL|BUSINESS
    // pero la BD almacena OFICIO|NEGOCIO en el campo `type`.
    if (type === 'PROFESSIONAL') {
      where.type = 'OFICIO';
    } else if (type === 'BUSINESS') {
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

    // Ordenamiento y umbral de calidad
    let orderBy: Prisma.ProviderOrderByWithRelationInput = { averageRating: 'desc' }; // default: mejor calificación
    if (sortBy === 'reviews') {
      // "Mejores reseñas": solo proveedores con ≥ 3.5 estrellas, ordenados de mayor a menor
      where.averageRating = { gte: 3.5 };
      orderBy = { averageRating: 'desc' };
    } else if (sortBy === 'availability') {
      orderBy = { availability: 'asc' };
    } else if (sortBy === 'rating') {
      orderBy = { averageRating: 'desc' };
    }

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
          locality:     { select: { name: true } },
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
  async getCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
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
  // backend/src/providers/providers.service.ts

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