/**
 * UNIT — SubastasService.
 *
 * Cubre las invariantes que un bug haría perder dinero o reputación:
 *
 *   • submitOffer:
 *       – 404 si la solicitud no existe.
 *       – BadRequest si la solicitud no está OPEN o ya expiró.
 *       – BadRequest cuando el cupo (5) está lleno.
 *       – BadRequest cuando el provider ya envió oferta a esa solicitud.
 *       – Cierra la solicitud a CLOSED cuando el cupo se completa con la
 *         oferta recién creada.
 *       – Propaga errores P2002 (constraint unique a nivel BD) — la
 *         defensa final contra ofertas duplicadas vive en la BD, no en
 *         el guard de aplicación, así que el servicio NO debe tragárselos.
 *
 *   • acceptOffer:
 *       – 404 si la oferta no existe.
 *       – Forbidden si el caller no es dueño de la solicitud.
 *       – BadRequest si la solicitud ya estaba en estado terminal
 *         (AWARDED, EXPIRED, CANCELLED).
 *       – BLOQUEO de doble adjudicación: si otra oferta ya está
 *         ACCEPTED, el guard `alreadyAccepted` rechaza la operación
 *         ANTES del update.
 *       – Defensa-en-profundidad: si la BD lanza P2002 durante el
 *         update (race condition que pasó por el guard), el error se
 *         propaga sin corromper el estado.
 *       – En el path feliz: ACCEPTED en la elegida, REJECTED en las
 *         demás PENDING, request → AWARDED, notificación al ganador.
 *
 *   • expireStaleRequests:
 *       – Solo procesa solicitudes OPEN con expiresAt <= now.
 *       – Incrementa el contador no-pick del cliente si la request
 *         tenía ofertas (= cliente desperdició ofertas sin elegir).
 *       – Aisla fallos: si una request explota, las demás siguen.
 *
 *   • withdrawOffer:
 *       – Solo el dueño del provider y solo si la oferta sigue PENDING.
 */

import { SubastasService } from '../../src/subastas/subastas.service.js';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock';
import { createEventsGatewayMock, EventsGatewayMock } from '../mocks/events-gateway.mock';
import { createPushMock, PushMock } from '../mocks/push.mock';
import { providerFixture } from '../fixtures/providers.fixture';
import { userFixture } from '../fixtures/users.fixture';

