import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

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
}