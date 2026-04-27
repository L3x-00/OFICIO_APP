import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AvailabilityStatus, SubscriptionPlan, NotificationType } from '../generated/client/enums.js';
import { Prisma } from '../generated/client/client.js';
import { EventsGateway } from '../events/events.gateway.js';

@Injectable()
export class ProviderProfileService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  // ── HELPER: obtener proveedor por userId (y opcionalmente por tipo) ──
  private async findProviderByUser(userId: number, type?: string) {
    const where: Prisma.ProviderWhereInput = { userId };
    if (type === 'OFICIO' || type === 'NEGOCIO') where.type = type as Prisma.EnumProviderTypeFilter;
    const provider = await this.prisma.provider.findFirst({ where });
    if (!provider) throw new NotFoundException('Perfil de proveedor no encontrado');
    return provider;
  }

  // ── OBTENER MI PERFIL DE PROVEEDOR ───────────────────────
  // type = 'OFICIO' | 'NEGOCIO' — si no se pasa, devuelve el primer perfil encontrado
  async getMyProfile(userId: number, type?: string) {
    const where: Prisma.ProviderWhereInput = { userId };
    if (type === 'OFICIO' || type === 'NEGOCIO') {
      where.type = type as Prisma.EnumProviderTypeFilter;
    }

    const provider = await this.prisma.provider.findFirst({
      where,
      include: {
        category:     { select: { id: true, name: true, slug: true } },
        locality:     { select: { id: true, name: true, department: true } },
        images:       { select: { id: true, url: true, isCover: true }, orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
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
      businessName?:   string;
      description?:    string;
      phone?:          string;
      whatsapp?:       string;
      address?:        string;
      scheduleJson?:   Record<string, string>;
      hasHomeService?: boolean;  // solo OFICIO
    },
    type?: string,
  ) {
    const provider = await this.findProviderByUser(userId, type);

    return this.prisma.provider.update({
      where: { id: provider.id },
      data,
      include: {
        category:     { select: { id: true, name: true, slug: true } },
        locality:     { select: { id: true, name: true, department: true } },
        images:       { select: { id: true, url: true, isCover: true }, orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
        subscription: { select: { plan: true, status: true, endDate: true } },
      },
    });
  }

  // ── CAMBIAR DISPONIBILIDAD ───────────────────────────────
  async setAvailability(userId: number, availability: AvailabilityStatus, type?: string) {
    const provider = await this.findProviderByUser(userId, type);

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

  async addImage(userId: number, url: string, isCover = false, type?: string) {
    const provider = await this.findProviderByUser(userId, type);
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

  async deleteImage(userId: number, imageId: number, type?: string) {
    const provider = await this.findProviderByUser(userId, type);
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
  async getMyAnalytics(userId: number, days = 30, type?: string) {
    const provider = await this.findProviderByUser(userId, type);

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

  // ── SOLICITUD DE UPGRADE DE PLAN ─────────────────────────
  async requestPlanUpgrade(userId: number, plan: string, type?: string) {
    const validPlans = ['ESTANDAR', 'PREMIUM'];
    if (!validPlans.includes(plan)) {
      throw new BadRequestException('Solo puedes solicitar plan ESTANDAR o PREMIUM');
    }

    const provider = await this.findProviderByUser(userId, type);

    // No permitir solicitar si ya tiene ese plan
    const sub = await this.prisma.subscription.findUnique({ where: { providerId: provider.id } });
    if (sub?.plan === plan) {
      throw new ConflictException('Ya tienes este plan activo');
    }

    // Bloquear si ya existe una solicitud PENDIENTE (evitar spam de requests)
    const existingPending = await this.prisma.planRequest.findFirst({
      where: { providerId: provider.id, status: 'PENDIENTE' },
    });
    if (existingPending) {
      throw new ConflictException('Ya tienes una solicitud en proceso. Espera a que sea revisada.');
    }

    const request = await this.prisma.planRequest.create({
      data: {
        providerId: provider.id,
        plan: plan as SubscriptionPlan,
        status: 'PENDIENTE',
      },
      include: { provider: { select: { businessName: true, type: true } } },
    });

    // Crear notificación interna en AdminNotification para el proveedor
    await this.prisma.adminNotification.create({
      data: {
        providerId:       provider.id,
        type:             NotificationType.PLAN_SOLICITADO,
        title:            `Solicitud de plan ${plan} enviada`,
        message:          `Tu solicitud para el plan ${plan} está siendo evaluada por el administrador.`,
        isRead:           false,
        targetUserId:     userId,
        targetProfileType: provider.type,
      },
    });

    // Notificación en tiempo real al proveedor
    this.events.emitNotification({
      type:              'PLAN_SOLICITADO',
      title:             'Solicitud enviada',
      body:              `Tu solicitud para el plan ${plan} está siendo evaluada.`,
      targetUserId:      userId,
      targetProfileType: provider.type,
    });

    // Notificación en tiempo real a admins
    this.events.emitNotification({
      type:       'NEW_PLAN_REQUEST',
      title:      'Nueva solicitud de plan',
      body:       `${request.provider.businessName} solicitó el plan ${plan}.`,
      targetRole: 'ADMIN',
    });

    return { success: true, requestId: request.id };
  }

  // ── ELIMINAR MI PERFIL EN CASCADA ─────────────────────────
  async deleteMyProfile(userId: number, type?: string) {
    const provider = await this.findProviderByUser(userId, type);
    const pid = provider.id;

    await this.prisma.$transaction(async (tx) => {
      await tx.providerAnalytic.deleteMany({ where: { providerId: pid } });
      await tx.adminNotification.deleteMany({ where: { providerId: pid } });
      await tx.providerReport.deleteMany({ where: { providerId: pid } });
      await tx.favorite.deleteMany({ where: { providerId: pid } });
      await tx.providerImage.deleteMany({ where: { providerId: pid } });
      await tx.verificationDoc.deleteMany({ where: { providerId: pid } });
      await tx.trustValidationRequest.deleteMany({ where: { providerId: pid } });
      await tx.planRequest.deleteMany({ where: { providerId: pid } });
      await tx.review.deleteMany({ where: { providerId: pid } });
      await tx.serviceItem.deleteMany({ where: { providerId: pid } });
      await tx.recommendation.deleteMany({ where: { providerId: pid } });
      const sub = await tx.subscription.findUnique({ where: { providerId: pid } });
      if (sub) await tx.subscription.delete({ where: { providerId: pid } });
      await tx.provider.delete({ where: { id: pid } });
    });

    // Notificar al admin en tiempo real
    this.events.emitAdminEvent('PROVIDER_DELETED', { providerId: pid, type: provider.type });

    return { success: true };
  }
}
