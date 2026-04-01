import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AvailabilityStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ── MÉTRICAS GENERALES ───────────────────────────────────
  async getDashboardMetrics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalProviders,
      activeProviders,
      providersInGrace,
      providersExpiringSoon,
      totalUsers,
      totalReviews,
      pendingReviews,
      pendingVerifications,
      whatsappClicks,
      callClicks,
    ] = await Promise.all([
      // Total de proveedores
      this.prisma.provider.count(),

      // Proveedores visibles activos
      this.prisma.provider.count({ where: { isVisible: true } }),

      // En periodo de gracia
      this.prisma.subscription.count({
        where: { status: 'GRACIA' },
      }),

      // Periodo de gracia que vence en los próximos 7 días
      this.prisma.subscription.count({
        where: {
          status: 'GRACIA',
          endDate: {
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            gte: now,
          },
        },
      }),

      // Total de usuarios
      this.prisma.user.count({ where: { role: 'USUARIO' } }),

      // Total de reseñas
      this.prisma.review.count(),

      // Reseñas pendientes de moderación (visibles pero sin revisar)
      this.prisma.review.count({ where: { isVisible: true } }),

      // Documentos de verificación pendientes
      this.prisma.verificationDoc.count({
        where: { status: 'PENDIENTE' },
      }),

      // Clics en WhatsApp este mes
      this.prisma.providerAnalytic.count({
        where: {
          eventType: 'whatsapp_click',
          createdAt: { gte: startOfMonth },
        },
      }),

      // Clics en llamadas este mes
      this.prisma.providerAnalytic.count({
        where: {
          eventType: 'call_click',
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    return {
      totalProviders,
      activeProviders,
      providersInGrace,
      providersExpiringSoon,
      totalUsers,
      totalReviews,
      pendingReviews,
      pendingVerifications,
      whatsappClicks,
      callClicks,
    };
  }

  // ── PROVEEDORES EN PERIODO DE GRACIA ─────────────────────
  async getGraceProviders() {
    const now = new Date();

    const subscriptions = await this.prisma.subscription.findMany({
      where: { status: 'GRACIA' },
      include: {
        provider: {
          include: {
            category: { select: { name: true } },
            locality: { select: { name: true } },
          },
        },
      },
      orderBy: { endDate: 'asc' }, // Los que vencen primero, primero
    });

    return subscriptions.map((sub) => {
      const daysLeft = Math.ceil(
        (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        ...sub,
        daysLeft,
        isUrgent: daysLeft <= 7,
      };
    });
  }

  // ── ANALYTICS POR PROVEEDOR ───────────────────────────────
  async getAnalytics(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Top proveedores con más clics
    const topProviders = await this.prisma.providerAnalytic.groupBy({
      by: ['providerId', 'eventType'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Datos del gráfico: clics por día
    const dailyClicks = await this.prisma.providerAnalytic.findMany({
      where: { createdAt: { gte: since } },
      select: { eventType: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar por día manualmente
    const byDay: Record<string, { whatsapp: number; calls: number }> = {};
    for (const click of dailyClicks) {
      const day = click.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { whatsapp: 0, calls: 0 };
      if (click.eventType === 'whatsapp_click') byDay[day].whatsapp++;
      if (click.eventType === 'call_click') byDay[day].calls++;
    }

    return {
      topProviders,
      dailyClicks: Object.entries(byDay).map(([date, counts]) => ({
        date,
        ...counts,
      })),
    };
  }
  // ── CREAR PROVEEDOR DESDE EL ADMIN ──────────────────────
async createProvider(data: {
  email: string;
  firstName: string;
  lastName: string;
  businessName: string;
  phone: string;
  whatsapp?: string;
  description?: string;
  address?: string;
  categoryId: number;
  localityId: number;
  type: string;
  scheduleJson?: any;
}) {
  // Crear usuario base para el proveedor
  const bcrypt = await import('bcrypt');
  const tempPassword = Math.random().toString(36).slice(-8);

  const user = await this.prisma.user.create({
    data: {
      email: data.email,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'PROVEEDOR',
    },
  });

  // Crear el proveedor
  const provider = await this.prisma.provider.create({
    data: {
      userId: user.id,
      businessName: data.businessName,
      phone: data.phone,
      whatsapp: data.whatsapp,
      description: data.description,
      address: data.address,
      categoryId: data.categoryId,
      localityId: data.localityId,
      type: data.type as any,
      scheduleJson: data.scheduleJson ?? {
        lun: '8:00-18:00', mar: '8:00-18:00',
        mie: '8:00-18:00', jue: '8:00-18:00',
        vie: '8:00-18:00', sab: '9:00-13:00',
        dom: 'Cerrado',
      },
    },
    include: {
      category: true,
      locality: true,
    },
  });

  // Suscripción gratuita por 2 meses
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 2);
  await this.prisma.subscription.create({
    data: {
      providerId: provider.id,
      plan: 'GRATIS',
      status: 'GRACIA',
      endDate,
    },
  });

  return { provider, tempPassword };
}

// ── ACTUALIZAR PROVEEDOR ─────────────────────────────────
async updateProvider(id: number, data: {
    businessName?: string;
    phone?: string;
    description?: string;
    address?: string;
    isVisible?: boolean;
    isVerified?: boolean;
    // 2. Cambia 'string' por 'AvailabilityStatus'
    availability?: AvailabilityStatus; 
  }) {
    return this.prisma.provider.update({
      where: { id },
      data, // Ahora 'data' es compatible con lo que Prisma espera
      include: { category: true, locality: true },
    });
  
}

// ── SUSPENDER / ACTIVAR PROVEEDOR ────────────────────────
async toggleProviderVisibility(id: number) {
  const provider = await this.prisma.provider.findUnique({
    where: { id },
  });
  if (!provider) throw new Error('Proveedor no encontrado');

  return this.prisma.provider.update({
    where: { id },
    data: { isVisible: !provider.isVisible },
  });
}

// ── APROBAR VERIFICACIÓN ─────────────────────────────────
async approveVerification(providerId: number) {
  return this.prisma.provider.update({
    where: { id: providerId },
    data: {
      isVerified: true,
      verificationStatus: 'APROBADO',
    },
  });
}

// ── LISTAR TODOS LOS PROVEEDORES (sin límite) ────────────
async getAllProviders(page = 1, limit = 15, search?: string) {
  const skip = (page - 1) * limit;
  const where: any = {};

  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const [providers, total] = await Promise.all([
    this.prisma.provider.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: { select: { name: true } },
        locality: { select: { name: true } },
        subscription: { select: { plan: true, status: true, endDate: true } },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.provider.count({ where }),
  ]);

  return { data: providers, total, page, lastPage: Math.ceil(total / limit) };
}

// ── LISTAR CATEGORÍAS Y LOCALIDADES (para el formulario) ─
async getFormOptions() {
  const [categories, localities] = await Promise.all([
    this.prisma.category.findMany({ where: { isActive: true } }),
    this.prisma.locality.findMany({ where: { isActive: true } }),
  ]);
  return { categories, localities };
}
}
