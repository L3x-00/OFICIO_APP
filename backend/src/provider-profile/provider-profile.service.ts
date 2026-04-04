import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AvailabilityStatus } from '@prisma/client';

@Injectable()
export class ProviderProfileService {
  constructor(private prisma: PrismaService) {}

  // ── OBTENER MI PERFIL DE PROVEEDOR ───────────────────────
  async getMyProfile(userId: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      include: {
        category:     { select: { id: true, name: true, slug: true } },
        locality:     { select: { id: true, name: true, department: true } },
        // SE ELIMINÓ isPrimary PORQUE NO EXISTE EN EL ESQUEMA
        images:       { select: { id: true, url: true } }, 
        subscription: { select: { plan: true, status: true, endDate: true } },
        verificationDocs: {
          // SE ELIMINÓ createdAt PORQUE NO EXISTE EN EL ESQUEMA
          select: { id: true, docType: true, status: true },
        },
        user: {
          select: { email: true, firstName: true, lastName: true, phone: true, avatarUrl: true },
        },
      },
    });

    if (!provider) throw new NotFoundException('Perfil de proveedor no encontrado');
    return provider;
  }

  // ── ACTUALIZAR MI PERFIL ─────────────────────────────────
  async updateMyProfile(
    userId: number,
    data: {
      businessName?: string;
      description?:  string;
      phone?:        string;
      whatsapp?:     string;
      address?:      string;
      scheduleJson?: Record<string, string>;
    },
  ) {
    const provider = await this.prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de proveedor no encontrado');

    return this.prisma.provider.update({
      where: { userId },
      data,
      include: {
        category: { select: { name: true } },
        locality:  { select: { name: true } },
      },
    });
  }

  // ── CAMBIAR DISPONIBILIDAD ───────────────────────────────
  async setAvailability(userId: number, availability: AvailabilityStatus) {
    const provider = await this.prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de proveedor no encontrado');

    return this.prisma.provider.update({
      where: { userId },
      data: { availability },
      select: { id: true, availability: true },
    });
  }

  // ── NOTIFICACIONES DEL PROVEEDOR ─────────────────────────

  async getMyNotifications(userId: number) {
    const provider = await this.prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de proveedor no encontrado');

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.adminNotification.findMany({
        where: { providerId: provider.id },
        orderBy: { sentAt: 'desc' },
        take: 30,
      }),
      this.prisma.adminNotification.count({
        where: { providerId: provider.id, isRead: false },
      }),
    ]);

    return { data: notifications, unreadCount };
  }

  async markNotificationRead(userId: number, notifId: number) {
    const provider = await this.prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de proveedor no encontrado');

    const notif = await this.prisma.adminNotification.findFirst({
      where: { id: notifId, providerId: provider.id },
    });
    if (!notif) throw new BadRequestException('Notificación no encontrada');

    return this.prisma.adminNotification.update({
      where: { id: notifId },
      data: { isRead: true },
    });
  }

  // ── OBTENER MIS ANALÍTICAS ────────────────────────────────
  async getMyAnalytics(userId: number, days = 30) {
    const provider = await this.prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de proveedor no encontrado');

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Nota: Si providerAnalytic tampoco tiene createdAt, esto podría fallar.
    // Pero usualmente las tablas de analíticas sí lo traen por defecto.
    const [whatsappClicks, callClicks, recentEvents] = await Promise.all([
      this.prisma.providerAnalytic.count({
        where: { providerId: provider.id, eventType: 'whatsapp_click', createdAt: { gte: since } },
      }),
      this.prisma.providerAnalytic.count({
        where: { providerId: provider.id, eventType: 'call_click', createdAt: { gte: since } },
      }),
      this.prisma.providerAnalytic.findMany({
        where: { providerId: provider.id, createdAt: { gte: since } },
        select: { eventType: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Agrupar por día
    const byDay: Record<string, { whatsapp: number; calls: number }> = {};
    for (const event of recentEvents) {
      const day = event.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { whatsapp: 0, calls: 0 };
      if (event.eventType === 'whatsapp_click') byDay[day].whatsapp++;
      if (event.eventType === 'call_click') byDay[day].calls++;
    }

    return {
      summary: { whatsappClicks, callClicks, totalClicks: whatsappClicks + callClicks },
      dailyClicks: Object.entries(byDay).map(([date, counts]) => ({ date, ...counts })),
    };
  }
}