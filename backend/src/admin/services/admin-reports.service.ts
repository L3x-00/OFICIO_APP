import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { withCategoryAlias } from './admin-shared.js';

/**
 * Reportes y analítica de moderación del panel admin: rankings/estadísticas
 * (`getReports`), reportes de usuarios a proveedores y problemas de
 * plataforma. Extraído del god object AdminService — AdminService delega aquí
 * vía Facade; el controller no cambia. Cero cambios funcionales.
 */
@Injectable()
export class AdminReportsService {
  constructor(private prisma: PrismaService) {}

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
          id: true,
          businessName: true,
          averageRating: true,
          totalReviews: true,
          providerCategories: {
            select: { category: { select: { name: true } } },
          },
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
          id: true,
          businessName: true,
          totalReviews: true,
          averageRating: true,
          providerCategories: {
            select: { category: { select: { name: true } } },
          },
        },
        orderBy: { totalReviews: 'desc' },
        take: 10,
      }),

      // Usuarios más activos (más reseñas)
      this.prisma.user.findMany({
        where: { role: 'USUARIO' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
          _count: { select: { reviews: true, favorites: true } },
        },
        orderBy: { reviews: { _count: 'desc' } },
        take: 10,
      }),

      // Categorías populares
      this.prisma.category.findMany({
        where: { isActive: true, parentId: null },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { providerCategories: true } },
        },
        orderBy: { providerCategories: { _count: 'desc' } },
        take: 10,
      }),

      // Registros por mes (últimos 6 meses)
      this.prisma.$queryRaw<
        { month: string; users: number; providers: number }[]
      >`
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
      topRatedProviders: topRatedProviders.map((p) => withCategoryAlias(p)),
      mostReviewedProviders: mostReviewedProviders.map((p) =>
        withCategoryAlias(p),
      ),
      mostActiveUsers,
      popularCategories,
      recentRegistrations,
      verificationStats: verificationStats.map((v) => ({
        status: v.verificationStatus,
        count: v._count.verificationStatus,
      })),
    };
  }

  // ── REPORTES DE USUARIOS A PROVEEDORES ───────────────────

  async getProviderReports(page = 1, limit = 20, isReviewed?: boolean) {
    const skip = (page - 1) * limit;
    const where = isReviewed !== undefined ? { isReviewed } : {};

    const [data, total, pendingCount] = await Promise.all([
      this.prisma.providerReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          provider: { select: { id: true, businessName: true, type: true } },
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
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
    const report = await this.prisma.providerReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    return this.prisma.providerReport.update({
      where: { id: reportId },
      data: { isReviewed: true },
    });
  }

  // ── PROBLEMAS DE PLATAFORMA ──────────────────────────────
  async getPlatformIssues(page = 1, limit = 20, isReviewed?: boolean) {
    const where = isReviewed !== undefined ? { isReviewed } : {};
    const skip = (page - 1) * limit;

    const [data, total, pendingCount] = await Promise.all([
      this.prisma.platformIssue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.platformIssue.count({ where }),
      this.prisma.platformIssue.count({ where: { isReviewed: false } }),
    ]);

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
      pendingCount,
    };
  }

  async markPlatformIssueReviewed(issueId: number) {
    const issue = await this.prisma.platformIssue.findUnique({
      where: { id: issueId },
    });
    if (!issue) throw new NotFoundException('Reporte no encontrado');
    return this.prisma.platformIssue.update({
      where: { id: issueId },
      data: { isReviewed: true },
    });
  }

  // ── EXPORTACIONES CSV ─────────────────────────────────────
  async exportUsersCSV(): Promise<string> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        providers: {
          select: { businessName: true, verificationStatus: true },
          take: 1,
        },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'ID',
      'Nombre',
      'Apellido',
      'Email',
      'Rol',
      'Activo',
      'Fecha Registro',
      'Negocio',
      'Verificación',
      'Reseñas',
    ].join(',');
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
        user: { select: { email: true, firstName: true, lastName: true } },
        providerCategories: {
          select: { category: { select: { name: true } } },
        },
        locality: { select: { name: true } },
        subscription: { select: { plan: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'ID',
      'Negocio',
      'Email',
      'Nombre',
      'Teléfono',
      'Categoría',
      'Localidad',
      'Calificación',
      'Reseñas',
      'Verificado',
      'Estado',
      'Plan',
      'Suscripción',
    ].join(',');
    const rows = providers.map((p) =>
      [
        p.id,
        `"${p.businessName}"`,
        `"${p.user.email}"`,
        `"${p.user.firstName} ${p.user.lastName}"`,
        `"${p.phone}"`,
        `"${p.providerCategories.map((pc) => pc.category.name).join('; ')}"`,
        `"${p.locality.name}"`,
        p.averageRating.toFixed(2),
        p.totalReviews,
        p.isVerified ? 'Sí' : 'No',
        p.verificationStatus,
        p.subscription?.plan ?? '',
        p.subscription?.status ?? '',
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }
}
