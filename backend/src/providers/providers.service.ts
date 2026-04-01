import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  // ── LISTAR proveedores con filtros opcionales ────────────
  async findAll(filters: {
    categorySlug?: string;
    availability?: string;
    onlyVerified?: boolean;
    search?: string;
    localityId?: number;
    lat?: number;
    lng?: number;
    page?: number;
    limit?: number;
  }) {
    const {
      categorySlug,
      availability,
      onlyVerified,
      search,
      localityId,
      page = 1,
      limit = 20,
    } = filters;

    const where: any = {
      isVisible: true,
    };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }
    if (availability) {
      where.availability = availability;
    }
    if (onlyVerified) {
      where.isVerified = true;
    }
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (localityId) {
      where.localityId = localityId;
    }

    const skip = (page - 1) * limit;

    const [providers, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { name: true, slug: true, iconUrl: true } },
          images: { orderBy: { order: 'asc' } },
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          locality: { select: { name: true } },
        },
        orderBy: { averageRating: 'desc' },
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
    const dailyData = {};
    
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
      dailyClicks: Object.values(dailyData).sort((a: any, b: any) => 
        a.date.localeCompare(b.date)
      )
    };
  }
}