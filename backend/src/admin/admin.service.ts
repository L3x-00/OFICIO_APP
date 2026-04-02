import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AvailabilityStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ── MÉTRICAS ─────────────────────────────────────────────
  async getDashboardMetrics() {
    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalProviders, activeProviders, providersInGrace,
      providersExpiringSoon, totalUsers, totalReviews,
      pendingVerifications, whatsappClicks, callClicks,
    ] = await Promise.all([
      this.prisma.provider.count(),
      this.prisma.provider.count({ where: { isVisible: true } }),
      this.prisma.subscription.count({ where: { status: 'GRACIA' } }),
      this.prisma.subscription.count({
        where: {
          status: 'GRACIA',
          endDate: {
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            gte: now,
          },
        },
      }),
      this.prisma.user.count({ where: { role: 'USUARIO' } }),
      this.prisma.review.count(),
      this.prisma.verificationDoc.count({ where: { status: 'PENDIENTE' } }),
      this.prisma.providerAnalytic.count({
        where: { eventType: 'whatsapp_click', createdAt: { gte: startOfMonth } },
      }),
      this.prisma.providerAnalytic.count({
        where: { eventType: 'call_click', createdAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      totalProviders, activeProviders, providersInGrace,
      providersExpiringSoon, totalUsers, totalReviews,
      pendingVerifications, whatsappClicks, callClicks,
    };
  }

  // ── PROVEEDORES EN GRACIA ─────────────────────────────────
  async getGraceProviders() {
    const now = new Date();
    const subscriptions = await this.prisma.subscription.findMany({
      where: { status: 'GRACIA' },
      include: {
        provider: {
          include: {
            category: { select: { name: true } },
            locality:  { select: { name: true } },
          },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    return subscriptions.map((sub) => ({
      ...sub,
      daysLeft: Math.ceil(
        (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
      isUrgent: Math.ceil(
        (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ) <= 7,
    }));
  }

  // ── ANALYTICS ─────────────────────────────────────────────
  async getAnalytics(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const dailyClicks = await this.prisma.providerAnalytic.findMany({
      where: { createdAt: { gte: since } },
      select: { eventType: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay: Record<string, { whatsapp: number; calls: number }> = {};
    for (const click of dailyClicks) {
      const day = click.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { whatsapp: 0, calls: 0 };
      if (click.eventType === 'whatsapp_click') byDay[day].whatsapp++;
      if (click.eventType === 'call_click') byDay[day].calls++;
    }

    return {
      dailyClicks: Object.entries(byDay).map(([date, counts]) => ({
        date,
        ...counts,
      })),
    };
  }

  // ── LISTAR TODOS LOS PROVEEDORES ──────────────────────────
  async getAllProviders(page = 1, limit = 15, search?: string) {
    const skip  = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [providers, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: limit,
        include: {
          category:     { select: { name: true } },
          locality:     { select: { name: true } },
          subscription: { select: { plan: true, status: true, endDate: true } },
          user:         { select: { email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.provider.count({ where }),
    ]);

    return { data: providers, total, page, lastPage: Math.ceil(total / limit) };
  }

  // ── OPCIONES PARA FORMULARIOS ─────────────────────────────
  async getFormOptions() {
    const [categories, localities] = await Promise.all([
      this.prisma.category.findMany({ where: { isActive: true } }),
      this.prisma.locality.findMany({ where: { isActive: true } }),
    ]);
    return { categories, localities };
  }

  // ── CREAR PROVEEDOR ───────────────────────────────────────
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
  }) {
    // Verificar email duplicado
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException(
        'El correo electrónico ya está registrado en el sistema.',
      );
    }

    const bcrypt = await import('bcrypt');
    const chars  = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const tempPassword = Array.from(
      { length: 8 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');

    // Crear usuario y proveedor en transacción
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email:        data.email,
          passwordHash: await bcrypt.hash(tempPassword, 10),
          firstName:    data.firstName,
          lastName:     data.lastName,
          role:         'PROVEEDOR',
        },
      });

      const provider = await tx.provider.create({
        data: {
          userId:       user.id,
          businessName: data.businessName,
          phone:        data.phone,
          whatsapp:     data.whatsapp ?? null,
          description:  data.description ?? null,
          address:      data.address ?? null,
          categoryId:   data.categoryId,
          localityId:   data.localityId,
          type:         data.type as any,
          scheduleJson: {
            lun: '8:00-18:00', mar: '8:00-18:00',
            mie: '8:00-18:00', jue: '8:00-18:00',
            vie: '8:00-18:00', sab: '9:00-13:00',
            dom: 'Cerrado',
          },
        },
        include: { category: true, locality: true },
      });

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2);
      await tx.subscription.create({
        data: {
          providerId: provider.id,
          plan:       'GRATIS',
          status:     'GRACIA',
          endDate,
        },
      });

      return { provider, userId: user.id };
    });

    return { ...result, tempPassword };
  }

  // ── ACTUALIZAR PROVEEDOR ──────────────────────────────────
  async updateProvider(
    id: number,
    data: {
      businessName?: string;
      phone?: string;
      description?: string;
      address?: string;
      isVisible?: boolean;
      isVerified?: boolean;
      availability?: AvailabilityStatus; // <--- CAMBIA 'string' POR 'AvailabilityStatus'
    },
  ) {
    const exists = await this.prisma.provider.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Proveedor no encontrado');

    return this.prisma.provider.update({
      where: { id },
      data,
      include: { category: true, locality: true },
    });
  }

  // ── TOGGLE VISIBILIDAD ────────────────────────────────────
  async toggleProviderVisibility(id: number) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    return this.prisma.provider.update({
      where: { id },
      data: { isVisible: !provider.isVisible },
    });
  }

  // ── APROBAR VERIFICACIÓN ──────────────────────────────────
  async approveVerification(id: number) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    return this.prisma.provider.update({
      where: { id },
      data: { isVerified: true, verificationStatus: 'APROBADO' },
    });
  }

  // ── ELIMINAR PROVEEDOR (lógico) ───────────────────────────
  async deleteProvider(id: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: { subscription: true },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    // Borrar en cascada usando transacción
    await this.prisma.$transaction(async (tx) => {
      // Eliminar analytics
      await tx.providerAnalytic.deleteMany({ where: { providerId: id } });
      // Eliminar reseñas
      await tx.review.deleteMany({ where: { providerId: id } });
      // Eliminar favoritos
      await tx.favorite.deleteMany({ where: { providerId: id } });
      // Eliminar imágenes
      await tx.providerImage.deleteMany({ where: { providerId: id } });
      // Eliminar documentos
      await tx.verificationDoc.deleteMany({ where: { providerId: id } });
      // Eliminar suscripción
      if (provider.subscription) {
        await tx.payment.deleteMany({
          where: { subscriptionId: provider.subscription.id },
        });
        await tx.subscription.delete({
          where: { providerId: id },
        });
      }
      // Eliminar proveedor
      await tx.provider.delete({ where: { id } });
      // Eliminar usuario asociado
      await tx.user.delete({ where: { id: provider.userId } });
    });

    return { success: true, message: 'Proveedor eliminado correctamente' };
  }
}