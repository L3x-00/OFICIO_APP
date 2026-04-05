import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AvailabilityStatus } from '../generated/client/enums.js';

@Injectable()
export class ProviderProfileService {
  constructor(private prisma: PrismaService) {}

  // ── HELPER: obtener proveedor por userId (primer perfil) ──
  private async findProviderByUser(userId: number) {
    const provider = await this.prisma.provider.findFirst({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de proveedor no encontrado');
    return provider;
  }

  // ── OBTENER MI PERFIL DE PROVEEDOR ───────────────────────
  async getMyProfile(userId: number) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId },
      include: {
        category:     { select: { id: true, name: true, slug: true } },
        locality:     { select: { id: true, name: true, department: true } },
        images:       { select: { id: true, url: true } },
        subscription: { select: { plan: true, status: true, endDate: true } },
        verificationDocs: {
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
    const provider = await this.findProviderByUser(userId);

    return this.prisma.provider.update({
      where: { id: provider.id },
      data,
      include: {
        category: { select: { name: true } },
        locality:  { select: { name: true } },
      },
    });
  }

  // ── CAMBIAR DISPONIBILIDAD ───────────────────────────────
  async setAvailability(userId: number, availability: AvailabilityStatus) {
    const provider = await this.findProviderByUser(userId);

    return this.prisma.provider.update({
      where: { id: provider.id },
      data: { availability },
      select: { id: true, availability: true },
    });
  }

  // ── NOTIFICACIONES DEL PROVEEDOR ─────────────────────────

  async getMyNotifications(userId: number) {
    const provider = await this.findProviderByUser(userId);

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
    const provider = await this.findProviderByUser(userId);

    const notif = await this.prisma.adminNotification.findFirst({
      where: { id: notifId, providerId: provider.id },
    });
    if (!notif) throw new BadRequestException('Notificación no encontrada');

    return this.prisma.adminNotification.update({
      where: { id: notifId },
      data: { isRead: true },
    });
  }

  // ── IMÁGENES DEL PROVEEDOR ───────────────────────────────

  async addImage(userId: number, url: string, isCover = false) {
    const provider = await this.findProviderByUser(userId);
    const existingCount = await this.prisma.providerImage.count({
      where: { providerId: provider.id },
    });
    if (existingCount >= 4) {
      throw new BadRequestException('Máximo 4 fotos permitidas');
    }
    // La primera imagen sube automáticamente como portada
    const shouldBeCover = isCover || existingCount === 0;
    return this.prisma.providerImage.create({
      data: {
        providerId: provider.id,
        url,
        isCover: shouldBeCover,
        order: existingCount,
      },
    });
  }

  async deleteImage(userId: number, imageId: number) {
    const provider = await this.findProviderByUser(userId);
    const img = await this.prisma.providerImage.findFirst({
      where: { id: imageId, providerId: provider.id },
    });
    if (!img) throw new NotFoundException('Imagen no encontrada');

    await this.prisma.providerImage.delete({ where: { id: imageId } });

    // Si era la portada, asignar la siguiente imagen como portada
    if (img.isCover) {
      const next = await this.prisma.providerImage.findFirst({
        where: { providerId: provider.id },
        orderBy: { order: 'asc' },
      });
      if (next) {
        await this.prisma.providerImage.update({
          where: { id: next.id },
          data: { isCover: true },
        });
      }
    }

    return { success: true };
  }

  // ── OBTENER MIS ANALÍTICAS ────────────────────────────────
  async getMyAnalytics(userId: number, days = 30) {
    const provider = await this.findProviderByUser(userId);

    const since = new Date();
    since.setDate(since.getDate() - days);

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
