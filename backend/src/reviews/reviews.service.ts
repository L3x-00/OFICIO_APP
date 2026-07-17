import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { PushNotificationsService } from '../firebase/push-notifications.service.js';
import { Prisma } from '../generated/client/client.js';
import { MinioService } from '../common/minio.service.js';

const REVIEW_IMAGE_FOLDERS = ['reviews/evidence'] as const;

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private push: PushNotificationsService,
    private minio: MinioService,
  ) {}

  // ── CREAR RESEÑA ─────────────────────────────────────────
  async create(data: {
    providerId: number;
    userId: number;
    rating: number;
    comment?: string;
    photoUrl?: string;
  }) {
    // Validar que rating sea entre 1 y 5
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('La calificación debe ser entre 1 y 5');
    }

    // Verificar que el proveedor existe
    const photoUrl = this.validateNewPhotoUrl(data.photoUrl);
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
      throw new BadRequestException(
        'Ya dejaste una reseña para este proveedor',
      );
    }

    // Prueba de interacción: el usuario debe haber interactuado con el
    // proveedor (subasta adjudicada, contacto previo o chat) antes de
    // poder reseñarlo. Reemplaza la antigua validación GPS 500m + QR.
    const interaction = await this.canUserReview(data.userId, data.providerId);
    if (!interaction.allowed) {
      throw new ForbiddenException(
        'Debes interactuar con este proveedor antes de reseñarlo',
      );
    }

    // Crear reseña y actualizar rating en una transacción atómica.
    // Si el rating update falla, la reseña NO queda huérfana en la BD.
    const review = await this.prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          providerId: data.providerId,
          userId: data.userId,
          rating: data.rating,
          comment: data.comment,
          photoUrl,
          verificationMethod: interaction.method,
          isVisible: true,
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
        },
      });

      // Recalcular promedio dentro de la transacción
      const agg = await tx.review.aggregate({
        where: { providerId: data.providerId, isVisible: true },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await tx.provider.update({
        where: { id: data.providerId },
        data: {
          averageRating: agg._avg.rating ?? 0,
          totalReviews: agg._count.rating,
        },
      });

      return newReview;
    });

    // Notificar al proveedor que recibió una nueva reseña
    const reviewWithUser = review as typeof review & {
      user?: { firstName: string; lastName: string; avatarUrl: string | null };
    };
    const reviewerName =
      `${reviewWithUser.user?.firstName ?? ''} ${reviewWithUser.user?.lastName ?? ''}`.trim() ||
      'Un usuario';
    const reviewTitle = 'Nueva reseña recibida ⭐';
    const reviewBody =
      `${reviewerName} te dejó una reseña de ${data.rating} ` +
      `estrella${data.rating === 1 ? '' : 's'}.`;

    // Persistir en adminNotification — antes la notificación de reseña
    // solo se emitía por WebSocket/FCM (efímero), así que al cambiar de
    // cuenta y volver desaparecía. Persistida, loadHistory la recupera.
    await this.prisma.adminNotification.create({
      data: {
        providerId: data.providerId,
        type: 'NEW_REVIEW',
        title: reviewTitle,
        message: reviewBody,
        targetUserId: provider.userId,
        targetProfileType: provider.type,
      },
    });

    this.eventsGateway.emitNotification({
      type: 'NEW_REVIEW',
      title: reviewTitle,
      body: reviewBody,
      targetUserId: provider.userId,
    });

    this.push.sendToUser(provider.userId, reviewTitle, reviewBody, {
      type: 'NEW_REVIEW',
      providerId: String(data.providerId),
    });

    return review;
  }

  // ── LISTAR RESEÑAS DE UN PROVEEDOR ───────────────────────
  async findByProvider(providerId: number, page = 1, limit = 10) {
    page = Math.min(10000, Math.max(1, Number.isInteger(page) ? page : 1));
    limit = Math.min(100, Math.max(1, Number.isInteger(limit) ? limit : 10));
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
    const { isVisible } = filters;
    const page = Math.min(
      10000,
      Math.max(1, Number.isInteger(filters.page) ? (filters.page ?? 1) : 1),
    );
    const limit = Math.min(
      100,
      Math.max(1, Number.isInteger(filters.limit) ? (filters.limit ?? 20) : 20),
    );
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
    const code = Buffer.from(`${providerId}-${today}-oficio`).toString(
      'base64',
    );

    return { code, expiresAt: `${today}T23:59:59` };
  }

  // ── VALIDAR CÓDIGO QR ─────────────────────────────────────
  async validateQrCode(providerId: number, code: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const expectedCode = Buffer.from(`${providerId}-${today}-oficio`).toString(
      'base64',
    );
    return code === expectedCode;
  }

  // ── EDITAR RESEÑA ────────────────────────────────────────
  async updateReview(
    reviewId: number,
    userId: number,
    data: { rating?: number; comment?: string; photoUrl?: string },
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Reseña no encontrada');
    if (review.userId !== userId)
      throw new ForbiddenException('No puedes editar esta reseña');

    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new BadRequestException('La calificación debe ser entre 1 y 5');
    }

    let photoUrl = data.photoUrl;
    if (
      photoUrl?.trim() &&
      !this.minio.isSameImageReference(review.photoUrl, photoUrl)
    ) {
      photoUrl = this.minio.assertManagedImageUrl(
        photoUrl,
        REVIEW_IMAGE_FOLDERS,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: {
          ...(data.rating !== undefined && { rating: data.rating }),
          ...(data.comment !== undefined && { comment: data.comment }),
          ...(data.photoUrl !== undefined && { photoUrl }),
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
        },
      });

      // Recalcular promedio del proveedor
      const agg = await tx.review.aggregate({
        where: { providerId: review.providerId, isVisible: true },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await tx.provider.update({
        where: { id: review.providerId },
        data: {
          averageRating: agg._avg.rating ?? 0,
          totalReviews: agg._count.rating,
        },
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
      include: {
        provider: { select: { userId: true, businessName: true, type: true } },
      },
    });
    if (!review) throw new NotFoundException('Reseña no encontrada');

    const isReviewer = review.userId === data.userId;
    const isProviderOwner = review.provider.userId === data.userId;
    if (!isReviewer && !isProviderOwner) {
      throw new ForbiddenException(
        'Solo el autor de la reseña o el titular del negocio/servicio pueden responder',
      );
    }

    const photoUrl = this.validateNewPhotoUrl(data.photoUrl);
    const reply = await this.prisma.reviewReply.create({
      data: {
        reviewId: data.reviewId,
        userId: data.userId,
        content: data.content,
        photoUrl,
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    // Notificación cruzada: proveedor → revisor y viceversa
    const replierUser = reply as typeof reply & {
      user?: { firstName: string; lastName: string };
    };
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
    const exists = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
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
  private validateNewPhotoUrl(photoUrl?: string): string | undefined {
    return photoUrl?.trim()
      ? this.minio.assertManagedImageUrl(photoUrl, REVIEW_IMAGE_FOLDERS)
      : photoUrl;
  }

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

  /// Prueba de interacción: el usuario solo puede reseñar a un proveedor
  /// con el que YA interactuó. Verifica, en orden:
  ///   a) AUCTION  — adjudicó una oferta de este proveedor en una subasta.
  ///   b) CONTACT  — hizo click de WhatsApp/llamada hace más de 24h.
  ///   c) CHAT     — tiene una sala de chat con el proveedor.
  private async canUserReview(
    userId: number,
    providerId: number,
  ): Promise<{ allowed: boolean; method?: string }> {
    // a) Subasta adjudicada a este proveedor.
    const awarded = await this.prisma.serviceRequest.findFirst({
      where: {
        userId,
        status: 'AWARDED',
        offers: { some: { providerId, status: 'ACCEPTED' } },
      },
      select: { id: true },
    });
    if (awarded) return { allowed: true, method: 'AUCTION' };

    // b) Contacto (WhatsApp o llamada) con más de 24h de antigüedad.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const contact = await this.prisma.providerAnalytic.findFirst({
      where: {
        providerId,
        userId,
        eventType: { in: ['whatsapp_click', 'call_click'] },
        createdAt: { lt: dayAgo },
      },
      select: { id: true },
    });
    if (contact) return { allowed: true, method: 'CONTACT' };

    // c) Sala de chat existente entre ambos.
    const chat = await this.prisma.chatRoom.findFirst({
      where: { clientId: userId, providerId },
      select: { id: true },
    });
    if (chat) return { allowed: true, method: 'CHAT' };

    return { allowed: false };
  }

  /// Versión pública para GET /reviews/can-review/:providerId — el front
  /// la usa para habilitar/deshabilitar el botón de dejar reseña.
  async canReview(userId: number, providerId: number) {
    const result = await this.canUserReview(userId, providerId);
    return { canReview: result.allowed, method: result.method ?? null };
  }
}
