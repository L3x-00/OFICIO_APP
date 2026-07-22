import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AvailabilityStatus,
  ProviderType,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../generated/client/enums.js';
import { Prisma } from '../generated/client/client.js';
import { EventsGateway } from '../events/events.gateway.js';
import { MinioService } from '../common/minio.service.js';
import { PushNotificationsService } from '../firebase/push-notifications.service.js';
import { AdminCategoriesService } from './services/admin-categories.service.js';
import { AdminDashboardService } from './services/admin-dashboard.service.js';
import { AdminTrustService } from './services/admin-trust.service.js';
import { AdminPaymentsService } from './services/admin-payments.service.js';
import { AdminReportsService } from './services/admin-reports.service.js';
import { EmailService } from '../email/email.service.js';
import {
  withCategoryAlias as sharedWithCategoryAlias,
  planToPriority as sharedPlanToPriority,
  clearProvidersCache as sharedClearProvidersCache,
} from './services/admin-shared.js';
import { syncCoverageToPlan } from '../coverage/coverage.service.js';
import { assertManagedServiceImageUrls } from '../common/service-image-validation.js';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private minio: MinioService,
    private push: PushNotificationsService,
    private categories: AdminCategoriesService,
    private dashboard: AdminDashboardService,
    private trust: AdminTrustService,
    private payments: AdminPaymentsService,
    private reports: AdminReportsService,
    private email: EmailService,

    @Inject(CACHE_MANAGER) private cacheManager: any,
  ) {}

  /**
   * Inyecta un alias `category: { name }` derivado de la primera entrada en
   * `providerCategories[0].category` para retrocompatibilidad con el frontend
   * admin/web que aún lee `provider.category.name` (modelo singular legado).
   * No altera `providerCategories` — coexisten ambos.
   */

  private withCategoryAlias<
    T extends { providerCategories?: Array<{ category: { name: string } }> },
  >(p: T): T & { category: { name: string } } {
    return sharedWithCategoryAlias(p);
  }

  // ── DASHBOARD / MÉTRICAS / ANALYTICS (Facade → AdminDashboardService) ──
  // Lógica extraída a AdminDashboardService (refactor god object). Métricas,
  // analytics, dashboard stats y mapa de proveedores. El controller no cambia.

  async getDashboardStats() {
    return this.dashboard.getDashboardStats();
  }

  async refreshDashboardStats() {
    return this.dashboard.refreshDashboardStats();
  }

  async getUsersGeoStats() {
    return this.dashboard.getUsersGeoStats();
  }

  async getDashboardMetrics() {
    return this.dashboard.getDashboardMetrics();
  }

  async getGraceProviders() {
    return this.dashboard.getGraceProviders();
  }

  async getExpiringProviders() {
    return this.dashboard.getExpiringProviders();
  }

  async getAnalytics(days = 30) {
    return this.dashboard.getAnalytics(days);
  }

  // ── LISTAR TODOS LOS PROVEEDORES ──────────────────────────
  async getAllProviders(page = 1, limit = 15, search?: string) {
    const skip = (page - 1) * limit;
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
          providerCategories: {
            select: {
              isPrimary: true,
              category: { select: { id: true, name: true, slug: true } },
            },
            orderBy: { isPrimary: 'desc' },
          },
          locality: { select: { name: true } },
          subscription: { select: { plan: true, status: true, endDate: true } },
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              createdAt: true,
            },
          },
          images: true,
          verificationDocs: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.provider.count({ where }),
    ]);

    return {
      data: providers.map((p) => this.withCategoryAlias(p)),
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  // ── OPCIONES PARA FORMULARIOS ─────────────────────────────
  async getFormOptions() {
    const [categories, localities] = await Promise.all([
      this.prisma.category.findMany({
        where: { isActive: true, parentId: null },
        include: {
          children: {
            where: { isActive: true },
            select: { id: true, name: true, slug: true, forType: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.locality.findMany({ where: { isActive: true } }),
    ]);
    return { categories, localities };
  }

  // ── CREAR PROVEEDOR ───────────────────────────────────────
  async createProvider(
    data: {
      email: string;
      firstName: string;
      lastName: string;
      businessName: string;
      phone: string;
      whatsapp?: string;
      description?: string;
      address?: string;
      categoryIds: (number | string)[]; // hasta 3 Especialidades (categorías hijas)
      primaryCategoryId?: number | string; // Especialidad principal (isPrimary)
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
    },
    files: Express.Multer.File[],
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    let parsedSchedule: object | undefined;
    if (data.scheduleJson) {
      try {
        parsedSchedule = JSON.parse(data.scheduleJson);
      } catch {
        /* Invalid JSON keeps the existing default schedule behavior. */
      }
    }
    if (!parsedSchedule) {
      parsedSchedule = {
        lun: '8:00-18:00',
        mar: '8:00-18:00',
        mie: '8:00-18:00',
        jue: '8:00-18:00',
        vie: '8:00-18:00',
        sab: '9:00-13:00',
        dom: 'Cerrado',
      };
    }
    assertManagedServiceImageUrls(this.minio, parsedSchedule);

    const bcrypt = await import('bcrypt');
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const tempPassword = Array.from(
      { length: 8 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');

    // Upload images to R2 before transaction
    const imageUrls: string[] =
      files && files.length > 0
        ? await Promise.all(
            files.map((f) =>
              this.minio.uploadFile(
                f.buffer,
                f.originalname,
                'providers/gallery',
              ),
            ),
          )
        : [];

    // Especialidades: máx 6, una marcada como primaria (isPrimary).
    const catIds = data.categoryIds.slice(0, 6).map(Number);
    const primaryCatId =
      data.primaryCategoryId != null &&
      catIds.includes(Number(data.primaryCategoryId))
        ? Number(data.primaryCategoryId)
        : catIds[0];

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Crear Usuario
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: await bcrypt.hash(tempPassword, 10),
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'PROVEEDOR',
          department: data.department ?? null,
          province: data.province ?? null,
          district: data.district ?? null,
        },
      });

      // 2. Crear Proveedor
      const provider = await tx.provider.create({
        data: {
          userId: user.id,
          businessName: data.businessName,
          phone: data.phone,
          whatsapp: data.whatsapp ?? null,
          description: data.description ?? null,
          address: data.address ?? null,
          localityId: Number(data.localityId),
          type: data.type as any,
          dni: data.dni ?? null,
          ruc: data.ruc ?? null,
          nombreComercial: data.nombreComercial ?? null,
          razonSocial: data.razonSocial ?? null,
          hasDelivery: data.hasDelivery === true || data.hasDelivery === 'true',
          scheduleJson: parsedSchedule as any,
          providerCategories: {
            create: catIds.map((cid) => ({
              categoryId: cid,
              isPrimary: cid === primaryCatId,
            })),
          },
        },
        include: {
          providerCategories: { select: { category: true } },
          locality: true,
        },
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

      // 4. Crear Suscripción de cortesía: ESTANDAR por 1 mes (mismo trato
      // que un proveedor que se registra él mismo y es aprobado luego).
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await tx.subscription.create({
        data: {
          providerId: provider.id,
          plan: 'ESTANDAR',
          status: 'GRACIA',
          endDate,
        },
      });

      return { provider, userId: user.id };
    });

    // Alcance por distritos: default para la cortesía ESTANDAR.
    await syncCoverageToPlan(this.prisma, result.provider.id, 'ESTANDAR');

    return { ...result, tempPassword };
  }

  // ── ACTUALIZAR PROVEEDOR ──────────────────────────────────
  async updateProvider(
    id: number,
    data: {
      businessName?: string;
      phone?: string;
      whatsapp?: string;
      description?: string;
      address?: string;
      isVisible?: boolean;
      isVerified?: boolean;
      availability?: any; // Usa tu enum AvailabilityStatus
      localityId?: number;
      // Redes sociales / contacto extendido
      website?: string;
      instagram?: string;
      tiktok?: string;
      facebook?: string;
      linkedin?: string;
      twitterX?: string;
      telegram?: string;
      whatsappBiz?: string;
      // Toggles de privacidad
      showPhone?: boolean;
      showWhatsapp?: boolean;
      showExactLocation?: boolean;
      // Datos de negocio / identidad
      dni?: string;
      ruc?: string;
      nombreComercial?: string;
      razonSocial?: string;
      hasDelivery?: boolean;
      categoryIds?: (number | string)[]; // Especialidades — reemplaza el set
      primaryCategoryId?: number | string; // Especialidad principal (isPrimary)
    },
  ) {
    const exists = await this.prisma.provider.findUnique({
      where: { id },
      include: { subscription: { select: { plan: true } } },
    });
    if (!exists) throw new NotFoundException('Proveedor no encontrado');

    // categoryIds/primaryCategoryId NO son columnas de Provider — se gestionan
    // aparte sobre la tabla de unión providerCategories.
    const { categoryIds, primaryCategoryId, ...providerData } = data;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Si llegan Especialidades, reemplazamos el set completo.
      // Premium puede hasta 6; el resto, 3.
      if (categoryIds && categoryIds.length > 0) {
        const limit = exists.subscription?.plan === 'PREMIUM' ? 6 : 3;
        const catIds = categoryIds.slice(0, limit).map(Number);
        const primaryCatId =
          primaryCategoryId != null &&
          catIds.includes(Number(primaryCategoryId))
            ? Number(primaryCategoryId)
            : catIds[0];
        await tx.providerCategory.deleteMany({ where: { providerId: id } });
        await tx.providerCategory.createMany({
          data: catIds.map((cid) => ({
            providerId: id,
            categoryId: cid,
            isPrimary: cid === primaryCatId,
          })),
        });
      }

      return tx.provider.update({
        where: { id },
        data: providerData,
        include: {
          providerCategories: {
            select: { isPrimary: true, category: true },
            orderBy: { isPrimary: 'desc' },
          },
          locality: true,
          images: true,
        },
      });
    });

    await this.clearProvidersCache(); // cambio visible en mobile/web de inmediato
    return updated;
  }

  async addProviderImageIfEmpty(id: number, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Selecciona una imagen para el proveedor.');
    }

    const provider = await this.prisma.provider.findUnique({
      where: { id },
      select: {
        id: true,
        images: { take: 1, select: { id: true } },
      },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');
    if (provider.images.length > 0) {
      throw new ConflictException(
        'El proveedor ya tiene una foto. No se permite reemplazarla desde admin.',
      );
    }

    const url = await this.minio.uploadFile(
      file.buffer,
      file.originalname,
      'providers/gallery',
    );

    try {
      const image = await this.prisma.$transaction(async (tx) => {
        // El UPDATE bloquea la fila hasta terminar la transacción. Dos admins
        // no pueden insertar la "primera" foto al mismo tiempo.
        await tx.provider.update({
          where: { id },
          data: { updatedAt: new Date() },
          select: { id: true },
        });

        const existing = await tx.providerImage.findFirst({
          where: { providerId: id },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictException(
            'El proveedor ya tiene una foto. No se permite reemplazarla desde admin.',
          );
        }

        return tx.providerImage.create({
          data: {
            providerId: id,
            url,
            isCover: true,
            order: 0,
          },
        });
      });

      await this.clearProvidersCache();
      return image;
    } catch (error) {
      // Evita objetos huérfanos si el proveedor fue eliminado o si otra
      // carga ganó la carrera después de subir el archivo.
      await this.minio.deleteFile(url);
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundException('Proveedor no encontrado');
      }
      throw error;
    }
  }

  // ── HELPER: plan → prioridad de listado ──────────────────
  private planToPriority(plan: string, status: string): number {
    return sharedPlanToPriority(plan, status);
  }

  // ── CAMBIAR PLAN DE SUSCRIPCIÓN ────────────────────────────
  async updateProviderSubscription(id: number, plan: string) {
    const validPlans = ['GRATIS', 'ESTANDAR', 'PREMIUM'];
    if (!validPlans.includes(plan)) {
      throw new BadRequestException(
        `Plan inválido. Valores permitidos: ${validPlans.join(', ')}`,
      );
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
          plan: plan as SubscriptionPlan,
          status: status as SubscriptionStatus,
          endDate: plan !== 'GRATIS' ? endDate : undefined,
        },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          providerId: id,
          plan: plan as SubscriptionPlan,
          status: status as SubscriptionStatus,
          endDate,
        },
      });
    }

    // Alcance por distritos: siembra default o recorta según el nuevo plan.
    await syncCoverageToPlan(this.prisma, id, plan);

    // Solo notificar si es una promoción real (ESTANDAR o PREMIUM)
    if (plan === 'ESTANDAR' || plan === 'PREMIUM') {
      const planLabel = plan === 'PREMIUM' ? 'Premium' : 'Estándar';
      const title = `¡Has sido promovido al plan ${planLabel}!`;
      const body = `¡Felicidades! El administrador te ha promovido al plan ${planLabel}. Ahora disfrutas de todos sus beneficios.`;

      await this.prisma.adminNotification.create({
        data: {
          providerId: id,
          type: 'PLAN_APROBADO',
          title,
          message: body,
          isRead: false,
          targetUserId: provider.userId,
          targetProfileType: provider.type,
        },
      });

      this.eventsGateway.emitNotification({
        type: 'PLAN_APROBADO',
        title,
        body,
        targetUserId: provider.userId,
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
  // Borrado SELECTIVO por prefijo "providers_*" — ya no usamos flushAll
  // para no purgar caches de otros módulos en el mismo Redis.
  private async clearProvidersCache(): Promise<void> {
    return sharedClearProvidersCache(this.cacheManager);
  }

  // ── VERIFICACIÓN (Facade → AdminTrustService) ────────────
  // Lógica extraída a AdminTrustService (refactor god object).

  async getPendingVerifications() {
    return this.trust.getPendingVerifications();
  }

  async approveVerification(id: number) {
    return this.trust.approveVerification(id);
  }

  async rejectVerification(id: number, reason: string) {
    return this.trust.rejectVerification(id, reason);
  }

  async requestMoreInfo(id: number, reason: string) {
    return this.trust.requestMoreInfo(id, reason);
  }

  async revokeVerification(id: number, reason?: string) {
    return this.trust.revokeVerification(id, reason);
  }

  // ── GESTIÓN DE USUARIOS ───────────────────────────────────

  async getUsers(
    page = 1,
    limit = 20,
    search?: string,
    role?: string,
    isActive?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ── Filtro estricto por relación con la tabla `providers` ───────
    // Antes este endpoint hacía `where.role = role`, lo que producía
    // mezcla: un user role=USUARIO con un provider activo (caso edge
    // post-migración) salía en "Usuarios" pero también en algunas
    // listas como proveedor. Ahora:
    //
    //   • USUARIO   → SIN registro en providers (cliente puro).
    //   • PROVEEDOR → CON al menos un registro en providers.
    //   • DUAL/BOTH → role=PROVEEDOR Y al menos un registro en providers.
    //   • ADMIN/SUPERADMIN → respeta `user.role` legacy.
    //
    // Para el resto (sin `role` o role desconocido), no filtramos —
    // devuelve todo.
    const normalizedRole = role?.toUpperCase();
    if (normalizedRole === 'DUAL' || normalizedRole === 'BOTH') {
      where.role = 'PROVEEDOR';
      where.providers = { some: {} };
    } else if (normalizedRole === 'PROVEEDOR') {
      where.providers = { some: {} };
    } else if (normalizedRole === 'USUARIO') {
      where.providers = { none: {} };
    } else if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPERADMIN') {
      where.role = normalizedRole as Prisma.EnumUserRoleFilter;
    }

    if (isActive !== undefined) where.isActive = isActive;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          providers: {
            select: {
              id: true,
              businessName: true,
              type: true,
              verificationStatus: true,
              isVerified: true,
              phone: true,
              whatsapp: true,
              address: true,
              locality: {
                select: {
                  name: true,
                  department: true,
                  province: true,
                  district: true,
                },
              },
              providerCategories: {
                select: {
                  isPrimary: true,
                  category: { select: { id: true, name: true, slug: true } },
                },
                orderBy: { isPrimary: 'desc' },
              },
              // Redes sociales — el modal de detalle del admin las
              // muestra cuando inspecciona un user con perfil.
              website: true,
              instagram: true,
              tiktok: true,
              facebook: true,
              linkedin: true,
              twitterX: true,
              telegram: true,
              whatsappBiz: true,
            },
            take: 1,
          },
          _count: { select: { reviews: true, favorites: true } },
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

  async deleteUser(id: number, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === 'ADMIN')
      throw new BadRequestException('No se puede eliminar un administrador');

    // Notificación ANTES del delete — después la sala WS user_{id} ya
    // no existe y el mobile no recibe nada. El listener del cliente
    // captura USER_DELETED y dispara logout + dialog explicativo.
    const reasonText = reason?.trim() || 'Decisión del administrador.';
    const title = 'Tu cuenta ha sido eliminada';
    const body = `Tu cuenta fue eliminada por el administrador. Motivo: ${reasonText}`;

    this.eventsGateway.emitNotification({
      type: 'USER_DELETED',
      title,
      body,
      targetUserId: id,
    });
    void this.push
      .sendToUser(id, title, body, { type: 'USER_DELETED', reason: reasonText })
      .catch(() => {});

    // Cascade en schema.prisma elimina: providers (con todas sus dependencias),
    // reviews, reviewReplies, providerReports, platformIssues, refreshTokens,
    // otpCodes, recommendations, serviceRequests, userPenalty, favorites.
    await this.prisma.user.delete({ where: { id } });

    return { success: true, message: 'Usuario eliminado correctamente' };
  }

  async updateUserStatus(id: number, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === 'ADMIN')
      throw new BadRequestException(
        'No se puede modificar el estado de un administrador',
      );

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: { isActive },
        select: { id: true, email: true, isActive: true, role: true },
      });

      if (!isActive) {
        await tx.refreshToken.deleteMany({ where: { userId: id } });
      }

      return result;
    });

    // Notificar en tiempo real al dispositivo del usuario para forzar cierre de sesión
    if (!isActive) {
      this.eventsGateway.emitUserDeactivated(id);
    }

    return updated;
  }

  // ── NOTIFICACIONES ────────────────────────────────────────

  /**
   * Filtro de notificaciones del scope del admin:
   *   • Cualquier notif vinculada a un provider (aprobaciones, planes,
   *     verificaciones, etc.) — `providerId IS NOT NULL`.
   *   • Logs de broadcasts masivos enviados por el admin —
   *     `type = 'BROADCAST_LOG'`, sin providerId.
   *
   * EXCLUYE notif personales de usuarios-cliente (chat, referidos,
   * ofertas con `providerId=null AND type != 'BROADCAST_LOG'`) — esas
   * son del inbox del usuario, no del panel admin.
   */
  private static readonly ADMIN_NOTIF_WHERE: Prisma.AdminNotificationWhereInput =
    {
      OR: [
        { providerId: { not: null } },
        // Tipos del sistema dirigidos al admin que NO llevan providerId.
        // NEW_USER_VERIFIED / USER_PENDING son eventos de USUARIO (sin
        // proveedor) que antes solo se veían en el feed realtime y NO se
        // guardaban — ahora se persisten y aparecen en el historial.
        {
          type: {
            in: [
              'BROADCAST_LOG',
              'REFERRAL_CODE_USED',
              'NEW_USER_VERIFIED',
              'USER_PENDING',
            ],
          },
        },
      ],
    };

  async getNotifications(page = 1, limit = 20, from?: Date, to?: Date) {
    if (from && to && from > to) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la fecha final',
      );
    }
    const skip = (page - 1) * limit;
    const where: Prisma.AdminNotificationWhereInput = {
      ...AdminService.ADMIN_NOTIF_WHERE,
      ...(from || to
        ? {
            sentAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.adminNotification.findMany({
        where,
        skip,
        take: limit,
        include: {
          provider: {
            select: {
              businessName: true,
              type: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.adminNotification.count({ where }),
      this.prisma.adminNotification.count({
        where: { ...where, isRead: false },
      }),
    ]);

    return {
      data: notifications,
      total,
      page,
      lastPage: Math.ceil(total / limit),
      unreadCount,
    };
  }

  async markNotificationRead(id: number) {
    // Mismo scope que getNotifications/markAll: sin él, un admin podía
    // marcar leída por id una notificación PERSONAL de un usuario
    // (updateMany + filtro en lugar de update por unique).
    const result = await this.prisma.adminNotification.updateMany({
      where: { id, ...AdminService.ADMIN_NOTIF_WHERE },
      data: { isRead: true },
    });
    return { updated: result.count };
  }

  async markAllNotificationsRead() {
    // Antes el `updateMany` corría con `where: { isRead: false }` sin
    // scope → marcaba leídas también las notif personales de
    // usuarios-cliente (chat, broadcasts recibidos). Acotamos al
    // mismo filtro que `getNotifications` para que el "Marcar todo
    // como leído" del panel admin afecte SOLO al inbox del admin.
    const result = await this.prisma.adminNotification.updateMany({
      where: { ...AdminService.ADMIN_NOTIF_WHERE, isRead: false },
      data: { isRead: true },
    });
    return { success: true, updated: result.count };
  }

  // ── REPORTES ──────────────────────────────────────────────

  // Reportes / rankings → AdminReportsService (refactor god object).
  async getReports() {
    return this.reports.getReports();
  }

  // Exportaciones CSV → AdminReportsService.
  async exportUsersCSV(): Promise<string> {
    return this.reports.exportUsersCSV();
  }

  async exportProvidersCSV(): Promise<string> {
    return this.reports.exportProvidersCSV();
  }

  // ── CRUD DE CATEGORÍAS (Facade → AdminCategoriesService) ──
  // La lógica vive en AdminCategoriesService (hito M1: primera pieza
  // extraída del god object). AdminService delega para no romper el
  // controller ni los consumidores existentes.

  async getCategories() {
    return this.categories.getCategories();
  }

  async createCategory(data: {
    name: string;
    slug: string;
    iconUrl?: string;
    parentId?: number;
    isActive?: boolean;
  }) {
    return this.categories.createCategory(data);
  }

  async updateCategory(
    id: number,
    data: {
      name?: string;
      slug?: string;
      iconUrl?: string;
      parentId?: number | null;
      forType?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.categories.updateCategory(id, data);
  }

  async toggleCategoryActive(id: number) {
    return this.categories.toggleCategoryActive(id);
  }

  async deleteCategory(id: number) {
    return this.categories.deleteCategory(id);
  }

  // ── ELIMINAR PROVEEDOR ────────────────────────────────────
  //
  // `reason` es el motivo que el admin escribió — viaja en el
  // push/socket al user para que sepa por qué le borraron el panel.
  // El cascade del schema elimina TODAS las dependencias (incluyendo
  // adminNotification — el cliente al re-registrar ya no verá la
  // notif vieja de "felicidades, panel aprobado").
  async deleteProvider(id: number, reason?: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      select: { id: true, userId: true, type: true, businessName: true },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    // Cascade en schema.prisma elimina: providerImage, providerAnalytic,
    // adminNotification, providerReport, subscription (y sus payments),
    // review, favorite, verificationDoc, recommendation, serviceItem,
    // planRequest, trustValidationRequest, offer.
    await this.prisma.provider.delete({ where: { id } });

    // Notificar al admin panel para que actualice listado.
    this.eventsGateway.emitAdminEvent('PROVIDER_DELETED', {
      providerId: id,
      businessName: provider.businessName,
      type: provider.type,
    });

    // Notificar al user en TIEMPO REAL via socket. El cliente Flutter
    // dispara _syncProviderStatus, cierra el panel si estaba abierto,
    // muestra un dialog con el motivo y refresca el botón "Ir a mi
    // panel" → "Quiero ser parte" en home.
    const reasonText = reason?.trim() || 'Decisión del administrador.';
    const title = 'Tu perfil ha sido eliminado';
    const body =
      `Tu perfil ${provider.type === 'NEGOCIO' ? 'de negocio' : 'profesional'} ` +
      `"${provider.businessName}" fue eliminado. Motivo: ${reasonText}`;

    this.eventsGateway.emitNotification({
      type: 'PROVIDER_DELETED',
      title,
      body,
      targetUserId: provider.userId,
      targetProfileType: provider.type,
    });

    // Push notif (cubre app en background/terminated).
    this.push.sendToUser(provider.userId, title, body, {
      type: 'PROVIDER_DELETED',
      providerType: provider.type,
      reason: reasonText,
    });

    return { success: true, message: 'Proveedor eliminado correctamente' };
  }

  // ── SOLICITUDES DE PLAN / PAGOS YAPE (Facade → AdminPaymentsService) ──
  // Lógica extraída a AdminPaymentsService (refactor god object).

  async getPlanRequests(status?: string) {
    return this.payments.getPlanRequests(status);
  }

  async approvePlanRequest(requestId: number) {
    return this.payments.approvePlanRequest(requestId);
  }

  async rejectPlanRequest(requestId: number, reason?: string) {
    return this.payments.rejectPlanRequest(requestId, reason);
  }

  // ── REPORTES / PROBLEMAS (Facade → AdminReportsService) ───
  async getProviderReports(page = 1, limit = 20, isReviewed?: boolean) {
    return this.reports.getProviderReports(page, limit, isReviewed);
  }

  async markReportReviewed(reportId: number) {
    return this.reports.markReportReviewed(reportId);
  }

  async getPlatformIssues(page = 1, limit = 20, isReviewed?: boolean) {
    return this.reports.getPlatformIssues(page, limit, isReviewed);
  }

  async markPlatformIssueReviewed(issueId: number) {
    return this.reports.markPlatformIssueReviewed(issueId);
  }

  // ── BROADCAST DE NOTIFICACIONES PUSH ──────────────────────
  //
  // Envía una push a TODOS los usuarios activos con FCM token. Modo
  // fire-and-forget: el endpoint responde con `enqueued` (cantidad de
  // tokens encolados) y el envío real corre en background.
  //
  // `imageUrl` es opcional — si está, el banner nativo de Android/iOS
  // muestra la imagen como cabecera. El cliente la recibe también en
  // `data.imageUrl` por si quiere usarla en una alerta in-app.
  async broadcastNotification(
    title: string,
    message: string,
    imageUrl?: string,
  ): Promise<{ enqueued: number }> {
    if (!title?.trim()) {
      throw new BadRequestException('El título es obligatorio');
    }
    if (!message?.trim()) {
      throw new BadRequestException('El mensaje es obligatorio');
    }
    const cleanTitle = title.trim();
    const cleanBody = message.trim();
    const cleanImage = imageUrl?.trim()
      ? this.minio.assertManagedImageUrl(imageUrl, ['admin/broadcasts'])
      : null;

    const result = await this.push.broadcast({
      title: cleanTitle,
      body: cleanBody,
      imageUrl: cleanImage,
      data: { type: 'BROADCAST' },
    });

    // Además del push, el mismo mensaje por EMAIL a todos los usuarios activos
    // (Brevo). En background — no bloquea la respuesta al admin (que ya tiene
    // `enqueued`); el envío masivo puede tardar.
    void this.prisma.user
      .findMany({
        where: { isActive: true, deletedAt: null },
        select: { email: true },
      })
      .then((users) =>
        this.email.sendBroadcastEmail(
          users.map((u) => u.email).filter((e): e is string => !!e),
          cleanTitle,
          cleanBody,
          cleanImage ?? undefined,
        ),
      )
      .catch(() => null);

    // Persistir un log del broadcast para que aparezca en el panel del
    // admin como "Enviaste una notificación a todos los usuarios: …".
    // type = 'BROADCAST_LOG' (distinto del 'BROADCAST' que llega a los
    // dispositivos), providerId NULL, targetUserId NULL → ADMIN scope.
    // Fire-and-forget — si falla solo se pierde el log, no rompemos
    // la respuesta al admin que ya recibió `enqueued`.
    this.prisma.adminNotification
      .create({
        data: {
          providerId: null,
          targetUserId: null,
          type: 'BROADCAST_LOG',
          title: `Enviaste una notificación a todos los usuarios: ${cleanTitle}`,
          message: cleanBody,
          isRead: false,
        },
      })
      .catch(() => null);

    return result;
  }

  // ── NOTIFICACIÓN A UN PROVEEDOR (drill-down del dashboard) ──
  //
  // Envía una notificación a UN proveedor concreto desde el panel
  // (p. ej. "recordatorio de vencimiento" sobre un proveedor por vencer).
  // Funciona EXACTAMENTE como el broadcast pero 1:1:
  //   • emitNotification con targetUserId → realtime al socket del usuario
  //     Y persistido en su inbox (emitNotification persiste si hay
  //     targetUserId y el type no está en _skipPersist).
  //   • push.sendToUser → cubre la app en background/terminated (FCM).
  async notifyProvider(
    providerId: number,
    title: string,
    message: string,
    kind: 'EXPIRY_REMINDER' | 'ADMIN_MESSAGE' = 'ADMIN_MESSAGE',
  ): Promise<{ success: true; providerId: number; userId: number }> {
    const cleanTitle = title?.trim();
    const cleanBody = message?.trim();
    if (!cleanTitle) throw new BadRequestException('El título es obligatorio');
    if (!cleanBody) throw new BadRequestException('El mensaje es obligatorio');

    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true, userId: true, businessName: true, type: true },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    const type =
      kind === 'EXPIRY_REMINDER' ? 'EXPIRY_REMINDER' : 'ADMIN_MESSAGE';

    // Realtime + persistencia en el inbox del proveedor.
    this.eventsGateway.emitNotification({
      type,
      title: cleanTitle,
      body: cleanBody,
      targetUserId: provider.userId,
      targetProfileType: provider.type,
    });

    // Push (app en background/terminated).
    this.push.sendToUser(provider.userId, cleanTitle, cleanBody, { type });

    return { success: true, providerId: provider.id, userId: provider.userId };
  }

  // ── CORREO MASIVO (solo email, segmentable) ───────────────
  //
  // A diferencia del broadcast push, esto envía ÚNICAMENTE correo (Brevo) y
  // permite segmentar la audiencia. Resuelve los destinatarios por rol, lanza
  // el envío en background (puede tardar con listas grandes) y devuelve
  // `{ recipients }` al instante para que el panel no espere el envío 1:1.
  async broadcastEmail(
    subject: string,
    message: string,
    audience: 'ALL' | 'CLIENTS' | 'PROVIDERS' = 'ALL',
    imageUrl?: string,
  ): Promise<{ recipients: number }> {
    if (!subject?.trim()) {
      throw new BadRequestException('El asunto es obligatorio');
    }
    if (!message?.trim()) {
      throw new BadRequestException('El mensaje es obligatorio');
    }
    const cleanSubject = subject.trim();
    const cleanBody = message.trim();
    const cleanImage = imageUrl?.trim()
      ? this.minio.assertManagedImageUrl(imageUrl, ['admin/broadcasts'])
      : undefined;

    // Segmentación por rol. Nunca incluimos ADMIN en correos promocionales.
    const roleFilter: Prisma.UserWhereInput =
      audience === 'CLIENTS'
        ? { role: 'USUARIO' }
        : audience === 'PROVIDERS'
          ? { role: 'PROVEEDOR' }
          : { role: { in: ['USUARIO', 'PROVEEDOR'] } };

    const users = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null, ...roleFilter },
      select: { email: true },
    });
    const recipients = users
      .map((u) => u.email)
      .filter((e): e is string => !!e);

    // Envío en background (best-effort) — no bloquea la respuesta al admin.
    void this.email
      .sendBroadcastEmail(recipients, cleanSubject, cleanBody, cleanImage)
      .catch(() => null);

    // Log para el panel del admin (reusa BROADCAST_LOG; el título distingue
    // que fue un correo). Fire-and-forget.
    const audienceLabel =
      audience === 'CLIENTS'
        ? 'los clientes'
        : audience === 'PROVIDERS'
          ? 'los proveedores'
          : 'todos los usuarios';
    this.prisma.adminNotification
      .create({
        data: {
          providerId: null,
          targetUserId: null,
          type: 'BROADCAST_LOG',
          title: `Enviaste un correo a ${audienceLabel}: ${cleanSubject}`,
          message: cleanBody,
          isRead: false,
        },
      })
      .catch(() => null);

    return { recipients: recipients.length };
  }
}
