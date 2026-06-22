import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { withCategoryAlias } from './admin-shared.js';

/**
 * Métricas, analytics, dashboard stats y mapa de proveedores del panel
 * admin. Extraído del god object AdminService — AdminService delega aquí
 * vía Facade; el controller no cambia.
 *
 * Todo es lectura (read-only) salvo el refresh manual de la materialized
 * view; por eso no invalida caché de proveedores.
 */
@Injectable()
export class AdminDashboardService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: any,
  ) {}

  // ── DASHBOARD STATS (materialized view) ──────────────────
  // Lee admin_dashboard_stats (migración 20260517170000_optimizations_part5).
  // Una sola fila precomputada con counts/sumas; los aggregates ad-hoc
  // del dashboard antiguo eran ~10 queries cada vez.
  async getDashboardStats() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM admin_dashboard_stats
    `;
    return rows[0] ?? null;
  }

  // Refresca la MV. CONCURRENTLY no bloquea lecturas — el dashboard
  // sigue respondiendo con datos viejos mientras el refresh corre.
  async refreshDashboardStats() {
    await this.prisma.$executeRaw`SELECT refresh_admin_dashboard_stats()`;
    return { success: true, refreshedAt: new Date().toISOString() };
  }

  // ── GEO-STATS: mapa de calor de usuarios por ciudad ───────
  //
  // Lee users.lastIp + users.lastLoginAt, resuelve geolocalización
  // contra ip-api.com (batch HTTP, gratis, sin API key) y devuelve
  // agregado por (city, department).
  //
  // Cache: 1h por endpoint completo (admins consultan rara vez).
  // El batch de ip-api permite hasta 100 IPs por request y 45 req/min
  // por IP origen — con el cache un dashboard activo no excede eso.

  private static readonly GEO_CACHE_KEY = 'admin:users-geo-stats';
  private static readonly GEO_CACHE_TTL = 60 * 60; // segundos

  /**
   * Centroides aproximados de cada departamento del Perú (lat, lng).
   * Permiten dibujar un mapa real (Leaflet) en el admin sin agregar
   * lat/lng al esquema de Locality — la fuente de verdad para la
   * agregación sigue siendo `locality.department`.
   */
  private static readonly PERU_DEPT_CENTROIDS: Record<
    string,
    { lat: number; lng: number }
  > = {
    Amazonas: { lat: -5.05, lng: -78.0 },
    Áncash: { lat: -9.53, lng: -77.53 },
    Ancash: { lat: -9.53, lng: -77.53 },
    Apurímac: { lat: -14.0639, lng: -73.0 },
    Apurimac: { lat: -14.0639, lng: -73.0 },
    Arequipa: { lat: -16.409, lng: -71.5375 },
    Ayacucho: { lat: -13.1588, lng: -74.2236 },
    Cajamarca: { lat: -7.1611, lng: -78.5128 },
    Callao: { lat: -12.056, lng: -77.118 },
    Cusco: { lat: -13.532, lng: -71.9675 },
    Cuzco: { lat: -13.532, lng: -71.9675 },
    Huancavelica: { lat: -12.7869, lng: -74.975 },
    Huánuco: { lat: -9.9306, lng: -76.2422 },
    Huanuco: { lat: -9.9306, lng: -76.2422 },
    Ica: { lat: -14.0678, lng: -75.7286 },
    Junín: { lat: -12.0651, lng: -75.2049 },
    Junin: { lat: -12.0651, lng: -75.2049 },
    'La Libertad': { lat: -8.109, lng: -79.0215 },
    Lambayeque: { lat: -6.7011, lng: -79.9061 },
    Lima: { lat: -12.0464, lng: -77.0428 },
    Loreto: { lat: -3.7437, lng: -73.2516 },
    'Madre de Dios': { lat: -12.5933, lng: -69.1899 },
    Moquegua: { lat: -17.1939, lng: -70.935 },
    Pasco: { lat: -10.6828, lng: -76.2566 },
    Piura: { lat: -5.1945, lng: -80.6328 },
    Puno: { lat: -15.8402, lng: -70.0219 },
    'San Martín': { lat: -6.4831, lng: -76.3719 },
    'San Martin': { lat: -6.4831, lng: -76.3719 },
    Tacna: { lat: -18.0066, lng: -70.2463 },
    Tumbes: { lat: -3.5667, lng: -80.4515 },
    Ucayali: { lat: -8.3829, lng: -74.5539 },
  };

  /**
   * Mapa de proveedores por departamento del Perú.
   *
   * Antes este endpoint resolvía `users.lastIp` contra ip-api.com,
   * pero la mayoría de logins son sociales (sin `lastIp`) → el mapa
   * salía vacío. Ahora agrupamos los **proveedores registrados** por
   * `locality.department` (la ubicación que ellos mismos declaran en
   * onboarding). Es la métrica que el admin necesita ver.
   *
   * Devuelve además `lat/lng` del centroide del departamento para que
   * el frontend pueda pintar marcadores en un mapa real.
   */
  async getUsersGeoStats() {
    const cached = await this.cacheManager.get(
      AdminDashboardService.GEO_CACHE_KEY,
    );
    if (cached) return cached;

    const rows = await this.prisma.$queryRaw<
      Array<{ department: string; provider_count: number; last_created: Date }>
    >`
      SELECT l."department"        AS department,
             count(p.id)::int      AS provider_count,
             max(p."createdAt")    AS last_created
      FROM providers p
      INNER JOIN localities l ON l.id = p."localityId"
      WHERE l."department" IS NOT NULL AND l."department" <> ''
      GROUP BY l."department"
      ORDER BY provider_count DESC
    `;

    const result = rows.map((r) => {
      const centroid = AdminDashboardService.PERU_DEPT_CENTROIDS[
        r.department
      ] ?? {
        lat: -9.19,
        lng: -75.0152,
      }; // fallback: centro del Perú
      const last =
        r.last_created instanceof Date
          ? r.last_created
          : new Date(r.last_created);
      return {
        // Mantenemos `city`/`country` por retrocompat con el shape que el
        // frontend ya consume (UserGeoStatsRow). `city = department`
        // porque la agregación es a nivel departamento.
        city: r.department,
        department: r.department,
        country: 'Perú',
        userCount: Number(r.provider_count),
        lastAccess: last.toISOString(),
        lat: centroid.lat,
        lng: centroid.lng,
      };
    });

    // Cache 1h (la migración de proveedores es lenta — los datos no
    // cambian rápido).
    await this.cacheManager.set(
      AdminDashboardService.GEO_CACHE_KEY,
      result,
      AdminDashboardService.GEO_CACHE_TTL * 1000,
    );
    return result;
  }

  // ── MÉTRICAS ─────────────────────────────────────────────
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
      pendingVerifications,
      whatsappClicks,
      callClicks,
      totalActiveUsers,
      totalProviderUsers,
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
      // `totalUsers` = TODOS los registros en `users` (incluyendo
      // PROVEEDOR y ADMIN). Antes excluía role=PROVEEDOR — un user que
      // se convertía en proveedor "desaparecía" del KPI, falseando el
      // total de personas registradas. Un proveedor SUMA en este
      // contador Y en `totalProviderUsers` (no se restan).
      this.prisma.user.count(),
      this.prisma.review.count(),
      this.prisma.provider.count({
        where: { verificationStatus: 'PENDIENTE' },
      }),
      this.prisma.providerAnalytic.count({
        where: {
          eventType: 'whatsapp_click',
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.providerAnalytic.count({
        where: { eventType: 'call_click', createdAt: { gte: startOfMonth } },
      }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: 'PROVEEDOR' } }),
    ]);

    return {
      totalProviders,
      activeProviders,
      providersInGrace,
      providersExpiringSoon,
      totalUsers,
      totalReviews,
      pendingVerifications,
      whatsappClicks,
      callClicks,
      totalActiveUsers,
      totalProviderUsers,
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
            providerCategories: {
              select: { category: { select: { name: true } } },
            },
            locality: { select: { name: true } },
          },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    return subscriptions.map((sub) => ({
      ...sub,
      provider: withCategoryAlias(sub.provider),
      daysLeft: Math.ceil(
        (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
      isUrgent:
        Math.ceil(
          (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ) <= 7,
    }));
  }

  // ── PROVEEDORES POR VENCER (drill-down del card "Vencen en 7 días") ──
  //
  // MISMO filtro que `providersExpiringSoon` en getDashboardMetrics
  // (status GRACIA, endDate dentro de los próximos 7 días) → el conteo
  // del card coincide con el largo de esta lista. Incluye `userId` para
  // que el admin pueda dispararle un recordatorio/push directo.
  async getExpiringProviders() {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const subs = await this.prisma.subscription.findMany({
      where: { status: 'GRACIA', endDate: { gte: now, lte: in7 } },
      include: {
        provider: {
          select: {
            id: true,
            userId: true,
            businessName: true,
            type: true,
            locality: { select: { name: true } },
            providerCategories: {
              select: { category: { select: { name: true } } },
            },
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    return subs
      .filter((s) => s.provider)
      .map((sub) => {
        const p = sub.provider;
        return {
          providerId: p.id,
          userId: p.userId,
          businessName: p.businessName,
          type: p.type,
          ownerName:
            `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.trim(),
          phone: p.user?.phone ?? null,
          locality: p.locality?.name ?? null,
          category: p.providerCategories?.[0]?.category?.name ?? null,
          plan: sub.plan,
          endDate: sub.endDate.toISOString(),
          daysLeft: Math.ceil(
            (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ),
        };
      });
  }

  // ── ANALYTICS ─────────────────────────────────────────────
  async getAnalytics(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const prevSince = new Date(since);
    prevSince.setDate(prevSince.getDate() - days);

    const [
      dailyAgg,
      prevWA,
      prevCalls,
      prevViews,
      planDist,
      totalProviders,
      approvedProviders,
      pendingProviders,
      rejectedProviders,
      activeProviders,
      availDist,
      geoDist,
      topProviderClicks,
    ] = await Promise.all([
      // Agrupado por día + tipo de evento en SQL (evita traer todas las filas)
      this.prisma.$queryRaw<
        Array<{ day: string; eventType: string; count: bigint }>
      >`
        SELECT TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS "day",
               "eventType"::text                                   AS "eventType",
               COUNT(*)                                            AS "count"
          FROM "provider_analytics"
         WHERE "createdAt" >= ${since}
         GROUP BY 1, 2
         ORDER BY 1 ASC
      `,
      // Período anterior para comparación
      this.prisma.providerAnalytic.count({
        where: {
          eventType: 'whatsapp_click',
          createdAt: { gte: prevSince, lt: since },
        },
      }),
      this.prisma.providerAnalytic.count({
        where: {
          eventType: 'call_click',
          createdAt: { gte: prevSince, lt: since },
        },
      }),
      this.prisma.providerAnalytic.count({
        where: { eventType: 'view', createdAt: { gte: prevSince, lt: since } },
      }),
      // Distribución de planes
      this.prisma.subscription.groupBy({
        by: ['plan'],
        _count: { id: true },
        where: { provider: { verificationStatus: 'APROBADO' } },
      }),
      // Funnel de proveedores
      this.prisma.provider.count(),
      this.prisma.provider.count({ where: { verificationStatus: 'APROBADO' } }),
      this.prisma.provider.count({
        where: { verificationStatus: 'PENDIENTE' },
      }),
      this.prisma.provider.count({
        where: { verificationStatus: 'RECHAZADO' },
      }),
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
        where: {
          createdAt: { gte: since },
          eventType: { in: ['whatsapp_click', 'call_click'] },
        },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Construir dailyClicks a partir del agrupado SQL.
    const byDay: Record<
      string,
      { whatsapp: number; calls: number; views: number }
    > = {};
    let totalWA = 0,
      totalCalls = 0,
      totalViews = 0;
    for (const row of dailyAgg) {
      const day = row.day;
      const cnt = Number(row.count); // bigint → number
      if (!byDay[day]) byDay[day] = { whatsapp: 0, calls: 0, views: 0 };
      if (row.eventType === 'whatsapp_click') {
        byDay[day].whatsapp += cnt;
        totalWA += cnt;
      } else if (row.eventType === 'call_click') {
        byDay[day].calls += cnt;
        totalCalls += cnt;
      } else if (row.eventType === 'view') {
        byDay[day].views += cnt;
        totalViews += cnt;
      }
    }

    // Delta % vs período anterior
    const pctDelta = (curr: number, prev: number) =>
      prev === 0
        ? curr > 0
          ? 100
          : 0
        : Math.round(((curr - prev) / prev) * 100);

    // Obtener nombres de localidades para geo
    const localityIds = geoDist
      .map((g) => g.localityId)
      .filter((id): id is number => id != null);
    const localityData =
      localityIds.length > 0
        ? await this.prisma.locality.findMany({
            where: { id: { in: localityIds } },
            select: { id: true, name: true },
          })
        : [];
    const localityMap = new Map(localityData.map((l) => [l.id, l.name]));

    // Obtener nombres de top proveedores
    const topProviderIds = topProviderClicks.map((t) => t.providerId);
    const topProviderData =
      topProviderIds.length > 0
        ? await this.prisma.provider.findMany({
            where: { id: { in: topProviderIds } },
            select: {
              id: true,
              businessName: true,
              type: true,
              providerCategories: {
                select: { category: { select: { name: true } } },
              },
            },
          })
        : [];
    const topProviderMap = new Map(topProviderData.map((p) => [p.id, p]));

    return {
      // Daily engagement con views
      dailyClicks: Object.entries(byDay).map(([date, counts]) => ({
        date,
        ...counts,
      })),

      // KPIs del período con comparación
      kpis: {
        whatsappTotal: totalWA,
        callsTotal: totalCalls,
        viewsTotal: totalViews,
        whatsappDelta: pctDelta(totalWA, prevWA),
        callsDelta: pctDelta(totalCalls, prevCalls),
        viewsDelta: pctDelta(totalViews, prevViews),
      },

      // Distribución de planes
      planDistribution: planDist.map((p) => ({
        plan: p.plan,
        count: p._count.id,
      })),

      // Funnel de proveedores
      providerFunnel: {
        total: totalProviders,
        approved: approvedProviders,
        pending: pendingProviders,
        rejected: rejectedProviders,
        active: activeProviders,
        conversionRate:
          totalProviders > 0
            ? Math.round((approvedProviders / totalProviders) * 100)
            : 0,
      },

      // Distribución de disponibilidad
      availabilityDistribution: availDist.map((a) => ({
        status: a.availability,
        count: a._count.id,
      })),

      // Distribución geográfica
      geoDistribution: geoDist
        .filter((g) => g.localityId != null)
        .map((g) => ({
          department: localityMap.get(g.localityId) ?? `Loc #${g.localityId}`,
          count: g._count.id,
        })),

      // Top proveedores por engagement
      topProviders: topProviderClicks.map((t) => {
        const p = topProviderMap.get(t.providerId);
        return {
          providerId: t.providerId,
          businessName: p?.businessName ?? `Proveedor #${t.providerId}`,
          type: p?.type ?? 'OFICIO',
          categoryName: p?.providerCategories?.[0]?.category?.name ?? '—',
          clicks: t._count.id,
        };
      }),
    };
  }
}
