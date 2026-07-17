/**
 * UNIT — ReviewsService.
 * Reglas críticas: rating 1-5, gate de interacción (subasta/contacto/chat)
 * antes de reseñar, una reseña por usuario, ownership al editar, permisos
 * de respuesta (autor o titular), recálculo de promedio en transacción.
 */
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ReviewsService } from '../../src/reviews/reviews.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  type EventsGatewayMock,
} from '../mocks/events-gateway.mock';
import { createPushMock, type PushMock } from '../mocks/push.mock';

describe('ReviewsService (unit)', () => {
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let push: PushMock;
  let minio: {
    assertManagedImageUrl: jest.Mock;
    isSameImageReference: jest.Mock;
  };
  let service: ReviewsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    push = createPushMock();
    minio = {
      assertManagedImageUrl: jest.fn((url: string) => url),
      isSameImageReference: jest.fn(
        (current: string | null, next: string | null) => current === next,
      ),
    };
    service = new ReviewsService(
      prisma as any,
      events as any,
      push as any,
      minio as any,
    );
  });

  describe('create()', () => {
    const base = { providerId: 3, userId: 7, rating: 5, comment: 'Bien' };

    it('rechaza una foto nueva fuera del almacenamiento de Servi', async () => {
      minio.assertManagedImageUrl.mockImplementationOnce(() => {
        throw new BadRequestException('URL no permitida');
      });
      await expect(
        service.create({
          ...base,
          photoUrl: 'https://evil.example/review.jpg',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.provider.findUnique).not.toHaveBeenCalled();
    });

    it('rating fuera de 1-5 → BadRequest', async () => {
      await expect(service.create({ ...base, rating: 0 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create({ ...base, rating: 6 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('proveedor inexistente → NotFound', async () => {
      prisma.provider.findUnique.mockResolvedValue(null);
      await expect(service.create(base)).rejects.toThrow(NotFoundException);
    });

    it('ya reseñó antes a este proveedor → BadRequest', async () => {
      prisma.provider.findUnique.mockResolvedValue({ id: 3, userId: 9 });
      prisma.review.findFirst.mockResolvedValue({ id: 1 });
      await expect(service.create(base)).rejects.toThrow(BadRequestException);
    });

    it('sin interacción previa (gate) → Forbidden', async () => {
      prisma.provider.findUnique.mockResolvedValue({ id: 3, userId: 9 });
      prisma.review.findFirst.mockResolvedValue(null);
      // canUserReview: ninguna fuente de interacción.
      prisma.serviceRequest.findFirst.mockResolvedValue(null);
      prisma.providerAnalytic.findFirst.mockResolvedValue(null);
      prisma.chatRoom.findFirst.mockResolvedValue(null);
      await expect(service.create(base)).rejects.toThrow(ForbiddenException);
    });

    it('éxito: crea reseña en transacción, persiste notif y emite WS + push', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: 3,
        userId: 9,
        type: 'OFICIO',
      });
      prisma.review.findFirst.mockResolvedValue(null);
      // Interacción válida vía chat.
      prisma.serviceRequest.findFirst.mockResolvedValue(null);
      prisma.providerAnalytic.findFirst.mockResolvedValue(null);
      prisma.chatRoom.findFirst.mockResolvedValue({ id: 11 });
      prisma.review.create.mockResolvedValue({
        id: 50,
        rating: 5,
        user: { firstName: 'Ana', lastName: 'Soto', avatarUrl: null },
      });
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 5 },
        _count: { rating: 1 },
      });

      const res = await service.create(base);

      expect(prisma.review.create).toHaveBeenCalled();
      expect(prisma.provider.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 3 },
          data: { averageRating: 5, totalReviews: 1 },
        }),
      );
      // Notificación PERSISTIDA (sobrevive cambio de cuenta) — no solo WS.
      expect(prisma.adminNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'NEW_REVIEW',
            targetUserId: 9,
          }),
        }),
      );
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'NEW_REVIEW', targetUserId: 9 }),
      );
      expect(push.sendToUser).toHaveBeenCalledWith(
        9,
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ type: 'NEW_REVIEW' }),
      );
      expect((res as any).id).toBe(50);
    });
  });

  describe('canReview()', () => {
    it('subasta adjudicada → AUCTION', async () => {
      prisma.serviceRequest.findFirst.mockResolvedValue({ id: 1 });
      await expect(service.canReview(7, 3)).resolves.toEqual({
        canReview: true,
        method: 'AUCTION',
      });
    });

    it('contacto previo (>24h) → CONTACT', async () => {
      prisma.serviceRequest.findFirst.mockResolvedValue(null);
      prisma.providerAnalytic.findFirst.mockResolvedValue({ id: 2 });
      await expect(service.canReview(7, 3)).resolves.toEqual({
        canReview: true,
        method: 'CONTACT',
      });
    });

    it('sala de chat existente → CHAT', async () => {
      prisma.serviceRequest.findFirst.mockResolvedValue(null);
      prisma.providerAnalytic.findFirst.mockResolvedValue(null);
      prisma.chatRoom.findFirst.mockResolvedValue({ id: 3 });
      await expect(service.canReview(7, 3)).resolves.toEqual({
        canReview: true,
        method: 'CHAT',
      });
    });

    it('sin interacción → canReview false, method null', async () => {
      prisma.serviceRequest.findFirst.mockResolvedValue(null);
      prisma.providerAnalytic.findFirst.mockResolvedValue(null);
      prisma.chatRoom.findFirst.mockResolvedValue(null);
      await expect(service.canReview(7, 3)).resolves.toEqual({
        canReview: false,
        method: null,
      });
    });
  });

  describe('updateReview()', () => {
    it('reseña inexistente → NotFound', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(service.updateReview(1, 7, { rating: 4 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('no es el autor → Forbidden', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: 1,
        userId: 99,
        providerId: 3,
      });
      await expect(service.updateReview(1, 7, { rating: 4 })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rating fuera de rango → BadRequest', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: 1,
        userId: 7,
        providerId: 3,
      });
      await expect(service.updateReview(1, 7, { rating: 9 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('éxito: actualiza y recalcula promedio del proveedor', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: 1,
        userId: 7,
        providerId: 3,
      });
      prisma.review.update.mockResolvedValue({ id: 1, rating: 4 });
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4 },
        _count: { rating: 2 },
      });
      const res = await service.updateReview(1, 7, { rating: 4 });
      expect(prisma.review.update).toHaveBeenCalled();
      expect(prisma.provider.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 3 },
          data: { averageRating: 4, totalReviews: 2 },
        }),
      );
      expect((res as any).id).toBe(1);
    });

    it('permite conservar una foto historica sin revalidarla', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: 1,
        userId: 7,
        providerId: 3,
        photoUrl: 'https://legacy.example/review.jpg',
      });
      minio.isSameImageReference.mockReturnValueOnce(true);
      prisma.review.update.mockResolvedValue({ id: 1 });
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 5 },
        _count: { rating: 1 },
      });

      await service.updateReview(1, 7, {
        photoUrl: 'https://legacy.example/review.jpg',
      });

      expect(minio.assertManagedImageUrl).not.toHaveBeenCalled();
    });
  });

  describe('moderate()', () => {
    it('reseña inexistente → NotFound', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(service.moderate(1, false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('éxito: actualiza visibilidad y recalcula promedio', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 1, providerId: 3 });
      prisma.review.update.mockResolvedValue({ id: 1, isVisible: false });
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 5 },
        _count: { rating: 1 },
      });
      await service.moderate(1, false);
      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isVisible: false },
      });
      expect(prisma.provider.update).toHaveBeenCalled();
    });
  });

  describe('createReply()', () => {
    const reviewRow = {
      id: 1,
      userId: 7,
      provider: { userId: 99, businessName: 'Negocio X', type: 'NEGOCIO' },
    };

    it('reseña inexistente → NotFound', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(
        service.createReply({ reviewId: 1, userId: 7, content: 'hola' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ni autor ni titular → Forbidden', async () => {
      prisma.review.findUnique.mockResolvedValue(reviewRow);
      await expect(
        service.createReply({ reviewId: 1, userId: 50, content: 'hola' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('autor responde → notifica al titular del negocio', async () => {
      prisma.review.findUnique.mockResolvedValue(reviewRow);
      prisma.reviewReply.create.mockResolvedValue({
        id: 5,
        user: { firstName: 'Ana', lastName: 'Soto' },
      });
      await service.createReply({ reviewId: 1, userId: 7, content: 'gracias' });
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REVIEW_REPLY', targetUserId: 99 }),
      );
    });

    it('titular responde → notifica al autor de la reseña', async () => {
      prisma.review.findUnique.mockResolvedValue(reviewRow);
      prisma.reviewReply.create.mockResolvedValue({
        id: 6,
        user: { firstName: 'Dueño', lastName: 'X' },
      });
      await service.createReply({ reviewId: 1, userId: 99, content: 'ok' });
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REVIEW_REPLY', targetUserId: 7 }),
      );
    });
  });

  describe('getReplies()', () => {
    it('reseña inexistente → NotFound', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(service.getReplies(1)).rejects.toThrow(NotFoundException);
    });

    it('éxito: devuelve respuestas ordenadas', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 1 });
      prisma.reviewReply.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      await expect(service.getReplies(1)).resolves.toHaveLength(2);
    });
  });

  describe('findByProvider()', () => {
    it('devuelve listado paginado con total y lastPage', async () => {
      prisma.review.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.review.count.mockResolvedValue(1);
      const res = await service.findByProvider(3, 1, 10);
      expect(res).toEqual({
        data: [{ id: 1 }],
        total: 1,
        page: 1,
        lastPage: 1,
      });
    });
  });

  it('caps public review pagination before querying Prisma', async () => {
    prisma.review.findMany.mockResolvedValue([]);
    prisma.review.count.mockResolvedValue(0);

    await service.findByProvider(3, -5, 500000);

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 }),
    );
  });

  describe('validateQrCode()', () => {
    it('código correcto del día → true; incorrecto → false', async () => {
      const { code } = await service.generateQrCode(3);
      await expect(service.validateQrCode(3, code)).resolves.toBe(true);
      await expect(service.validateQrCode(3, 'basura')).resolves.toBe(false);
    });
  });
});
