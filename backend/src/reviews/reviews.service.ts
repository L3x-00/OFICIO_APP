import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { Prisma } from '../generated/client/client.js';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  // ── CREAR RESEÑA ─────────────────────────────────────────
  async create(data: {
    providerId: number;
    userId: number;
    rating: number;
    comment?: string;
    photoUrl?: string;
    userLatAtReview?: number;
    userLngAtReview?: number;
    qrCodeUsed?: string;
  }) {
    // Validar que rating sea entre 1 y 5
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('La calificación debe ser entre 1 y 5');
    }

    // Verificar que el proveedor existe
    const provider = await this.prisma.provider.findUnique({
      where: { id: data.providerId },
    });
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    // Verificar que el usuario no haya reseñado antes este proveedor
    const existingReview = await this.prisma.review.findFirst({
      where: {
        providerId: data.providerId,
        userId: data.userId,
      },
    });
    if (existingReview) {
      throw new BadRequestException('Ya dejaste una reseña para este proveedor');
    }

    // Validación anti-fraude opción A: GPS
    // Si el proveedor tiene coordenadas y el usuario envía las suyas,
    // verificamos que estuvo a menos de 500m
    if (
      data.userLatAtReview &&
      data.userLngAtReview &&
      provider.latitude &&
      provider.longitude
    ) {
      const distanceMeters = this.calculateDistance(
        data.userLatAtReview,
        data.userLngAtReview,
        provider.latitude,
        provider.longitude,
      );

      // Para oficios a domicilio la validación GPS no aplica estrictamente
      // Solo la aplicamos a negocios físicos (restaurantes, peluquerías)
      if (provider.type === 'NEGOCIO' && distanceMeters > 500) {
        throw new BadRequestException(
          'Tu ubicación no coincide con la del negocio. ' +
          'Debes estar cerca del local para dejar una reseña.',
        );
      }
    }

    // Crear reseña y actualizar rating en una transacción atómica.
    // Si el rating update falla, la reseña NO queda huérfana en la BD.
    const review = await this.prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          providerId:      data.providerId,
          userId:          data.userId,
          rating:          data.rating,
          comment:         data.comment,
          photoUrl:        data.photoUrl,
          userLatAtReview: data.userLatAtReview,
          userLngAtReview: data.userLngAtReview,
          qrCodeUsed:      data.qrCodeUsed,
          isVisible:       true,
        },
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      });

      // Recalcular promedio dentro de la transacción
      const agg = await tx.review.aggregate({
        where:  { providerId: data.providerId, isVisible: true },
        _avg:   { rating: true },
        _count: { rating: true },
      });
      await tx.provider.update({
        where: { id: data.providerId },
        data:  {
          averageRating: agg._avg.rating ?? 0,
          totalReviews:  agg._count.rating,
        },
      });

      return newReview;
    });

    // Notificar al proveedor que recibió una nueva reseña
    const reviewWithUser = review as typeof review & { user?: { firstName: string; lastName: string; avatarUrl: string | null } };
    const reviewerName = `${reviewWithUser.user?.firstName ?? ''} ${reviewWithUser.user?.lastName ?? ''}`.trim() || 'Un usuario';
    this.eventsGateway.emitNotification({
      type: 'NEW_REVIEW',
      title: 'Nueva reseña recibida ⭐',
      body: `${reviewerName} te dejó una reseña de ${data.rating} estrella${data.rating === 1 ? '' : 's'}.`,
      targetUserId: provider.userId,
    });

    return review;
  }

  // ── LISTAR RESEÑAS DE UN PROVEEDOR ───────────────────────
  async findByProvider(providerId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { providerId, isVisible: true },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: { providerId, isVisible: true },
      }),
    ]);

    return { data: reviews, total, page, lastPage: Math.ceil(total / limit) };
  }

  // ── MODERAR RESEÑA (Admin) ────────────────────────────────
  async moderate(reviewId: number, isVisible: boolean) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Reseña no encontrada');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { isVisible },
    });

    // Si se oculta o se muestra, recalcular el promedio
    await this.updateProviderRating(review.providerId);

    return updated;
  }

  // ── LISTAR TODAS (para panel admin) ──────────────────────
  async findAll(filters: {
    isVisible?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { isVisible, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};
    if (isVisible !== undefined) where.isVisible = isVisible;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true } },
          provider: { select: { businessName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return { data: reviews, total, page, lastPage: Math.ceil(total / limit) };
  }

  // ── GENERAR CÓDIGO QR para que el proveedor lo muestre ───
  async generateQrCode(providerId: number) {
    // El código es único por proveedor + día
    // Así expira automáticamente cada 24h
    const today = new Date().toISOString().split('T')[0];
    const code = Buffer.from(`${providerId}-${today}-oficio`).toString('base64');

    return { code, expiresAt: `${today}T23:59:59` };
  }

  // ── VALIDAR CÓDIGO QR ─────────────────────────────────────
  async validateQrCode(providerId: number, code: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const expectedCode = Buffer.from(
      `${providerId}-${today}-oficio`,
    ).toString('base64');
    return code === expectedCode;
  }

  // ── EDITAR RESEÑA ────────────────────────────────────────
  async updateReview(
    reviewId: number,
    userId: number,
    data: { rating?: number; comment?: string; photoUrl?: string },
  ) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Reseña no encontrada');
    if (review.userId !== userId)
      throw new ForbiddenException('No puedes editar esta reseña');

    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new BadRequestException('La calificación debe ser entre 1 y 5');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: {
          ...(data.rating    !== undefined && { rating:   data.rating }),
          ...(data.comment   !== undefined && { comment:  data.comment }),
          ...(data.photoUrl  !== undefined && { photoUrl: data.photoUrl }),
        },
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      });

      // Recalcular promedio del proveedor
      const agg = await tx.review.aggregate({
        where:  { providerId: review.providerId, isVisible: true },
        _avg:   { rating: true },
        _count: { rating: true },
      });
      await tx.provider.update({
        where: { id: review.providerId },
        data:  { averageRating: agg._avg.rating ?? 0, totalReviews: agg._count.rating },
      });

      return updated;
    });
  }

  // ── CREAR RESPUESTA A RESEÑA ─────────────────────────────
  async createReply(data: {
    reviewId: number;
    userId: number;
    content: string;
    photoUrl?: string;
  }) {
    // Cargar reseña + proveedor para verificar permisos y obtener businessName
    const review = await this.prisma.review.findUnique({
      where: { id: data.reviewId },
      include: { provider: { select: { userId: true, businessName: true, type: true } } },
    });
    if (!review) throw new NotFoundException('Reseña no encontrada');

    const isReviewer = review.userId === data.userId;
    const isProviderOwner = review.provider.userId === data.userId;
    if (!isReviewer && !isProviderOwner) {
      throw new ForbiddenException(
        'Solo el autor de la reseña o el titular del negocio/servicio pueden responder',
      );
    }

    const reply = await this.prisma.reviewReply.create({
      data: {
        reviewId: data.reviewId,
        userId:   data.userId,
        content:  data.content,
        photoUrl: data.photoUrl,
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    // Notificación cruzada: proveedor → revisor y viceversa
    const replierUser = reply as typeof reply & { user?: { firstName: string; lastName: string } };
    const replierName =
      `${replierUser.user?.firstName ?? ''} ${replierUser.user?.lastName ?? ''}`.trim() ||
      'Alguien';

    if (isProviderOwner) {
      // Proveedor respondió → notificar al autor de la reseña con nombre del negocio
      const businessName = review.provider.businessName;
      this.eventsGateway.emitNotification({
        type: 'REVIEW_REPLY',
        title: '💬 El proveedor respondió tu reseña',
        body: `${businessName} ha respondido a tu reseña.`,
        targetUserId: review.userId,
      });
    } else {
      // Cliente respondió al comentario del proveedor → notificar al proveedor
      this.eventsGateway.emitNotification({
        type: 'REVIEW_REPLY',
        title: '💬 Nueva respuesta en tu reseña',
        body: `El cliente ${replierName} ha respondido a tu comentario.`,
        targetUserId: review.provider.userId,
      });
    }

    return reply;
  }

  // ── LISTAR RESPUESTAS DE UNA RESEÑA ──────────────────────
  async getReplies(reviewId: number) {
    const exists = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!exists) throw new NotFoundException('Reseña no encontrada');

    return this.prisma.reviewReply.findMany({
      where: { reviewId },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── HELPERS ───────────────────────────────────────────────

  // Recalcula el promedio real desde la BD
  private async updateProviderRating(providerId: number) {
    const result = await this.prisma.review.aggregate({
      where: { providerId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        averageRating: result._avg.rating ?? 0,
        totalReviews: result._count.rating,
      },
    });
  }

  // Fórmula Haversine para distancia entre dos coordenadas GPS
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en metros
  }
}