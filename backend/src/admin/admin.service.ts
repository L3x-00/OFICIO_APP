import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AvailabilityStatus } from '../generated/client/enums.js';

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
      availability?: AvailabilityStatus;
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

  // ── VERIFICACIÓN ──────────────────────────────────────────

  async getPendingVerifications() {
    return this.prisma.provider.findMany({
      where: { verificationStatus: 'PENDIENTE' },
      include: {
        user:     { select: { email: true, firstName: true, lastName: true, createdAt: true } },
        category: { select: { name: true } },
        locality: { select: { name: true } },
        verificationDocs: true,
        images: { where: { isCover: true }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveVerification(id: number) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    const [updated] = await Promise.all([
      this.prisma.provider.update({
        where: { id },
        data: { isVerified: true, verificationStatus: 'APROBADO' },
      }),
      this.prisma.adminNotification.create({
        data: {
          providerId: id,
          type: 'APROBADO',
          message: '¡Felicidades! Tu perfil ha sido verificado y aprobado. Tu insignia de verificación ya está activa.',
        },
      }),
    ]);

    return updated;
  }

  async rejectVerification(id: number, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('El motivo de rechazo es obligatorio');

    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    const [updated] = await Promise.all([
      this.prisma.provider.update({
        where: { id },
        data: { isVerified: false, verificationStatus: 'RECHAZADO' },
      }),
      this.prisma.adminNotification.create({
        data: {
          providerId: id,
          type: 'RECHAZADO',
          message: `Tu solicitud de verificación fue rechazada. Motivo: ${reason}`,
        },
      }),
    ]);

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
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role)             where.role     = role;
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
          provider:  { select: { id: true, businessName: true, verificationStatus: true, isVerified: true } },
          _count:    { select: { reviews: true, favorites: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, lastPage: Math.ceil(total / limit) };
  }

  async deleteUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { provider: { include: { subscription: true } } },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === 'ADMIN') throw new BadRequestException('No se puede eliminar un administrador');

    await this.prisma.$transaction(async (tx) => {
      if (user.provider) {
        const providerId = user.provider.id;
        await tx.providerAnalytic.deleteMany({ where: { providerId } });
        await tx.review.deleteMany({ where: { providerId } });
        await tx.favorite.deleteMany({ where: { providerId } });
        await tx.providerImage.deleteMany({ where: { providerId } });
        await tx.verificationDoc.deleteMany({ where: { providerId } });
        await tx.adminNotification.deleteMany({ where: { providerId } });

        if (user.provider.subscription) {
          await tx.payment.deleteMany({ where: { subscriptionId: user.provider.subscription.id } });
          await tx.subscription.delete({ where: { providerId } });
        }

        await tx.provider.delete({ where: { id: providerId } });
      }

      await tx.review.deleteMany({ where: { userId: id } });
      await tx.favorite.deleteMany({ where: { userId: id } });
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    return { success: true, message: 'Usuario eliminado correctamente' };
  }

  async updateUserStatus(id: number, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === 'ADMIN') throw new BadRequestException('No se puede modificar el estado de un administrador');

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, isActive: true, role: true },
    });
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
        provider: { select: { businessName: true, verificationStatus: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = ['ID', 'Nombre', 'Apellido', 'Email', 'Rol', 'Activo', 'Fecha Registro', 'Negocio', 'Verificación', 'Reseñas'].join(',');
    const rows = users.map((u) => [
      u.id,
      `"${u.firstName}"`,
      `"${u.lastName}"`,
      `"${u.email}"`,
      u.role,
      u.isActive ? 'Sí' : 'No',
      u.createdAt.toISOString().split('T')[0],
      u.provider ? `"${u.provider.businessName}"` : '',
      u.provider?.verificationStatus ?? '',
      u._count.reviews,
    ].join(','));

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
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: { subscription: true },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    await this.prisma.$transaction(async (tx) => {
      await tx.providerAnalytic.deleteMany({ where: { providerId: id } });
      await tx.review.deleteMany({ where: { providerId: id } });
      await tx.favorite.deleteMany({ where: { providerId: id } });
      await tx.providerImage.deleteMany({ where: { providerId: id } });
      await tx.verificationDoc.deleteMany({ where: { providerId: id } });
      await tx.adminNotification.deleteMany({ where: { providerId: id } });

      if (provider.subscription) {
        await tx.payment.deleteMany({
          where: { subscriptionId: provider.subscription.id },
        });
        await tx.subscription.delete({ where: { providerId: id } });
      }

      await tx.provider.delete({ where: { id } });
      await tx.user.delete({ where: { id: provider.userId } });
    });

    return { success: true, message: 'Proveedor eliminado correctamente' };
  }
}
