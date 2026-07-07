import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MinioService } from '../common/minio.service.js';
import { CreateOfferPostDto } from './dto/create-offer-post.dto.js';
import { visibleInLocalities } from '../coverage/coverage.service.js';

// Límites por plan: máx activas y ventana de expiración en horas
const PLAN_LIMITS: Record<
  string,
  { maxActive: number; durationHours: number }
> = {
  PREMIUM: { maxActive: 8, durationHours: 72 },
  ESTANDAR: { maxActive: 4, durationHours: 24 },
  GRATIS: { maxActive: 1, durationHours: 12 },
};

@Injectable()
export class OfferPostsService {
  private readonly logger = new Logger(OfferPostsService.name);

  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  // ── HELPER: resolver providerId desde userId + type ─────
  private async resolveProviderId(
    userId: number,
    type?: string,
  ): Promise<number> {
    const where: any = { userId };
    if (type === 'OFICIO' || type === 'NEGOCIO') where.type = type;
    const provider = await this.prisma.provider.findFirst({
      where,
      select: { id: true },
    });
    if (!provider)
      throw new NotFoundException('Perfil de proveedor no encontrado');
    return provider.id;
  }

  async createOfferByUser(
    userId: number,
    type: string,
    dto: CreateOfferPostDto,
    photo?: Express.Multer.File,
  ) {
    const providerId = await this.resolveProviderId(userId, type);
    return this.createOffer(providerId, dto, photo);
  }

  async getMyOffersByUser(userId: number, type?: string) {
    const providerId = await this.resolveProviderId(userId, type);
    return this.getMyOffers(providerId);
  }

  async deleteOfferByUser(userId: number, offerId: number) {
    const offer = await this.prisma.offerPost.findUnique({
      where: { id: offerId },
    });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    const provider = await this.prisma.provider.findFirst({
      where: { userId, id: offer.providerId },
      select: { id: true },
    });
    if (!provider) throw new ForbiddenException('No es tu oferta');
    await this.prisma.offerPost.delete({ where: { id: offerId } });
    return { success: true };
  }