describe('SubastasService (unit)', () => {
  let service: SubastasService;
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let push: PushMock;

  // IDs estables para todos los tests.
  const CLIENT_USER_ID    = 1;       // dueño de la solicitud
  const PROVIDER_ID       = 10;      // provider que oferta
  const PROVIDER_USER_ID  = 2;       // dueño del provider
  const REQUEST_ID        = 500;
  const OFFER_ID          = 600;

  /** Solicitud OPEN, dentro de plazo, sin ofertas. */
  const openRequest = (overrides: Record<string, unknown> = {}) => ({
    id:               REQUEST_ID,
    userId:           CLIENT_USER_ID,
    categoryId:       1,
    description:      'Necesito gasfitería urgente',
    photoUrl:         null,
    budgetMin:        50,
    budgetMax:        200,
    desiredDate:      null,
    latitude:         null,
    longitude:        null,
    department:       'Lima',
    province:         'Lima',
    district:         'Miraflores',
    status:           'OPEN',
    maxOffers:        5,
    notifyRadiusKm:   5,
    expiresAt:        new Date(Date.now() + 12 * 3600_000), // +12h, vigente
    createdAt:        new Date('2026-01-01T00:00:00Z'),
    updatedAt:        new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  /** Oferta PENDING base. */
  const pendingOffer = (overrides: Record<string, unknown> = {}) => ({
    id:               OFFER_ID,
    serviceRequestId: REQUEST_ID,
    providerId:       PROVIDER_ID,
    price:            120,
    message:          'Puedo ir hoy mismo',
    status:           'PENDING',
    arrivedAt:        null,
    arrivedLat:       null,
    arrivedLng:       null,
    createdAt:        new Date(),
    updatedAt:        new Date(),
    ...overrides,
  });

  beforeEach(() => {
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    push   = createPushMock();
    service = new SubastasService(prisma as any, events as any, push as any);
  });

  // ────────────────────────────────────────────────────────────────
  //  submitOffer
  // ────────────────────────────────────────────────────────────────
  describe('submitOffer()', () => {
    const dto = { serviceRequestId: REQUEST_ID, price: 150, message: 'Disponible mañana' };

    it('lanza NotFoundException si la solicitud no existe', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(null);
      await expect(service.submitOffer(PROVIDER_ID, dto))
        .rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si la solicitud ya está CLOSED', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(openRequest({ status: 'CLOSED' }));
      await expect(service.submitOffer(PROVIDER_ID, dto))
        .rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si la solicitud ya expiró', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(
        openRequest({ expiresAt: new Date(Date.now() - 60_000) }),
      );
      await expect(service.submitOffer(PROVIDER_ID, dto))
        .rejects.toThrow(/expirado/i);
    });

    it('lanza BadRequestException cuando el cupo (5) ya está lleno', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(openRequest());
      prisma.offer.count.mockResolvedValue(5); // = maxOffers
      await expect(service.submitOffer(PROVIDER_ID, dto))
        .rejects.toThrow(/máximo/i);
    });

    it('lanza BadRequestException si el mismo provider ya tiene una oferta en esa solicitud', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(openRequest());
      prisma.offer.count.mockResolvedValue(2);
      prisma.offer.findUnique.mockResolvedValue(pendingOffer()); // ya existe
      await expect(service.submitOffer(PROVIDER_ID, dto))
        .rejects.toThrow(/Ya enviaste/i);
    });

    it('crea la oferta y notifica al cliente en el path feliz', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(openRequest());
      prisma.offer.count.mockResolvedValue(1); // 1 oferta previa
      prisma.offer.findUnique.mockResolvedValue(null); // este provider no había ofertado
      prisma.offer.create.mockResolvedValue({
        ...pendingOffer(),
        provider: {
          businessName:  'Plomería Pérez',
          averageRating: 4.5,
          isTrusted:     true,
          user:          { avatarUrl: null },
        },
      });

      const result = await service.submitOffer(PROVIDER_ID, dto);

      expect(result.id).toBe(OFFER_ID);
      expect(prisma.offer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            serviceRequestId: REQUEST_ID,
            providerId:       PROVIDER_ID,
            price:            150,
          }),
        }),
      );
      // No se cerró la request (solo había 1 + esta = 2 < 5).
      expect(prisma.serviceRequest.update).not.toHaveBeenCalled();
      // Notif NEW_OFFER al dueño de la solicitud.
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type:         'NEW_OFFER',
          targetUserId: CLIENT_USER_ID,
        }),
      );
      expect(push.sendToUser).toHaveBeenCalledWith(
        CLIENT_USER_ID,
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ type: 'NEW_OFFER' }),
      );
    });

    it('cierra la solicitud a CLOSED cuando la oferta recién creada llena el cupo (4+1=5)', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(openRequest());
      prisma.offer.count.mockResolvedValue(4); // 4 previas + esta = 5 → cupo lleno
      prisma.offer.findUnique.mockResolvedValue(null);
      prisma.offer.create.mockResolvedValue({
        ...pendingOffer(),
        provider: {
          businessName:  'Provider 5',
          averageRating: 4.0,
          isTrusted:     false,
          user:          { avatarUrl: null },
        },
      });

      await service.submitOffer(PROVIDER_ID, dto);

      // Aquí SÍ se debe llamar update para marcar la request CLOSED.
      expect(prisma.serviceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: REQUEST_ID },
          data:  { status: 'CLOSED' },
        }),
      );
    });

    /**
     * Race condition simulada con error P2002 de Prisma.
     *
     * Escenario: dos providers intentan ofertar simultáneamente al
     * último cupo. El guard de aplicación (count) pasa para ambos
     * porque ven el mismo count, pero al hacer `offer.create` la BD
     * detecta la violación del unique compound `(serviceRequestId,
     * providerId)` si el mismo provider hubiera ofertado dos veces, o
     * simplemente excede el cupo. Aquí inyectamos el P2002 directo
     * en `offer.create` para verificar que el servicio NO se traga el
     * error — debe propagarlo para que el cliente sepa que su oferta
     * NO se registró (defensa-en-profundidad sobre el guard de count).
     */
    it('propaga errores P2002 de Prisma como defensa final contra ofertas duplicadas', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(openRequest());
      prisma.offer.count.mockResolvedValue(2);
      prisma.offer.findUnique.mockResolvedValue(null);
      const dbConstraintError = Object.assign(
        new Error('Unique constraint failed on the fields: (`serviceRequestId`,`providerId`)'),
        { code: 'P2002', meta: { target: ['serviceRequestId', 'providerId'] } },
      );
      prisma.offer.create.mockRejectedValue(dbConstraintError);

      await expect(service.submitOffer(PROVIDER_ID, dto))
        .rejects.toMatchObject({ code: 'P2002' });
      // Y NO se debe haber emitido notif al cliente — no hubo oferta.
      expect(events.emitNotification).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'NEW_OFFER' }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  acceptOffer
  // ────────────────────────────────────────────────────────────────
  describe('acceptOffer()', () => {
    const dto = { offerId: OFFER_ID };

    it('lanza NotFoundException si la oferta no existe', async () => {
      prisma.offer.findUnique.mockResolvedValue(null);
      await expect(service.acceptOffer(CLIENT_USER_ID, dto))
        .rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el caller no es dueño de la solicitud', async () => {
      prisma.offer.findUnique.mockResolvedValue({
        ...pendingOffer(),
        serviceRequest: openRequest(), // userId=1
      });
      // Otro user intenta aceptar
      await expect(service.acceptOffer(/*otro user*/ 99, dto))
        .rejects.toThrow(ForbiddenException);
    });

    it('lanza BadRequestException si la solicitud ya está AWARDED', async () => {
      prisma.offer.findUnique.mockResolvedValue({
        ...pendingOffer(),
        serviceRequest: openRequest({ status: 'AWARDED' }),
      });
      await expect(service.acceptOffer(CLIENT_USER_ID, dto))
        .rejects.toThrow(/no permite cambios/i);
    });

    it('lanza BadRequestException si la solicitud está EXPIRED o CANCELLED', async () => {
      for (const status of ['EXPIRED', 'CANCELLED']) {
        prisma.offer.findUnique.mockResolvedValue({
          ...pendingOffer(),
          serviceRequest: openRequest({ status }),
        });
        await expect(service.acceptOffer(CLIENT_USER_ID, dto))
          .rejects.toThrow(BadRequestException);
      }
    });

    /**
     * Guard de doble adjudicación: el servicio busca con `offer.findFirst`
     * si ya existe otra oferta ACCEPTED para la misma solicitud ANTES de
     * hacer el update. Esto cubre el caso de dos clicks rápidos del mismo
     * cliente o dos sesiones que aceptan ofertas distintas al mismo tiempo.
     */
    it('BLOQUEA doble adjudicación si otra oferta ya está ACCEPTED', async () => {
      prisma.offer.findUnique.mockResolvedValue({
        ...pendingOffer(),
        serviceRequest: openRequest({ status: 'CLOSED' }), // cupo lleno, eligiendo
      });
      prisma.offer.findFirst.mockResolvedValue({ id: 999 }); // ya hay otra ACCEPTED

      await expect(service.acceptOffer(CLIENT_USER_ID, dto))
        .rejects.toThrow(/Ya hay una oferta aceptada/i);

      // No se debe haber tocado ningún update.
      expect(prisma.offer.update).not.toHaveBeenCalled();
      expect(prisma.offer.updateMany).not.toHaveBeenCalled();
      expect(prisma.serviceRequest.update).not.toHaveBeenCalled();
    });

    /**
     * Path feliz: acepta una, rechaza las demás PENDING, marca AWARDED,
     * notifica al provider ganador (in-app + push + persiste en
     * adminNotification para sobrevivir cambios de cuenta).
     */
    it('aplica la transacción completa: ACCEPTED + REJECTED resto + AWARDED + notifica al ganador', async () => {
      prisma.offer.findUnique.mockResolvedValue({
        ...pendingOffer(),
        serviceRequest: openRequest({ status: 'OPEN' }),
      });
      prisma.offer.findFirst.mockResolvedValue(null); // ninguna ACCEPTED previa
      prisma.offer.update.mockResolvedValue({});
      prisma.offer.updateMany.mockResolvedValue({ count: 3 });
      prisma.serviceRequest.update.mockResolvedValue({});
      prisma.provider.findUnique.mockResolvedValue({
        userId:       PROVIDER_USER_ID,
        businessName: 'Plomería Pérez',
      });
      prisma.adminNotification.create.mockResolvedValue({});

      const result = await service.acceptOffer(CLIENT_USER_ID, dto);

      expect(result).toEqual({ success: true, offerId: OFFER_ID });

      // 1. Marca la oferta elegida como ACCEPTED.
      expect(prisma.offer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: OFFER_ID },
          data:  { status: 'ACCEPTED' },
        }),
      );

      // 2. Rechaza el resto de PENDING.
      expect(prisma.offer.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceRequestId: REQUEST_ID,
            id:               { not: OFFER_ID },
            status:           'PENDING',
          }),
          data: { status: 'REJECTED' },
        }),
      );

      // 3. Marca la solicitud como AWARDED.
      expect(prisma.serviceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: REQUEST_ID },
          data:  { status: 'AWARDED' },
        }),
      );

      // 4. Persiste la notificación al ganador (obs 7: sobrevive a
      //    cambios de cuenta multi-perfil en mismo dispositivo).
      expect(prisma.adminNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerId:   PROVIDER_ID,
            type:         'OFERTA_ACEPTADA',
            targetUserId: PROVIDER_USER_ID,
          }),
        }),
      );

      // 5. WS + push al provider ganador.
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type:         'OFFER_ACCEPTED',
          targetUserId: PROVIDER_USER_ID,
        }),
      );
      expect(push.sendToUser).toHaveBeenCalledWith(
        PROVIDER_USER_ID,
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ type: 'OFFER_ACCEPTED' }),
      );
    });

    /**
     * Defensa-en-profundidad: si dos requests pasan el guard
     * `alreadyAccepted` por timing (read antes de que la otra termine),
     * el update de la segunda chocaría contra cualquier unique
     * constraint que la BD imponga. Inyectamos P2002 en offer.update y
     * confirmamos que el error se propaga — el servicio NO debe
     * silenciarlo y marcar AWARDED a una request ya adjudicada.
     */
    it('propaga P2002 si la BD detecta la violación durante el update (race condition real)', async () => {
      prisma.offer.findUnique.mockResolvedValue({
        ...pendingOffer(),
        serviceRequest: openRequest({ status: 'OPEN' }),
      });
      prisma.offer.findFirst.mockResolvedValue(null);
      const dbErr = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
      });
      prisma.offer.update.mockRejectedValue(dbErr);

      await expect(service.acceptOffer(CLIENT_USER_ID, dto))
        .rejects.toMatchObject({ code: 'P2002' });

      // Y NO se debió marcar nada como AWARDED ni notificar.
      expect(prisma.serviceRequest.update).not.toHaveBeenCalled();
      expect(events.emitNotification).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'OFFER_ACCEPTED' }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  expireStaleRequests
  // ────────────────────────────────────────────────────────────────
  describe('expireStaleRequests()', () => {
    it('procesa solo solicitudes OPEN vencidas y devuelve contadores', async () => {
      const expired = [
        { ...openRequest({ id: 1, expiresAt: new Date(Date.now() - 60_000) }), offers: [] },
        { ...openRequest({ id: 2, expiresAt: new Date(Date.now() - 120_000) }),
          offers: [pendingOffer({ id: 11, serviceRequestId: 2 })] },
      ];
      prisma.serviceRequest.findMany.mockResolvedValue(expired);
      // userPenalty.upsert para _incrementNoPick.
      prisma.userPenalty.upsert.mockResolvedValue({});
      // $queryRaw devuelve el RETURNING del UPDATE atómico.
      prisma.$queryRaw.mockResolvedValue([{ noPickCount: 1 }]);

      const result = await service.expireStaleRequests();

      expect(result).toEqual({ expired: 2, failed: 0, total: 2 });
      // El filtro de búsqueda debe restringir a status OPEN + expiresAt <= now.
      expect(prisma.serviceRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status:    'OPEN',
            expiresAt: { lte: expect.any(Date) },
          }),
        }),
      );
    });

    it('aísla fallos por request — un crash no detiene el resto', async () => {
      const expired = [
        { ...openRequest({ id: 1 }), offers: [] },
        { ...openRequest({ id: 2 }), offers: [] },
        { ...openRequest({ id: 3 }), offers: [] },
      ];
      prisma.serviceRequest.findMany.mockResolvedValue(expired);

      // La segunda transacción explota; las otras dos deben procesarse.
      prisma.$transaction
        .mockResolvedValueOnce([] as any)
        .mockRejectedValueOnce(new Error('boom on id=2'))
        .mockResolvedValueOnce([] as any);

      const result = await service.expireStaleRequests();

      expect(result.total).toBe(3);
      expect(result.expired).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('incrementa no-pick SOLO si la solicitud tenía ofertas pendientes', async () => {
      const expired = [
        { ...openRequest({ id: 1, userId: CLIENT_USER_ID }), offers: [] }, // sin ofertas
        { ...openRequest({ id: 2, userId: CLIENT_USER_ID }),
          offers: [pendingOffer({ id: 99, serviceRequestId: 2 })] },        // con ofertas
      ];
      prisma.serviceRequest.findMany.mockResolvedValue(expired);
      prisma.userPenalty.upsert.mockResolvedValue({});
      prisma.$queryRaw.mockResolvedValue([{ noPickCount: 1 }]);

      await service.expireStaleRequests();

      // upsert solo se llama para la request 2 (la que tenía ofertas).
      expect(prisma.userPenalty.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.userPenalty.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: CLIENT_USER_ID } }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  withdrawOffer
  // ────────────────────────────────────────────────────────────────
  describe('withdrawOffer()', () => {
    it('lanza ForbiddenException si el provider no es dueño de la oferta', async () => {
      prisma.offer.findUnique.mockResolvedValue(
        pendingOffer({ providerId: 999 }), // otro provider
      );
      await expect(service.withdrawOffer(PROVIDER_ID, OFFER_ID))
        .rejects.toThrow(ForbiddenException);
    });

    it('lanza BadRequestException si la oferta no está PENDING', async () => {
      prisma.offer.findUnique.mockResolvedValue(
        pendingOffer({ status: 'ACCEPTED' }),
      );
      await expect(service.withdrawOffer(PROVIDER_ID, OFFER_ID))
        .rejects.toThrow(/pendientes/i);
    });

    it('marca la oferta como WITHDRAWN en el path feliz', async () => {
      prisma.offer.findUnique.mockResolvedValue(pendingOffer());
      prisma.offer.update.mockResolvedValue({ ...pendingOffer(), status: 'WITHDRAWN' });

      const result = await service.withdrawOffer(PROVIDER_ID, OFFER_ID);

      expect(result.status).toBe('WITHDRAWN');
      expect(prisma.offer.update).toHaveBeenCalledWith({
        where: { id: OFFER_ID },
        data:  { status: 'WITHDRAWN' },
      });
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Sanidad de fixtures (sirve para detectar drift entre fixture/code)
  // ────────────────────────────────────────────────────────────────
  describe('sanity', () => {
    it('userFixture y providerFixture devuelven IDs coherentes con los tests', () => {
      expect(userFixture({ id: CLIENT_USER_ID }).id).toBe(1);
      expect(providerFixture({ id: PROVIDER_ID, userId: PROVIDER_USER_ID }).userId).toBe(2);
    });
  });
});
