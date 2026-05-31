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
import { ReferralsService } from '../referrals/referrals.service.js';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private minio: MinioService,
    private push: PushNotificationsService,
    private referrals: ReferralsService,

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
    const name = p?.providerCategories?.[0]?.category?.name ?? 'Sin categoría';
    return { ...p, category: { name } };
  }

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
    const cached = await this.cacheManager.get(AdminService.GEO_CACHE_KEY);
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
      const centroid = AdminService.PERU_DEPT_CENTROIDS[r.department] ?? {
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
      AdminService.GEO_CACHE_KEY,
      result,
      AdminService.GEO_CACHE_TTL * 1000,
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
      provider: this.withCategoryAlias(sub.provider),
      daysLeft: Math.ceil(
        (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
      isUrgent:
        Math.ceil(
          (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ) <= 7,
    }));
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
      let parsedSchedule: object | undefined;
      if (data.scheduleJson) {
        try {
          parsedSchedule = JSON.parse(data.scheduleJson);
        } catch {
          /* ignore */
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

    return this.prisma.$transaction(async (tx) => {
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
  }

  // ── HELPER: plan → prioridad de listado ──────────────────
  private planToPriority(plan: string, status: string): number {
    if (status !== 'ACTIVA') return 4;
    switch (plan) {
      case 'PREMIUM':
        return 1;
      case 'ESTANDAR':
        return 2;
      case 'GRATIS':
        return 3;
      default:
        return 4;
    }
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
    const PATTERN = 'providers_*';
    try {
      const cm = this.cacheManager;
      const client =
        cm?.store?.getClient?.() ?? cm?.client ?? cm?.store?.client ?? null;

      // Caso ideal: cliente Redis con SCAN (cache-manager-redis-yet expone uno).
      if (client && typeof client.scanIterator === 'function') {
        const toDelete: string[] = [];
        for await (const key of client.scanIterator({
          MATCH: PATTERN,
          COUNT: 200,
        })) {
          toDelete.push(key as string);
        }
        if (toDelete.length > 0 && typeof client.del === 'function') {
          await client.del(toDelete);
        }
        return;
      }

      // Fallback: KEYS (bloqueante, solo en datasets pequeños).
      if (client && typeof client.keys === 'function') {
        const keys: string[] = await client.keys(PATTERN);
        if (keys.length > 0) {
          if (typeof client.del === 'function') await client.del(keys);
          else {
            for (const k of keys) await cm.del?.(k);
          }
        }
        return;
      }

      // Último recurso: si el cache-manager no expone client, intentamos
      // borrar por nombre conocido (lista vacía → no-op). NO hacemos
      // flushAll para evitar afectar caches no relacionadas.
    } catch {
      // Si la limpieza falla, el TTL natural (~30s) invalida la caché.
    }
  }

  // ── VERIFICACIÓN ──────────────────────────────────────────

  async getPendingVerifications() {
    const providers = await this.prisma.provider.findMany({
      where: { verificationStatus: 'PENDIENTE' },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
        providerCategories: {
          select: { category: { select: { name: true } } },
        },
        locality: { select: { name: true } },
        verificationDocs: true,
        images: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return providers.map((p) => this.withCategoryAlias(p));
  }

  async approveVerification(id: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: { subscription: true, user: { select: { hasUsedTrial: true } } },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    // Anti freemium abuse: si el dueño ya consumió su mes de cortesía en
    // una cuenta previa (hasUsedTrial), el perfil arranca en GRATIS sin
    // gracia. Si es su primera vez, recibe ESTANDAR de cortesía por 1 mes
    // (al expirar, el cron de suscripciones lo degrada a GRATIS).
    const usedTrial = provider.user?.hasUsedTrial ?? false;
    const trialPlan = usedTrial ? 'GRATIS' : 'ESTANDAR';
    const trialStatus = usedTrial ? 'ACTIVA' : 'GRACIA';

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const [updated] = await this.prisma.$transaction(async (tx) => {
      // 1. Aprobar proveedor y hacerlo visible
      const updatedProvider = await tx.provider.update({
        where: { id },
        data: {
          isVerified: true,
          verificationStatus: 'APROBADO',
          isVisible: true,
          // Prioridad de listado según el plan inicial real del proveedor.
          planPriority: this.planToPriority(
            usedTrial ? 'GRATIS' : 'ESTANDAR',
            'ACTIVA',
          ),
        },
      });

      // 2. Cambiar rol del usuario a PROVEEDOR (ahora sí está aprobado)
      await tx.user.update({
        where: { id: provider.userId },
        data: { role: 'PROVEEDOR' },
      });

      // 3. Crear suscripción de cortesía (solo si no tiene una ya).
      // Plan ESTANDAR, status GRACIA — el dashboard del proveedor detecta esa
      // combinación y muestra el modal de bienvenida exclusivo de primera vez.
      if (!provider.subscription) {
        await tx.subscription.create({
          data: {
            providerId: id,
            plan: trialPlan,
            status: trialStatus,
            endDate,
          },
        });
      }

      // 4. Notificación en BD — un solo texto unificado. Antes había
      // DOS notifs distintas (una de "¡Felicidades verificado!" y otra
      // de "Perfil aprobado + Plan Estándar..."). El user veía duplicado
      // en su inbox: la persistida por BD + la in-memory por WS.
      // Ahora ambas comparten el MISMO título/cuerpo y el dedup por
      // (type+title+body+timestamp) del notifications_provider las
      // colapsa a una sola entrada.
      //
      // IMPORTANTE: usar `updatedProvider` (variable local de la tx), NO
      // `updated` — esa última es el resultado de la transacción y aún
      // no está inicializada acá dentro (TDZ → ReferenceError
      // "Cannot access 'updated' before initialization").
      const approveBody =
        `Tu perfil "${updatedProvider.businessName}" fue aprobado. ` +
        (usedTrial
          ? 'Ya estás activo en el plan Gratis.'
          : 'Plan Estándar activado gratis por 1 mes de bienvenida.');
      await tx.adminNotification.create({
        data: {
          providerId: id,
          type: 'APROBADO',
          title: '¡Perfil aprobado! ✅',
          message: approveBody,
          // Sin esto, la notif aparecía en ambos paneles del usuario
          // (OFICIO y NEGOCIO) porque el filtro por tipo dejaba pasar
          // las nulas. Bind explícito al perfil del provider.
          targetProfileType: updatedProvider.type,
          targetUserId: provider.userId,
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
    this.eventsGateway.emitAdminEvent('PROVIDER_APPROVED', {
      providerId: id,
      businessName: updated.businessName,
    });

    // Notificar al proveedor específico en la app móvil. Mismo texto que
    // se persistió en BD para que el dedup del cliente (type+title+body
    // dentro de ±60s) las trate como la misma entrada.
    const approveTitle = '¡Perfil aprobado! ✅';
    const approveBody =
      `Tu perfil "${updated.businessName}" fue aprobado. ` +
      (usedTrial
        ? 'Ya estás activo en el plan Gratis.'
        : 'Plan Estándar activado gratis por 1 mes de bienvenida.');

    this.eventsGateway.emitNotification({
      type: 'PROVIDER_APPROVED',
      title: approveTitle,
      body: approveBody,
      targetUserId: provider.userId,
      targetProfileType: updated.type,
    });

    this.push.sendToUser(provider.userId, approveTitle, approveBody, {
      type: 'PROVIDER_APPROVED',
      plan: trialPlan,
      trial: String(!usedTrial),
    });

    // Sistema de referidos: si este provider tiene un referral pendiente,
    // entrega monedas al inviter y al invitado y emite las notificaciones extra.
    // Falla en silencio para no romper la aprobación si algo va mal.
    try {
      await this.referrals.onProviderApproved(updated.id);
    } catch (err) {
      console.error('[ReferralsService.onProviderApproved] error:', err);
    }

    return updated;
  }

  async rejectVerification(id: number, reason: string) {
    if (!reason?.trim())
      throw new BadRequestException('El motivo de rechazo es obligatorio');

    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    const [updated] = await this.prisma.$transaction(async (tx) => {
      // 1. Marcar proveedor como rechazado y oculto
      const updatedProvider = await tx.provider.update({
        where: { id },
        data: {
          isVerified: false,
          verificationStatus: 'RECHAZADO',
          isVisible: false,
        },
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
          // Bind al perfil para que el filtro del panel no la mezcle.
          targetProfileType: updatedProvider.type,
          targetUserId: provider.userId,
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
    this.eventsGateway.emitAdminEvent('PROVIDER_REJECTED', {
      providerId: id,
      businessName: updated.businessName,
    });

    // Notificar al proveedor específico en la app móvil. Incluimos
    // `targetProfileType` para que el cliente sepa cuál perfil
    // (OFICIO/NEGOCIO) actualizar en su estado local.
    this.eventsGateway.emitNotification({
      type: 'PROVIDER_REJECTED',
      title: 'Perfil rechazado',
      body: `Tu perfil "${updated.businessName}" no fue aprobado. Motivo: ${reason}`,
      targetUserId: provider.userId,
      targetProfileType: updated.type,
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
    if (!reason?.trim())
      throw new BadRequestException(
        'El detalle de la solicitud es obligatorio',
      );

    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    await this.prisma.adminNotification.create({
      data: {
        providerId: id,
        type: 'MAS_INFO',
        message: `Necesitamos más información para verificar tu perfil: ${reason}`,
        targetProfileType: provider.type,
        targetUserId: provider.userId,
      },
    });

    return { success: true, message: 'Solicitud de información enviada' };
  }

  async revokeVerification(id: number, reason?: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');
    if (!provider.isVerified)
      throw new BadRequestException('Este proveedor no está verificado');

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
          targetProfileType: provider.type,
          targetUserId: provider.userId,
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
      OR: [{ providerId: { not: null } }, { type: 'BROADCAST_LOG' }],
    };

  async getNotifications(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = AdminService.ADMIN_NOTIF_WHERE;

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
    return this.prisma.adminNotification.update({
      where: { id },
      data: { isRead: true },
    });
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
      topRatedProviders: topRatedProviders.map((p) =>
        this.withCategoryAlias(p),
      ),
      mostReviewedProviders: mostReviewedProviders.map((p) =>
        this.withCategoryAlias(p),
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

  // ── CRUD DE CATEGORÍAS ────────────────────────────────────

  async getCategories() {
    return this.prisma.category.findMany({
      include: {
        children: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
        parent: { select: { id: true, name: true } },
        _count: { select: { providerCategories: true } },
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(data: {
    name: string;
    slug: string;
    iconUrl?: string;
    parentId?: number;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: data.slug },
    });
    if (existing)
      throw new ConflictException(`El slug '${data.slug}' ya está en uso`);

    const created = await this.prisma.category.create({ data });
    await this.clearProvidersCache(); // propaga a mobile/web de inmediato
    return created;
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
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Categoría no encontrada');

    if (data.slug && data.slug !== exists.slug) {
      const slugTaken = await this.prisma.category.findUnique({
        where: { slug: data.slug },
      });
      if (slugTaken)
        throw new ConflictException(`El slug '${data.slug}' ya está en uso`);
    }

    const updated = await this.prisma.category.update({ where: { id }, data });
    await this.clearProvidersCache(); // refleja el cambio en proveedores ya
    return updated;
  }

  async toggleCategoryActive(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Categoría no encontrada');

    const toggled = await this.prisma.category.update({
      where: { id },
      data: { isActive: !category.isActive },
    });
    await this.clearProvidersCache();
    return toggled;
  }

  /**
   * Elimina una categoría. Las relaciones `providerCategories` y
   * `offerPostCategories` tienen `onDelete: Cascade` → los proveedores y
   * posts quedan desvinculados (como anuncia la UI). En cambio `children`
   * (subcategorías) y `serviceRequests` son RESTRICT → bloqueamos con un
   * mensaje claro en vez de un 500 de FK.
   */
  async deleteCategory(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { children: true, serviceRequests: true } },
      },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');

    if (category._count.children > 0) {
      throw new ConflictException(
        'No se puede eliminar: la categoría tiene subcategorías. Muévelas o elimínalas primero.',
      );
    }
    if (category._count.serviceRequests > 0) {
      throw new ConflictException(
        'No se puede eliminar: hay solicitudes de servicio asociadas a esta categoría.',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    await this.clearProvidersCache(); // desaparece de mobile/web de inmediato
    return { success: true, id };
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

  // ── SOLICITUDES DE PLAN ───────────────────────────────────

  async getPlanRequests(status?: string) {
    return this.prisma.planRequest.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            type: true,
            phone: true,
            subscription: { select: { plan: true, status: true } },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
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
    if (req.status !== 'PENDIENTE')
      throw new BadRequestException('La solicitud ya fue procesada');

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
          data: {
            providerId: req.providerId,
            plan: req.plan,
            status: 'ACTIVA',
            endDate,
          },
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
        providerId: req.providerId,
        type: 'PLAN_APROBADO',
        title: `¡Plan ${req.plan} aprobado!`,
        message: `¡Felicidades! Tu solicitud para el plan ${req.plan} ha sido aprobada. Ya puedes disfrutar de todos los beneficios.`,
        isRead: false,
        targetUserId: req.provider.userId,
        targetProfileType: req.provider.type,
      },
    });

    // Real-time notification to provider
    this.eventsGateway.emitNotification({
      type: 'PLAN_APROBADO',
      title: `¡Plan ${req.plan} aprobado!`,
      body: `¡Felicidades! Tu plan ${req.plan} ha sido aprobado.`,
      targetUserId: req.provider.userId,
      targetProfileType: req.provider.type,
    });
    this.eventsGateway.emitAdminEvent('PLAN_APPROVED', {
      requestId,
      plan: req.plan,
    });

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
      include: {
        provider: { select: { userId: true, businessName: true, type: true } },
      },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.status !== 'PENDIENTE')
      throw new BadRequestException('La solicitud ya fue procesada');

    await this.prisma.planRequest.update({
      where: { id: requestId },
      data: { status: 'RECHAZADO', reason: reason ?? null },
    });

    const msg = reason
      ? `Tu solicitud de plan ${req.plan} fue rechazada. Motivo: ${reason}`
      : `Tu solicitud de plan ${req.plan} fue rechazada.`;

    await this.prisma.adminNotification.create({
      data: {
        providerId: req.providerId,
        type: 'PLAN_RECHAZADO',
        title: `Solicitud de plan ${req.plan} rechazada`,
        message: msg,
        isRead: false,
        targetUserId: req.provider.userId,
        targetProfileType: req.provider.type,
      },
    });

    this.eventsGateway.emitNotification({
      type: 'PLAN_RECHAZADO',
      title: 'Solicitud rechazada',
      body: msg,
      targetUserId: req.provider.userId,
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
    const cleanImage = imageUrl?.trim() || null;

    const result = await this.push.broadcast({
      title: cleanTitle,
      body: cleanBody,
      imageUrl: cleanImage,
      data: { type: 'BROADCAST' },
    });

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
}
