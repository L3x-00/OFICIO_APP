import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AvailabilityStatus,
  SubscriptionPlan,
} from '../generated/client/enums.js';
import { Prisma } from '../generated/client/client.js';
import { EventsGateway } from '../events/events.gateway.js';

// Retención de notificaciones: 5 días. Pasado ese plazo se purgan
// automáticamente (cron diario).
const NOTIFICATION_RETENTION_DAYS = 5;

@Injectable()
export class ProviderProfileService {
  private readonly logger = new Logger(ProviderProfileService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  // ── HELPER: obtener proveedor por userId (y opcionalmente por tipo) ──
  private async findProviderByUser(userId: number, type?: string) {
    const where: Prisma.ProviderWhereInput = { userId };
    if (type === 'OFICIO' || type === 'NEGOCIO')
      where.type = type as Prisma.EnumProviderTypeFilter;
    const provider = await this.prisma.provider.findFirst({ where });
    if (!provider)
      throw new NotFoundException('Perfil de proveedor no encontrado');
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
        providerCategories: {
          select: {
            isPrimary: true,
            category: {
              select: { id: true, name: true, slug: true, iconUrl: true },
            },
          },
          orderBy: { isPrimary: 'desc' },
        },
        locality: { select: { id: true, name: true, department: true } },
        images: {
          select: { id: true, url: true, isCover: true },
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
        },
        subscription: { select: { plan: true, status: true, endDate: true } },
        verificationDocs: {
          select: { id: true, docType: true, status: true },
        },
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
          },
        },
        // Conteo de favoritos — el mobile lo lee como `totalFavorites`
        // para mostrarlo en la card "Favoritos" del panel INICIO. Antes
        // ese campo no se calculaba y la card mostraba siempre 0.
        _count: { select: { favorites: true } },
      },
    });

    if (!provider)
      throw new NotFoundException('Perfil de proveedor no encontrado');
    // Aplanamos _count.favorites → totalFavorites para que el JSON
    // tenga la misma forma que el modelo DashboardProfileModel del
    // mobile (`json['totalFavorites']`).
    return {
      ...provider,
      totalFavorites: provider._count?.favorites ?? 0,
    };
  }

  // ── ACTUALIZAR MI PERFIL ─────────────────────────────────
  async updateMyProfile(
    userId: number,
    data: {
      businessName?: string;
      description?: string;
      phone?: string;
      whatsapp?: string;
      address?: string;
      scheduleJson?: Record<string, string>;
      hasHomeService?: boolean; // solo OFICIO
      website?: string | null;
      instagram?: string | null;
      tiktok?: string | null;
      facebook?: string | null;
      linkedin?: string | null;
      twitterX?: string | null;
      telegram?: string | null;
      whatsappBiz?: string | null;
      // Edición de categorías desde el panel del proveedor. El primer
      // id de la lista se marca como `isPrimary: true`. Si no se envía
      // (undefined), las categorías no se tocan.
      categoryIds?: number[];
    },
    type?: string,
  ) {
    const provider = await this.findProviderByUser(userId, type);
    const { categoryIds, ...scalarData } = data;

    // Si vienen categorías, reescribimos la relación M:N entera dentro
    // de una transacción: delete + createMany. El isPrimary va por
    // orden de aparición — el cliente decide cuál es la principal
    // poniéndola primero en el array.
    return this.prisma.$transaction(async (tx) => {
      if (categoryIds !== undefined) {
        if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
          throw new BadRequestException(
            'Debes seleccionar al menos una Especialidad',
          );
        }
        // Dedup defensivo — si el cliente repite, conservamos el
        // primer índice (que marca la principal).
        const unique = Array.from(new Set(categoryIds.map((n) => Number(n))));
        if (unique.some((n) => !Number.isInteger(n) || n <= 0)) {
          throw new BadRequestException('IDs de categoría inválidos');
        }
        // Verificamos que existan + estén activas — evita inflar la
        // tabla con FKs huérfanos por un cliente mal calibrado.
        const found = await tx.category.findMany({
          where: { id: { in: unique }, isActive: true },
          select: { id: true },
        });
        if (found.length !== unique.length) {
          throw new BadRequestException(
            'Una o más categorías no existen o están inactivas',
          );
        }
        await tx.providerCategory.deleteMany({
          where: { providerId: provider.id },
        });
        await tx.providerCategory.createMany({
          data: unique.map((catId, i) => ({
            providerId: provider.id,
            categoryId: catId,
            isPrimary: i === 0,
          })),
        });
      }

      return tx.provider.update({
        where: { id: provider.id },
        data: scalarData,
        include: {
          providerCategories: {
            select: {
              isPrimary: true,
              category: {
                select: { id: true, name: true, slug: true, iconUrl: true },
              },
            },
            orderBy: { isPrimary: 'desc' },
          },
          locality: { select: { id: true, name: true, department: true } },
          images: {
            select: { id: true, url: true, isCover: true },
            orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
          },
          subscription: { select: { plan: true, status: true, endDate: true } },
        },
      });
    });
  }

  // ── CAMBIAR DISPONIBILIDAD ───────────────────────────────
  async setAvailability(
    userId: number,
    availability: AvailabilityStatus,
    type?: string,
  ) {
    const provider = await this.findProviderByUser(userId, type);

    return this.prisma.provider.update({
      where: { id: provider.id },
      data: { availability },
      select: { id: true, availability: true },
    });
  }

  // ── NOTIFICACIONES DEL PROVEEDOR ─────────────────────────

  /**
   * Lookup tolerante — devuelve `null` si el usuario aún no tiene perfil de
   * proveedor. Útil para endpoints que el cliente puede llamar sin haber
   * registrado proveedor (notificaciones, marcado de leídas) sin que la app
   * vea un 404 que rompa la UX.
   */
  private async findProviderByUserOrNull(userId: number) {
    return this.prisma.provider.findFirst({ where: { userId } });
  }

  /// Notificaciones del usuario: las dirigidas directamente a él
  /// (targetUserId) + las de cualquiera de sus perfiles de proveedor.
  /// Antes solo cargaba por providerId → un cliente puro nunca veía
  /// historial y las notifs no sobrevivían al cierre de la app.
  private async _myNotificationsWhere(
    userId: number,
  ): Promise<Prisma.AdminNotificationWhereInput> {
    const providers = await this.prisma.provider.findMany({
      where: { userId },
      select: { id: true },
    });
    const providerIds = providers.map((p) => p.id);
    const or: Prisma.AdminNotificationWhereInput[] = [{ targetUserId: userId }];
    if (providerIds.length > 0) or.push({ providerId: { in: providerIds } });
    return { OR: or };
  }

  async getMyNotifications(userId: number, providerType?: string) {
    const baseWhere = await this._myNotificationsWhere(userId);

    // Filtro estricto por tipo de perfil (OFICIO|NEGOCIO). El home tab
    // del provider pasa `type=OFICIO` o `type=NEGOCIO`. Antes el filtro
    // dejaba pasar `targetProfileType=null` sin condición — eso
    // bleedeaba al otro panel notif legacy/admin que se persistieron
    // sin tipo (APROBADO/RECHAZADO/MAS_INFO/VERIFICACION_REVOCADA
    // viejas) y cruzaba paneles.
    //
    // Regla: una notif pertenece al panel del provider SOLO si
    // `targetProfileType=providerType`. Las verdaderamente cross-cutting
    // (chat, monedas, etc.) NO se vinculan a un provider — tienen
    // `providerId=null AND targetProfileType=null` y pasan también
    // cuando el panel consulta. Sin `type`, devolvemos todo (la pantalla
    // "Alertas" del cliente las muestra todas).
    const where: Prisma.AdminNotificationWhereInput =
      providerType === 'OFICIO' || providerType === 'NEGOCIO'
        ? {
            AND: [
              baseWhere,
              {
                OR: [
                  { targetProfileType: providerType },
                  { AND: [{ targetProfileType: null }, { providerId: null }] },
                ],
              },
            ],
          }
        : baseWhere;

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.adminNotification.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: 50,
      }),
      this.prisma.adminNotification.count({
        where: { ...where, isRead: false },
      }),
    ]);

    return { data: notifications, unreadCount };
  }

  async markNotificationRead(userId: number, notifId: number) {
    const where = await this._myNotificationsWhere(userId);

    // Solo el dueño puede marcarla — la notif es suya o de su proveedor.
    const notif = await this.prisma.adminNotification.findFirst({
      where: { ...where, id: notifId },
    });
    if (!notif) throw new BadRequestException('Notificación no encontrada');

    return this.prisma.adminNotification.update({
      where: { id: notifId },
      data: { isRead: true },
    });
  }

  async markAllNotificationsRead(userId: number) {
    const where = await this._myNotificationsWhere(userId);
    await this.prisma.adminNotification.updateMany({
      where: { ...where, isRead: false },
      data: { isRead: true },
    });
    return { ok: true };
  }

  /**
   * Una vez al día (04:00 UTC) elimina las notificaciones con más de
   * 5 días — leídas o no. Mantiene la bandeja liviana y evita acumular
   * histórico viejo. Afecta tanto el inbox del proveedor como el panel
   * de notificaciones del admin (ambos leen `adminNotification`).
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async pruneOldNotifications() {
    const threshold = new Date(
      Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const result = await this.prisma.adminNotification.deleteMany({
      where: { sentAt: { lt: threshold } },
    });
    if (result.count > 0) {
      this.logger.log(
        `[notif-cleanup] eliminadas ${result.count} notificaciones > ${NOTIFICATION_RETENTION_DAYS} días`,
      );
    }
  }

  // ── IMÁGENES DEL PROVEEDOR ───────────────────────────────

  /**
   * Límite máximo de fotos por plan de suscripción del proveedor.
   * GRATIS=3, ESTANDAR=6, PREMIUM=10.
   */
  private static readonly PHOTO_LIMITS: Record<string, number> = {
    GRATIS: 3,
    ESTANDAR: 6,
    PREMIUM: 10,
  };

  async addImage(userId: number, url: string, isCover = false, type?: string) {
    const provider = await this.findProviderByUser(userId, type);

    const [existingCount, subscription] = await Promise.all([
      this.prisma.providerImage.count({ where: { providerId: provider.id } }),
      this.prisma.subscription.findUnique({
        where: { providerId: provider.id },
        select: { plan: true, status: true },
      }),
    ]);

    // Si la suscripción está inactiva o no existe, aplicamos el límite GRATIS.
    const planKey =
      subscription &&
      ['ACTIVA', 'GRACIA'].includes(subscription.status) &&
      ProviderProfileService.PHOTO_LIMITS[subscription.plan]
        ? subscription.plan
        : 'GRATIS';
    const limit = ProviderProfileService.PHOTO_LIMITS[planKey];

    if (existingCount >= limit) {
      throw new BadRequestException(
        `Máximo ${limit} fotos permitidas en el plan ${planKey}.`,
      );
    }

    // La primera imagen sube automáticamente como portada.
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

    const [whatsappClicks, callClicks, views, recentEvents] = await Promise.all(
      [
        this.prisma.providerAnalytic.count({
          where: {
            providerId: provider.id,
            eventType: 'whatsapp_click',
            createdAt: { gte: since },
          },
        }),
        this.prisma.providerAnalytic.count({
          where: {
            providerId: provider.id,
            eventType: 'call_click',
            createdAt: { gte: since },
          },
        }),
        // Conteo de vistas — antes el panel mostraba 0 porque solo contábamos
        // clicks. Las llamadas a `trackEvent(id, 'view')` desde
        // ProviderDetailSheet quedaban en la tabla pero no se exponían.
        this.prisma.providerAnalytic.count({
          where: {
            providerId: provider.id,
            eventType: 'view',
            createdAt: { gte: since },
          },
        }),
        this.prisma.providerAnalytic.findMany({
          where: { providerId: provider.id, createdAt: { gte: since } },
          select: { eventType: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
      ],
    );

    const byDay: Record<
      string,
      { whatsapp: number; calls: number; views: number }
    > = {};
    for (const event of recentEvents) {
      const day = event.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { whatsapp: 0, calls: 0, views: 0 };
      if (event.eventType === 'whatsapp_click') byDay[day].whatsapp++;
      if (event.eventType === 'call_click') byDay[day].calls++;
      if (event.eventType === 'view') byDay[day].views++;
    }

    return {
      summary: {
        whatsappClicks,
        callClicks,
        views,
        totalClicks: whatsappClicks + callClicks,
      },
      dailyClicks: Object.entries(byDay).map(([date, counts]) => ({
        date,
        ...counts,
      })),
    };
  }

  // ── SOLICITUD DE UPGRADE DE PLAN ─────────────────────────
  async requestPlanUpgrade(userId: number, plan: string, type?: string) {
    const validPlans = ['ESTANDAR', 'PREMIUM'];
    if (!validPlans.includes(plan)) {
      throw new BadRequestException(
        'Solo puedes solicitar plan ESTANDAR o PREMIUM',
      );
    }

    const provider = await this.findProviderByUser(userId, type);

    // No permitir solicitar si ya tiene ese plan
    const sub = await this.prisma.subscription.findUnique({
      where: { providerId: provider.id },
    });
    if (sub?.plan === plan) {
      throw new ConflictException('Ya tienes este plan activo');
    }

    // Bloquear si ya existe una solicitud PENDIENTE (evitar spam de requests)
    const existingPending = await this.prisma.planRequest.findFirst({
      where: { providerId: provider.id, status: 'PENDIENTE' },
    });
    if (existingPending) {
      throw new ConflictException(
        'Ya tienes una solicitud en proceso. Espera a que sea revisada.',
      );
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
        providerId: provider.id,
        type: 'PLAN_SOLICITADO',
        title: `Solicitud de plan ${plan} enviada`,
        message: `Tu solicitud para el plan ${plan} está siendo evaluada por el administrador.`,
        isRead: false,
        targetUserId: userId,
        targetProfileType: provider.type,
      },
    });

    // Notificación en tiempo real al proveedor
    this.events.emitNotification({
      type: 'PLAN_SOLICITADO',
      title: 'Solicitud enviada',
      body: `Tu solicitud para el plan ${plan} está siendo evaluada.`,
      targetUserId: userId,
      targetProfileType: provider.type,
    });

    // Notificación en tiempo real a admins
    this.events.emitNotification({
      type: 'NEW_PLAN_REQUEST',
      title: 'Nueva solicitud de plan',
      body: `${request.provider.businessName} solicitó el plan ${plan}.`,
      targetRole: 'ADMIN',
    });

    return { success: true, requestId: request.id };
  }

  // ── ELIMINAR MI PERFIL EN CASCADA ─────────────────────────
  async deleteMyProfile(userId: number, type?: string) {
    const provider = await this.findProviderByUser(userId, type);
    const pid = provider.id;

    // Cascade en schema.prisma elimina todas las dependencias:
    // providerImage, providerAnalytic, adminNotification, providerReport,
    // subscription (y sus payments), review, favorite, verificationDoc,
    // recommendation, serviceItem, planRequest, trustValidationRequest, offer.
    await this.prisma.provider.delete({ where: { id: pid } });

    // Si ya no quedan perfiles, degradar el rol del usuario a USUARIO (cliente)
    const remaining = await this.prisma.provider.count({ where: { userId } });
    if (remaining === 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: 'USUARIO' },
      });
    }

    // Notificar al admin en tiempo real
    this.events.emitAdminEvent('PROVIDER_DELETED', {
      providerId: pid,
      type: provider.type,
    });

    return { success: true };
  }
}
