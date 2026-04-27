import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AvailabilityStatus, ProviderType, SubscriptionPlan, SubscriptionStatus, NotificationType } from '../generated/client/enums.js';
import { Prisma } from '../generated/client/client.js';
import { EventsGateway } from '../events/events.gateway.js';
import { MinioService } from '../common/minio.service.js';
import { PushNotificationsService } from '../firebase/push-notifications.service.js';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private minio: MinioService,
    private push: PushNotificationsService,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(CACHE_MANAGER) private cacheManager: any,
  ) {}

  // ── MÉTRICAS ─────────────────────────────────────────────
  async getDashboardMetrics() {
    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalProviders, activeProviders, providersInGrace,
      providersExpiringSoon, totalUsers, totalReviews,
      pendingVerifications, whatsappClicks, callClicks,
      totalActiveUsers, totalProviderUsers,
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
      this.prisma.provider.count({ where: { verificationStatus: 'PENDIENTE' } }),
      this.prisma.providerAnalytic.count({
        where: { eventType: 'whatsapp_click', createdAt: { gte: startOfMonth } },
      }),
      this.prisma.providerAnalytic.count({
        where: { eventType: 'call_click', createdAt: { gte: startOfMonth } },
      }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: 'PROVEEDOR' } }),
    ]);

    return {
      totalProviders, activeProviders, providersInGrace,
      providersExpiringSoon, totalUsers, totalReviews,
      pendingVerifications, whatsappClicks, callClicks,
      totalActiveUsers, totalProviderUsers,
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
    const since    = new Date();
    since.setDate(since.getDate() - days);
    const prevSince = new Date(since);
    prevSince.setDate(prevSince.getDate() - days);

    const [
      allEvents,
      prevWA, prevCalls, prevViews,
      planDist,
      totalProviders, approvedProviders, pendingProviders, rejectedProviders, activeProviders,
      availDist,
      geoDist,
      topProviderClicks,
    ] = await Promise.all([
      // Todos los eventos del período actual
      this.prisma.providerAnalytic.findMany({
        where: { createdAt: { gte: since } },
        select: { eventType: true, createdAt: true, providerId: true },
        orderBy: { createdAt: 'asc' },
      }),
      // Período anterior para comparación
      this.prisma.providerAnalytic.count({ where: { eventType: 'whatsapp_click', createdAt: { gte: prevSince, lt: since } } }),
      this.prisma.providerAnalytic.count({ where: { eventType: 'call_click',     createdAt: { gte: prevSince, lt: since } } }),
      this.prisma.providerAnalytic.count({ where: { eventType: 'view',           createdAt: { gte: prevSince, lt: since } } }),
      // Distribución de planes
      this.prisma.subscription.groupBy({
        by: ['plan'],
        _count: { id: true },
        where: { provider: { verificationStatus: 'APROBADO' } },
      }),
      // Funnel de proveedores
      this.prisma.provider.count(),
      this.prisma.provider.count({ where: { verificationStatus: 'APROBADO' } }),
      this.prisma.provider.count({ where: { verificationStatus: 'PENDIENTE' } }),
      this.prisma.provider.count({ where: { verificationStatus: 'RECHAZADO' } }),
      this.prisma.provider.count({ where: { isVisible: true } }),
      // Distribución de disponibilidad
      this.prisma.provider.groupBy({
        by: ['availability'],
        _count: { id: true },
        where: { verificationStatus: 'APROBADO' },
      }),
      // Distribución geográfica (top 10 localidades)
      this.prisma.provider.groupBy({
        by: ['localityId'],
        _count: { id: true },
        where: { localityId: { not: undefined } },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      // Top proveedores por clicks en el período
      this.prisma.providerAnalytic.groupBy({
        by: ['providerId'],
        _count: { id: true },
        where: { createdAt: { gte: since }, eventType: { in: ['whatsapp_click', 'call_click'] } },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Construir dailyClicks agrupado por día
    const byDay: Record<string, { whatsapp: number; calls: number; views: number }> = {};
    let totalWA = 0, totalCalls = 0, totalViews = 0;
    for (const ev of allEvents) {
      const day = ev.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { whatsapp: 0, calls: 0, views: 0 };
      if (ev.eventType === 'whatsapp_click') { byDay[day].whatsapp++; totalWA++; }
      if (ev.eventType === 'call_click')     { byDay[day].calls++;    totalCalls++; }
      if (ev.eventType === 'view')           { byDay[day].views++;    totalViews++; }
    }

    // Delta % vs período anterior
    const pctDelta = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

    // Obtener nombres de localidades para geo
    const localityIds = geoDist.map((g) => g.localityId).filter((id): id is number => id != null);
    const localityData = localityIds.length > 0
      ? await this.prisma.locality.findMany({
          where: { id: { in: localityIds } },
          select: { id: true, name: true },
        })
      : [];
    const localityMap = new Map(localityData.map((l) => [l.id, l.name]));

    // Obtener nombres de top proveedores
    const topProviderIds = topProviderClicks.map((t) => t.providerId);
    const topProviderData = topProviderIds.length > 0
      ? await this.prisma.provider.findMany({
          where: { id: { in: topProviderIds } },
          select: { id: true, businessName: true, type: true, category: { select: { name: true } } },
        })
      : [];
    const topProviderMap = new Map(topProviderData.map((p) => [p.id, p]));

    return {
      // Daily engagement con views
      dailyClicks: Object.entries(byDay).map(([date, counts]) => ({ date, ...counts })),

      // KPIs del período con comparación
      kpis: {
        whatsappTotal: totalWA,
        callsTotal:    totalCalls,
        viewsTotal:    totalViews,
        whatsappDelta: pctDelta(totalWA,    prevWA),
        callsDelta:    pctDelta(totalCalls, prevCalls),
        viewsDelta:    pctDelta(totalViews, prevViews),
      },

      // Distribución de planes
      planDistribution: planDist.map((p) => ({
        plan:  p.plan,
        count: p._count.id,
      })),

      // Funnel de proveedores
      providerFunnel: {
        total:    totalProviders,
        approved: approvedProviders,
        pending:  pendingProviders,
        rejected: rejectedProviders,
        active:   activeProviders,
        conversionRate: totalProviders > 0
          ? Math.round((approvedProviders / totalProviders) * 100)
          : 0,
      },

      // Distribución de disponibilidad
      availabilityDistribution: availDist.map((a) => ({
        status: a.availability,
        count:  a._count.id,
      })),

      // Distribución geográfica
      geoDistribution: geoDist
        .filter((g) => g.localityId != null)
        .map((g) => ({ department: localityMap.get(g.localityId!) ?? `Loc #${g.localityId}`, count: g._count.id })),

      // Top proveedores por engagement
      topProviders: topProviderClicks.map((t) => {
        const p = topProviderMap.get(t.providerId);
        return {
          providerId:   t.providerId,
          businessName: p?.businessName ?? `Proveedor #${t.providerId}`,
          type:         p?.type ?? 'OFICIO',
          categoryName: p?.category?.name ?? '—',
          clicks:       t._count.id,
        };
      }),
    };
  }

  // ── LISTAR TODOS LOS PROVEEDORES ──────────────────────────
  async getAllProviders(page = 1, limit = 15, search?: string) {
    const skip  = (page - 1) * limit;
    const where: Prisma.ProviderWhereInput = {};

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
          category:         { select: { name: true } },
          locality:         { select: { name: true } },
          subscription:     { select: { plan: true, status: true, endDate: true } },
          user:             { select: { email: true, firstName: true, lastName: true, createdAt: true } },
          images:           true,
          verificationDocs: true,
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
      this.prisma.category.findMany({
        where:   { isActive: true, parentId: null },
        include: { children: { where: { isActive: true }, select: { id: true, name: true, slug: true, forType: true } } },
        orderBy: { name: 'asc' },
      }),
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
  categoryId: number | string;
  localityId: number | string;
  type: string;
  dni?: string;
  ruc?: string;
  nombreComercial?: string;
  razonSocial?: string;
  hasDelivery?: boolean | string;
  plenaCoordinacion?: boolean | string;
  department?: string;
  province?: string;
  district?: string;
  scheduleJson?: string;
}, files: Express.Multer.File[]) {
  
  const existing = await this.prisma.user.findUnique({
    where: { email: data.email },
  });
  
  if (existing) {
    throw new ConflictException('El correo electrónico ya está registrado.');
  }

  const bcrypt = await import('bcrypt');
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const tempPassword = Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('');

  // Upload images to R2 before transaction
  const imageUrls: string[] = files && files.length > 0
    ? await Promise.all(files.map(f => this.minio.uploadFile(f.buffer, f.originalname, 'providers/gallery')))
    : [];

  const result = await this.prisma.$transaction(async (tx) => {
    // 1. Crear Usuario
    const user = await tx.user.create({
      data: {
        email:        data.email,
        passwordHash: await bcrypt.hash(tempPassword, 10),
        firstName:    data.firstName,
        lastName:     data.lastName,
        role:         'PROVEEDOR',
        department:   data.department ?? null,
        province:     data.province   ?? null,
        district:     data.district   ?? null,
      },
    });

    // 2. Crear Proveedor
    let parsedSchedule: object | undefined;
    if (data.scheduleJson) {
      try { parsedSchedule = JSON.parse(data.scheduleJson); } catch { /* ignore */ }
    }
    if (!parsedSchedule) {
      parsedSchedule = {
        lun: '8:00-18:00', mar: '8:00-18:00', mie: '8:00-18:00',
        jue: '8:00-18:00', vie: '8:00-18:00', sab: '9:00-13:00', dom: 'Cerrado',
      };
    }

    const provider = await tx.provider.create({
      data: {
        userId:          user.id,
        businessName:    data.businessName,
        phone:           data.phone,
        whatsapp:        data.whatsapp ?? null,
        description:     data.description ?? null,
        address:         data.address ?? null,
        categoryId:      Number(data.categoryId),
        localityId:      Number(data.localityId),
        type:            data.type as any,
        dni:             data.dni ?? null,
        ruc:             data.ruc ?? null,
        nombreComercial: data.nombreComercial ?? null,
        razonSocial:     data.razonSocial ?? null,
        hasDelivery:     data.hasDelivery === true || data.hasDelivery === 'true',
        scheduleJson:    parsedSchedule as any,
      },
      include: { category: true, locality: true },
    });

    // 3. GUARDAR IMÁGENES EN LA TABLA provider_images
    if (imageUrls.length > 0) {
      await tx.providerImage.createMany({
        data: imageUrls.map((url, index) => ({
          providerId: provider.id,
          url,
          isCover: index === 0,
          order: index,
        })),
      });
    }

    // 4. Crear Suscripción (tu lógica actual)
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 2);
    await tx.subscription.create({
      data: {
        providerId: provider.id,
        plan: 'GRATIS',
        status: 'GRACIA',
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
    availability?: any; // Usa tu enum AvailabilityStatus
  },
) {
  const exists = await this.prisma.provider.findUnique({ 
    where: { id },
    include: { images: true } // Incluimos imágenes por si quieres verlas
  });
  
  if (!exists) throw new NotFoundException('Proveedor no encontrado');

  return this.prisma.provider.update({
    where: { id },
    data,
    include: { 
      category: true, 
      locality: true,
      images: true // Para que el admin vea las fotos actuales al actualizar
    },
  });
}

  // ── HELPER: plan → prioridad de listado ──────────────────
  private planToPriority(plan: string, status: string): number {
    if (status !== 'ACTIVA') return 4;
    switch (plan) {
      case 'PREMIUM':  return 1;
      case 'ESTANDAR': return 2;
      case 'BASICO':   return 3;
      default:         return 4;
    }
  }

  // ── CAMBIAR PLAN DE SUSCRIPCIÓN ────────────────────────────
  async updateProviderSubscription(id: number, plan: string) {
    const validPlans = ['GRATIS', 'ESTANDAR', 'PREMIUM'];
    if (!validPlans.includes(plan)) {
      throw new BadRequestException(`Plan inválido. Valores permitidos: ${validPlans.join(', ')}`);
    }

    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: { subscription: true, user: true },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    const status = plan === 'GRATIS' ? 'GRACIA' : 'ACTIVA';
    const priority = this.planToPriority(plan, status);

    // Actualizar prioridad del proveedor
    await this.prisma.provider.update({
      where: { id },
      data: { planPriority: priority },
    });

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    if (provider.subscription) {
      await this.prisma.subscription.update({
        where: { providerId: id },
        data: {
          plan:    plan as SubscriptionPlan,
          status:  status as SubscriptionStatus,
          endDate: plan !== 'GRATIS' ? endDate : undefined,
        },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          providerId: id,
          plan:       plan as SubscriptionPlan,
          status:     status as SubscriptionStatus,
          endDate,
        },
      });
    }

    // Solo notificar si es una promoción real (ESTANDAR o PREMIUM)
    if (plan === 'ESTANDAR' || plan === 'PREMIUM') {
      const planLabel = plan === 'PREMIUM' ? 'Premium' : 'Estándar';
      const title     = `¡Has sido promovido al plan ${planLabel}!`;
      const body      = `¡Felicidades! El administrador te ha promovido al plan ${planLabel}. Ahora disfrutas de todos sus beneficios.`;

      await this.prisma.adminNotification.create({
        data: {
          providerId:        id,
          type:              NotificationType.PLAN_APROBADO,
          title,
          message:           body,
          isRead:            false,
          targetUserId:      provider.userId,
          targetProfileType: provider.type,
        },
      });

      this.eventsGateway.emitNotification({
        type:              'PLAN_APROBADO',
        title,
        body,
        targetUserId:      provider.userId,
        targetProfileType: provider.type,
      });
    }

    return { success: true, plan, status };
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

  // ── HELPER: INVALIDAR CACHÉ DE PROVEEDORES ───────────────
  // cache-manager v7 + cache-manager-redis-yet puede exponer reset()
  // directamente o a través del store. Intentamos ambas vías.
  private async clearProvidersCache(): Promise<void> {
    try {
      const cm = this.cacheManager;
      if (typeof cm?.reset === 'function') {
        await cm.reset();
      } else if (typeof cm?.store?.reset === 'function') {
        await cm.store.reset();
      } else {
        // Último recurso: flushAll/flushDb vía cliente Redis directo
        const client = cm?.store?.getClient?.() ?? cm?.client ?? cm?.store?.client;
        if (typeof client?.flushAll === 'function') await client.flushAll();
        else if (typeof client?.flushDb === 'function') await client.flushDb();
      }
    } catch {
      // Si la limpieza falla, el TTL de 30s invalida la caché naturalmente
    }
  }

  // ── VERIFICACIÓN ──────────────────────────────────────────

  async getPendingVerifications() {
    return this.prisma.provider.findMany({
      where: { verificationStatus: 'PENDIENTE' },
      include: {
        user:     { select: { email: true, firstName: true, lastName: true, createdAt: true } },
        category: { select: { name: true } },
        locality: { select: { name: true } },
        verificationDocs: true,
        images: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveVerification(id: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: { subscription: true },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 2);

    const [updated] = await this.prisma.$transaction(async (tx) => {
      // 1. Aprobar proveedor y hacerlo visible
      const updatedProvider = await tx.provider.update({
        where: { id },
        data: { isVerified: true, verificationStatus: 'APROBADO', isVisible: true },
      });

      // 2. Cambiar rol del usuario a PROVEEDOR (ahora sí está aprobado)
      await tx.user.update({
        where: { id: provider.userId },
        data: { role: 'PROVEEDOR' },
      });

      // 3. Crear suscripción de gracia (solo si no tiene una ya)
      if (!provider.subscription) {
        await tx.subscription.create({
          data: {
            providerId: id,
            plan:       'GRATIS',
            status:     'GRACIA',
            endDate,
          },
        });
      }

      // 4. Notificación en BD
      await tx.adminNotification.create({
        data: {
          providerId: id,
          type: 'APROBADO',
          message: '¡Felicidades! Tu perfil ha sido verificado y aprobado. Tu insignia de verificación ya está activa.',
        },
      });

      return [updatedProvider];
    });

    // Invalidar caché para que la app móvil vea al proveedor de inmediato
    await this.clearProvidersCache();

    // Notificar en tiempo real a todos los clientes conectados (admin panel)
    this.eventsGateway.emitProviderStatusChanged({
      id: updated.id,
      businessName: updated.businessName,
      verificationStatus: updated.verificationStatus,
      isVerified: updated.isVerified,
    });
    this.eventsGateway.emitAdminEvent('PROVIDER_APPROVED', { providerId: id, businessName: updated.businessName });

    // Notificar al proveedor específico en la app móvil
    this.eventsGateway.emitNotification({
      type: 'PROVIDER_APPROVED',
      title: '¡Perfil aprobado! ✅',
      body: `Tu perfil "${updated.businessName}" fue aprobado. ¡Ya apareces en la plataforma!`,
      targetUserId: provider.userId,
    });

    this.push.sendToUser(
      provider.userId,
      '¡Perfil aprobado! ✅',
      `Tu perfil "${updated.businessName}" fue aprobado. ¡Ya apareces en la plataforma!`,
      { type: 'PROVIDER_APPROVED' },
    );

    return updated;
  }

  async rejectVerification(id: number, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('El motivo de rechazo es obligatorio');

    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    const [updated] = await this.prisma.$transaction(async (tx) => {
      // 1. Marcar proveedor como rechazado y oculto
      const updatedProvider = await tx.provider.update({
        where: { id },
        data: { isVerified: false, verificationStatus: 'RECHAZADO', isVisible: false },
      });

      // 2. Asegurar que el usuario quede como USUARIO (nunca PROVEEDOR si fue rechazado)
      await tx.user.update({
        where: { id: provider.userId },
        data: { role: 'USUARIO' },
      });

      // 3. Notificación en BD con el motivo exacto
      await tx.adminNotification.create({
        data: {
          providerId: id,
          type: 'RECHAZADO',
          message: `Tu solicitud de verificación fue rechazada. Motivo: ${reason}`,
        },
      });

      return [updatedProvider];
    });

    // Notificar en tiempo real (el proveedor dejará de aparecer si estaba visible)
    await this.clearProvidersCache();
    this.eventsGateway.emitProviderStatusChanged({
      id: updated.id,
      businessName: updated.businessName,
      verificationStatus: updated.verificationStatus,
      isVerified: updated.isVerified,
    });
    this.eventsGateway.emitAdminEvent('PROVIDER_REJECTED', { providerId: id, businessName: updated.businessName });

    // Notificar al proveedor específico en la app móvil
    this.eventsGateway.emitNotification({
      type: 'PROVIDER_REJECTED',
      title: 'Perfil rechazado',
      body: `Tu perfil "${updated.businessName}" no fue aprobado. Motivo: ${reason}`,
      targetUserId: provider.userId,
    });

    this.push.sendToUser(
      provider.userId,
      'Perfil rechazado',
      `Tu perfil "${updated.businessName}" no fue aprobado. Motivo: ${reason}`,
      { type: 'PROVIDER_REJECTED' },
    );

    return updated;
  }

  async requestMoreInfo(id: number, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('El detalle de la solicitud es obligatorio');

    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    await this.prisma.adminNotification.create({
      data: {
        providerId: id,
        type: 'MAS_INFO',
        message: `Necesitamos más información para verificar tu perfil: ${reason}`,
      },
    });

    return { success: true, message: 'Solicitud de información enviada' };
  }

  async revokeVerification(id: number, reason?: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');
    if (!provider.isVerified) throw new BadRequestException('Este proveedor no está verificado');

    const [updated] = await Promise.all([
      this.prisma.provider.update({
        where: { id },
        data: { isVerified: false, verificationStatus: 'PENDIENTE' },
      }),
      this.prisma.adminNotification.create({
        data: {
          providerId: id,
          type: 'VERIFICACION_REVOCADA',
          message: reason
            ? `Tu verificación ha sido revocada. Motivo: ${reason}`
            : 'Tu verificación ha sido revocada por el administrador.',
        },
      }),
    ]);

    // Invalidar caché y notificar — el proveedor ya no aparecerá en la app
    await this.clearProvidersCache();
    this.eventsGateway.emitProviderStatusChanged({
      id: updated.id,
      businessName: updated.businessName,
      verificationStatus: updated.verificationStatus,
      isVerified: updated.isVerified,
    });

    return updated;
  }

  // ── GESTIÓN DE USUARIOS ───────────────────────────────────

  async getUsers(
    page = 1,
    limit = 20,
    search?: string,
    role?: string,
    isActive?: boolean,
  ) {
    const skip  = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role)             where.role     = role as Prisma.EnumUserRoleFilter;
    if (isActive !== undefined) where.isActive = isActive;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id:        true,
          firstName: true,
          lastName:  true,
          email:     true,
          role:      true,
          isActive:  true,
          createdAt: true,
          providers: { select: { id: true, businessName: true, verificationStatus: true, isVerified: true }, take: 1 },
          _count:    { select: { reviews: true, favorites: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const mapped = users.map(({ providers, ...u }) => ({
      ...u,
      provider: providers[0] ?? null,
    }));
    return { data: mapped, total, page, lastPage: Math.ceil(total / limit) };
  }

  async deleteUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === 'ADMIN') throw new BadRequestException('No se puede eliminar un administrador');

    // Cascade en schema.prisma elimina: providers (con todas sus dependencias),
    // reviews, reviewReplies, providerReports, platformIssues, refreshTokens,
    // otpCodes, recommendations, serviceRequests, userPenalty, favorites.
    await this.prisma.user.delete({ where: { id } });

    return { success: true, message: 'Usuario eliminado correctamente' };
  }

  async updateUserStatus(id: number, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === 'ADMIN') throw new BadRequestException('No se puede modificar el estado de un administrador');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, isActive: true, role: true },
    });

    // Notificar en tiempo real al dispositivo del usuario para forzar cierre de sesión
    if (!isActive) {
      this.eventsGateway.emitUserDeactivated(id);
    }

    return updated;
  }

  // ── NOTIFICACIONES ────────────────────────────────────────

  async getNotifications(page = 1, limit = 20) {
    const skip  = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.adminNotification.findMany({
        skip,
        take: limit,
        include: {
          provider: {
            select: { businessName: true, user: { select: { firstName: true, lastName: true } } },
          },
        },
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.adminNotification.count(),
      this.prisma.adminNotification.count({ where: { isRead: false } }),
    ]);

    return { data: notifications, total, page, lastPage: Math.ceil(total / limit), unreadCount };
  }

  async markNotificationRead(id: number) {
    return this.prisma.adminNotification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllNotificationsRead() {
    await this.prisma.adminNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  // ── REPORTES ──────────────────────────────────────────────

  async getReports() {
    const [
      topRatedProviders,
      mostReviewedProviders,
      mostActiveUsers,
      popularCategories,
      recentRegistrations,
      verificationStats,
    ] = await Promise.all([
      // Mejor calificados
      this.prisma.provider.findMany({
        where: { totalReviews: { gt: 0 } },
        select: {
          id: true, businessName: true, averageRating: true, totalReviews: true,
          category: { select: { name: true } },
          locality: { select: { name: true } },
          isVerified: true,
        },
        orderBy: [{ averageRating: 'desc' }, { totalReviews: 'desc' }],
        take: 10,
      }),

      // Más reseñas
      this.prisma.provider.findMany({
        where: { totalReviews: { gt: 0 } },
        select: {
          id: true, businessName: true, totalReviews: true, averageRating: true,
          category: { select: { name: true } },
        },
        orderBy: { totalReviews: 'desc' },
        take: 10,
      }),

      // Usuarios más activos (más reseñas)
      this.prisma.user.findMany({
        where: { role: 'USUARIO' },
        select: {
          id: true, firstName: true, lastName: true, email: true, createdAt: true,
          _count: { select: { reviews: true, favorites: true } },
        },
        orderBy: { reviews: { _count: 'desc' } },
        take: 10,
      }),

      // Categorías populares
      this.prisma.category.findMany({
        where: { isActive: true, parentId: null },
        select: {
          id: true, name: true, slug: true,
          _count: { select: { providers: true } },
        },
        orderBy: { providers: { _count: 'desc' } },
        take: 10,
      }),

      // Registros por mes (últimos 6 meses)
      this.prisma.$queryRaw<{ month: string; users: number; providers: number }[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS month,
          COUNT(*) FILTER (WHERE role = 'USUARIO')    AS users,
          COUNT(*) FILTER (WHERE role = 'PROVEEDOR')  AS providers
        FROM users
        WHERE "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY 1
        ORDER BY 1
      `,

      // Estadísticas de verificación
      this.prisma.provider.groupBy({
        by: ['verificationStatus'],
        _count: { verificationStatus: true },
      }),
    ]);

    return {
      topRatedProviders,
      mostReviewedProviders,
      mostActiveUsers,
      popularCategories,
      recentRegistrations,
      verificationStats: verificationStats.map((v) => ({
        status: v.verificationStatus,
        count: v._count.verificationStatus,
      })),
    };
  }

  async exportUsersCSV(): Promise<string> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true, firstName: true, lastName: true, email: true,
        role: true, isActive: true, createdAt: true,
        providers: { select: { businessName: true, verificationStatus: true }, take: 1 },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = ['ID', 'Nombre', 'Apellido', 'Email', 'Rol', 'Activo', 'Fecha Registro', 'Negocio', 'Verificación', 'Reseñas'].join(',');
    const rows = users.map((u) => {
      const prov = u.providers[0] ?? null;
      return [
        u.id,
        `"${u.firstName}"`,
        `"${u.lastName}"`,
        `"${u.email}"`,
        u.role,
        u.isActive ? 'Sí' : 'No',
        u.createdAt.toISOString().split('T')[0],
        prov ? `"${prov.businessName}"` : '',
        prov?.verificationStatus ?? '',
        u._count.reviews,
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  async exportProvidersCSV(): Promise<string> {
    const providers = await this.prisma.provider.findMany({
      include: {
        user:         { select: { email: true, firstName: true, lastName: true } },
        category:     { select: { name: true } },
        locality:     { select: { name: true } },
        subscription: { select: { plan: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = ['ID', 'Negocio', 'Email', 'Nombre', 'Teléfono', 'Categoría', 'Localidad', 'Calificación', 'Reseñas', 'Verificado', 'Estado', 'Plan', 'Suscripción'].join(',');
    const rows = providers.map((p) => [
      p.id,
      `"${p.businessName}"`,
      `"${p.user.email}"`,
      `"${p.user.firstName} ${p.user.lastName}"`,
      `"${p.phone}"`,
      `"${p.category.name}"`,
      `"${p.locality.name}"`,
      p.averageRating.toFixed(2),
      p.totalReviews,
      p.isVerified ? 'Sí' : 'No',
      p.verificationStatus,
      p.subscription?.plan ?? '',
      p.subscription?.status ?? '',
    ].join(','));

    return [header, ...rows].join('\n');
  }

  // ── CRUD DE CATEGORÍAS ────────────────────────────────────

  async getCategories() {
    return this.prisma.category.findMany({
      include: {
        children: { select: { id: true, name: true, slug: true, isActive: true } },
        parent:   { select: { id: true, name: true } },
        _count:   { select: { providers: true } },
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(data: {
    name:      string;
    slug:      string;
    iconUrl?:  string;
    parentId?: number;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.category.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictException(`El slug '${data.slug}' ya está en uso`);

    return this.prisma.category.create({ data });
  }

  async updateCategory(
    id: number,
    data: {
      name?:     string;
      slug?:     string;
      iconUrl?:  string;
      parentId?: number | null;
      forType?:  string | null;
      isActive?: boolean;
    },
  ) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Categoría no encontrada');

    if (data.slug && data.slug !== exists.slug) {
      const slugTaken = await this.prisma.category.findUnique({ where: { slug: data.slug } });
      if (slugTaken) throw new ConflictException(`El slug '${data.slug}' ya está en uso`);
    }

    return this.prisma.category.update({ where: { id }, data });
  }

  async toggleCategoryActive(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Categoría no encontrada');

    return this.prisma.category.update({
      where: { id },
      data: { isActive: !category.isActive },
    });
  }

  // ── ELIMINAR PROVEEDOR ────────────────────────────────────
  async deleteProvider(id: number) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    // Cascade en schema.prisma elimina: providerImage, providerAnalytic,
    // adminNotification, providerReport, subscription (y sus payments),
    // review, favorite, verificationDoc, recommendation, serviceItem,
    // planRequest, trustValidationRequest, offer.
    await this.prisma.provider.delete({ where: { id } });

    return { success: true, message: 'Proveedor eliminado correctamente' };
  }

  // ── SOLICITUDES DE PLAN ───────────────────────────────────

  async getPlanRequests(status?: string) {
    return this.prisma.planRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            type: true,
            phone: true,
            subscription: { select: { plan: true, status: true } },
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
  }

  async approvePlanRequest(requestId: number) {
    const req = await this.prisma.planRequest.findUnique({
      where: { id: requestId },
      include: { provider: { include: { subscription: true, user: true } } },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.status !== 'PENDIENTE') throw new BadRequestException('La solicitud ya fue procesada');

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const priority = this.planToPriority(req.plan, 'ACTIVA');

    // Update or create subscription + actualizar prioridad (transacción atómica)
    await this.prisma.$transaction(async (tx) => {
      if (req.provider.subscription) {
        await tx.subscription.update({
          where: { providerId: req.providerId },
          data: { plan: req.plan, status: 'ACTIVA', endDate },
        });
      } else {
        await tx.subscription.create({
          data: { providerId: req.providerId, plan: req.plan, status: 'ACTIVA', endDate },
        });
      }

      // Subir en el ranking de listado
      await tx.provider.update({
        where: { id: req.providerId },
        data: { planPriority: priority },
      });

      // Mark request approved
      await tx.planRequest.update({
        where: { id: requestId },
        data: { status: 'APROBADO' },
      });
    });

    // Persist notification for provider
    await this.prisma.adminNotification.create({
      data: {
        providerId:        req.providerId,
        type:              NotificationType.PLAN_APROBADO,
        title:             `¡Plan ${req.plan} aprobado!`,
        message:           `¡Felicidades! Tu solicitud para el plan ${req.plan} ha sido aprobada. Ya puedes disfrutar de todos los beneficios.`,
        isRead:            false,
        targetUserId:      req.provider.userId,
        targetProfileType: req.provider.type,
      },
    });

    // Real-time notification to provider
    this.eventsGateway.emitNotification({
      type:              'PLAN_APROBADO',
      title:             `¡Plan ${req.plan} aprobado!`,
      body:              `¡Felicidades! Tu plan ${req.plan} ha sido aprobado.`,
      targetUserId:      req.provider.userId,
      targetProfileType: req.provider.type,
    });
    this.eventsGateway.emitAdminEvent('PLAN_APPROVED', { requestId, plan: req.plan });

    this.push.sendToUser(
      req.provider.userId,
      `¡Plan ${req.plan} aprobado!`,
      `¡Felicidades! Tu plan ${req.plan} ha sido aprobado. Ya disfrutas de todos sus beneficios.`,
      { type: 'PLAN_APROBADO', plan: req.plan },
    );

    return { success: true };
  }

  async rejectPlanRequest(requestId: number, reason?: string) {
    const req = await this.prisma.planRequest.findUnique({
      where: { id: requestId },
      include: { provider: { select: { userId: true, businessName: true, type: true } } },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.status !== 'PENDIENTE') throw new BadRequestException('La solicitud ya fue procesada');

    await this.prisma.planRequest.update({
      where: { id: requestId },
      data: { status: 'RECHAZADO', reason: reason ?? null },
    });

    const msg = reason
      ? `Tu solicitud de plan ${req.plan} fue rechazada. Motivo: ${reason}`
      : `Tu solicitud de plan ${req.plan} fue rechazada.`;

    await this.prisma.adminNotification.create({
      data: {
        providerId:        req.providerId,
        type:              NotificationType.PLAN_RECHAZADO,
        title:             `Solicitud de plan ${req.plan} rechazada`,
        message:           msg,
        isRead:            false,
        targetUserId:      req.provider.userId,
        targetProfileType: req.provider.type,
      },
    });

    this.eventsGateway.emitNotification({
      type:              'PLAN_RECHAZADO',
      title:             'Solicitud rechazada',
      body:              msg,
      targetUserId:      req.provider.userId,
      targetProfileType: req.provider.type,
    });

    this.push.sendToUser(
      req.provider.userId,
      `Solicitud de plan ${req.plan} rechazada`,
      msg,
      { type: 'PLAN_RECHAZADO', plan: req.plan },
    );

    return { success: true };
  }

  // ── REPORTES DE USUARIOS A PROVEEDORES ───────────────────

  async getProviderReports(page = 1, limit = 20, isReviewed?: boolean) {
    const skip  = (page - 1) * limit;
    const where = isReviewed !== undefined ? { isReviewed } : {};

    const [data, total, pendingCount] = await Promise.all([
      this.prisma.providerReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          provider: { select: { id: true, businessName: true, type: true } },
          user:     { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.providerReport.count({ where }),
      this.prisma.providerReport.count({ where: { isReviewed: false } }),
    ]);

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
      pendingCount,
    };
  }

  async markReportReviewed(reportId: number) {
    const report = await this.prisma.providerReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    return this.prisma.providerReport.update({
      where: { id: reportId },
      data:  { isReviewed: true },
    });
  }

  // ── PROBLEMAS DE PLATAFORMA ──────────────────────────────
  async getPlatformIssues(page = 1, limit = 20, isReviewed?: boolean) {
    const where = isReviewed !== undefined ? { isReviewed } : {};
    const skip  = (page - 1) * limit;

    const [data, total, pendingCount] = await Promise.all([
      this.prisma.platformIssue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        },
      }),
      this.prisma.platformIssue.count({ where }),
      this.prisma.platformIssue.count({ where: { isReviewed: false } }),
    ]);

    return { data, total, page, lastPage: Math.ceil(total / limit), pendingCount };
  }

  async markPlatformIssueReviewed(issueId: number) {
    const issue = await this.prisma.platformIssue.findUnique({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Reporte no encontrado');
    return this.prisma.platformIssue.update({ where: { id: issueId }, data: { isReviewed: true } });
  }
}