  // ── EDITAR OFERTA ────────────────────────────────────────
  // El user puede modificar título, descripción, precio, foto y
  // OPCIONALMENTE resetear la duración a su tope del plan vigente
  // (resetDuration:true) — antes la oferta se actualizaba pero el
  // tiempo restante quedaba congelado, sin manera de extenderlo.
  async updateOfferByUser(
    userId: number,
    offerId: number,
    dto: {
      title?: string;
      description?: string;
      price?: number;
      resetDuration?: boolean;
    },
    photoFile?: Express.Multer.File,
  ) {
    const offer = await this.prisma.offerPost.findUnique({
      where: { id: offerId },
      include: {
        provider: {
          select: {
            id: true,
            userId: true,
            subscription: { select: { plan: true, status: true } },
          },
        },
      },
    });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    if (offer.provider.userId !== userId) {
      throw new ForbiddenException('No es tu oferta');
    }

    let newPhotoUrl: string | undefined;
    if (photoFile) {
      newPhotoUrl = await this.minio.uploadFile(
        photoFile.buffer,
        photoFile.originalname,
        'offer-posts',
      );
    }

    let newExpiresAt: Date | undefined;
    if (dto.resetDuration === true) {
      const plan = offer.provider.subscription?.plan ?? 'GRATIS';
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS['GRATIS'];
      const next = new Date();
      next.setHours(next.getHours() + limits.durationHours);
      newExpiresAt = next;
    }

    return this.prisma.offerPost.update({
      where: { id: offerId },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        price: dto.price ?? undefined,
        photoUrl: newPhotoUrl ?? undefined,
        expiresAt: newExpiresAt ?? undefined,
      },
      include: {
        categories: {
          select: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  }

  // ── CREAR OFERTA ─────────────────────────────────────────
  async createOffer(
    providerId: number,
    dto: CreateOfferPostDto,
    photoFile?: Express.Multer.File,
  ) {
    // Obtener plan activo del proveedor
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        trustStatus: true,
        isTrusted: true,
        providerCategories: { select: { categoryId: true } },
        subscription: { select: { plan: true, status: true } },
      },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    if (provider.trustStatus !== 'APPROVED') {
      throw new ForbiddenException(
        'Solo los profesionales validados pueden publicar ofertas. Verifica tu identidad para desbloquear esta función.',
      );
    }

    const plan = provider.subscription?.plan ?? 'GRATIS';
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS['GRATIS'];

    // Contar ofertas activas actuales
    const activeCount = await this.prisma.offerPost.count({
      where: { providerId, isActive: true },
    });
    if (activeCount >= limits.maxActive) {
      throw new BadRequestException(
        `Tu plan ${plan} permite máximo ${limits.maxActive} oferta(s) activa(s).`,
      );
    }

    // Subir foto si viene
    let photoUrl: string | undefined;
    if (photoFile) {
      photoUrl = await this.minio.uploadFile(
        photoFile.buffer,
        photoFile.originalname,
        'offer-posts',
      );
    }

    // Duración: el proveedor puede elegirla, pero NUNCA por encima del tope
    // del plan (anti-abuso). Sin valor → tope del plan (comportamiento previo).
    const requestedHours = dto.durationHours;
    const hours =
      requestedHours != null
        ? Math.min(
            Math.max(1, Math.round(requestedHours)),
            limits.durationHours,
          )
        : limits.durationHours;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);

    const offer = await this.prisma.offerPost.create({
      data: {
        providerId,
        title: dto.title,
        description: dto.description,
        price: dto.price ?? null,
        photoUrl: photoUrl ?? null,
        expiresAt,
        categories: {
          create: provider.providerCategories.map((pc) => ({
            categoryId: pc.categoryId,
          })),
        },
      },
      include: {
        categories: {
          select: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    return offer;
  }

  // ── LISTAR OFERTAS PÚBLICAS ──────────────────────────────
  async listOffers(filters: {
    categorySlug?: string;
    /** CSV de slugs para filtro multi-categoría (OR lógico). Tiene prioridad
     * sobre `categorySlug` si llega con al menos un valor. */
    categorySlugs?: string;
    /** 'OFICIO' | 'NEGOCIO' — filtra por el tipo del proveedor que publica. */
    providerType?: string;
    department?: string;
    province?: string;
    district?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      categorySlug,
      categorySlugs,
      providerType,
      department,
      province,
      district,
      page = 1,
      limit = 20,
    } = filters;

    const where: any = { isActive: true, expiresAt: { gt: new Date() } };

    // Multi-categoría (OR): el slug aislado se mantiene por compat. Si llega
    // CSV con valores, se prioriza.
    const slugList = (categorySlugs ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (slugList.length > 0) {
      where.categories = { some: { category: { slug: { in: slugList } } } };
    } else if (categorySlug) {
      where.categories = { some: { category: { slug: categorySlug } } };
    }

    // Filtrado por tipo de proveedor (Profesional/Negocio).
    const normalizedType = (providerType ?? '').trim().toUpperCase();
    if (normalizedType === 'OFICIO' || normalizedType === 'NEGOCIO') {
      where.provider = { ...(where.provider ?? {}), type: normalizedType };
    }

    // Filtrar por localidad del proveedor
    if (department || province || district) {
      const norm = (s?: string) =>
        (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

      const localities = await this.prisma.locality.findMany({
        where: { isActive: true },
        select: { id: true, department: true, province: true, district: true },
      });

      const nDept = norm(department);
      const nProv = norm(province);
      const nDist = norm(district);

      const matchIds = localities
        .filter(
          (l) =>
            (!nDept || norm(l.department) === nDept) &&
            (!nProv || norm(l.province ?? '') === nProv) &&
            (!nDist || norm(l.district ?? '') === nDist),
        )
        .map((l) => l.id);

      if (matchIds.length > 0) {
        // Registrado O cobertura de pago (mismo criterio que providers.findAll).
        where.provider = {
          ...(where.provider ?? {}),
          AND: [visibleInLocalities(matchIds)],
        };
      } else {
        where.id = -1; // sin resultados
      }
    }

    const skip = (page - 1) * limit;

    const [offers, total] = await Promise.all([
      this.prisma.offerPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          provider: {
            select: {
              id: true,
              businessName: true,
              averageRating: true,
              isVerified: true,
              type: true,
              phone: true,
              whatsapp: true,
              images: {
                where: { isCover: true },
                select: { url: true },
                take: 1,
              },
              locality: {
                select: { name: true, province: true, district: true },
              },
              subscription: { select: { plan: true } },
            },
          },
          categories: {
            select: {
              category: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      }),
      this.prisma.offerPost.count({ where }),
    ]);

    // LISTADO: servir thumbnails (CDN) en vez de la imagen completa para
    // aligerar la carga. No-op si la URL no es del CDN público (legacy).
    const data = offers.map((o) => ({
      ...o,
      photoUrl: o.photoUrl
        ? MinioService.publicThumbUrl(o.photoUrl)
        : o.photoUrl,
      provider: o.provider
        ? {
            ...o.provider,
            images: o.provider.images?.map((img) => ({
              ...img,
              url: MinioService.publicThumbUrl(img.url),
            })),
          }
        : o.provider,
    }));

    return { data, total, page, lastPage: Math.ceil(total / limit) };
  }

  /**
   * Devuelve la lista distinta de categorías que actualmente tienen
   * al menos una oferta activa. Usado por el panel admin como chips de
   * filtro para no inundar al admin con la taxonomía completa.
   */
  async getOfferCategories() {
    const rows = await this.prisma.offerPostCategory.findMany({
      where: {
        offerPost: { isActive: true, expiresAt: { gt: new Date() } },
      },
      select: { category: { select: { id: true, name: true, slug: true } } },
      distinct: ['categoryId'],
      orderBy: { categoryId: 'asc' },
    });
    return rows.map((r) => r.category);
  }

  // ── LISTAR OFERTAS DEL PROVEEDOR (propio panel) ──────────
  async getMyOffers(providerId: number) {
    return this.prisma.offerPost.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      include: {
        categories: {
          select: { category: { select: { id: true, name: true } } },
        },
        _count: { select: { reports: true } },
      },
    });
  }

  // ── ELIMINAR OFERTA ──────────────────────────────────────
  async deleteOffer(providerId: number, offerId: number) {
    const offer = await this.prisma.offerPost.findUnique({
      where: { id: offerId },
    });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    if (offer.providerId !== providerId)
      throw new ForbiddenException('No es tu oferta');

    await this.prisma.offerPost.delete({ where: { id: offerId } });
    return { success: true };
  }

  // ── REPORTAR OFERTA ──────────────────────────────────────
  async reportOffer(userId: number, offerId: number, reason: any) {
    const offer = await this.prisma.offerPost.findUnique({
      where: { id: offerId },
    });
    if (!offer || !offer.isActive)
      throw new NotFoundException('Oferta no encontrada');

    try {
      const report = await this.prisma.offerReport.create({
        data: { offerPostId: offerId, reporterId: userId, reason },
      });

      // Visibilidad en el panel admin: persistimos una notif con
      // providerId (ADMIN_NOTIF_WHERE la incluye → aparece en el bell del
      // admin, además de /admin/offer-reports) y SIN targetUserId, para
      // que NO se filtre al inbox del proveedor reportado. Fire-and-forget:
      // un fallo del inbox no debe tumbar el reporte ya guardado.
      void this.prisma.adminNotification
        .create({
          data: {
            providerId: offer.providerId,
            type: 'OFFER_REPORT',
            title: 'Oferta reportada',
            message: `Un usuario reportó la oferta "${offer.title}" (motivo: ${reason}).`,
          },
        })
        .catch(() => {});

      return report;
    } catch (e: any) {
      // Reporte duplicado (unique offerPostId+reporterId) → 409 Conflict
      // limpio, NO 500. El filtro global de Prisma solo captura errores
      // que escapan; acá lo mapeamos explícito con el mensaje de negocio.
      if (e?.code === 'P2002')
        throw new ConflictException('Ya reportaste esta oferta');
      throw e;
    }
  }

  // ── CRONJOB: expirar ofertas vencidas (cada hora) ────────
  @Cron(CronExpression.EVERY_HOUR)
  async expireOffers() {
    const result = await this.prisma.offerPost.updateMany({
      where: { isActive: true, expiresAt: { lte: new Date() } },
      data: { isActive: false },
    });
    if (result.count > 0) {
      this.logger.log(`Expiradas ${result.count} oferta(s)`);
    }
  }

  // ── ADMIN: listar reportes ───────────────────────────────
  async listReports(resolved?: boolean) {
    return this.prisma.offerReport.findMany({
      where: resolved !== undefined ? { isResolved: resolved } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        offerPost: { select: { id: true, title: true, providerId: true } },
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  // ── ADMIN: resolver reporte ──────────────────────────────
  async resolveReport(reportId: number, deactivateOffer: boolean) {
    const report = await this.prisma.offerReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    const [updatedReport] = await this.prisma.$transaction([
      this.prisma.offerReport.update({
        where: { id: reportId },
        data: { isResolved: true },
      }),
      ...(deactivateOffer
        ? [
            this.prisma.offerPost.update({
              where: { id: report.offerPostId },
              data: { isActive: false },
            }),
          ]
        : []),
    ]);

    return updatedReport;
  }
}
