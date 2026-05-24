/**
 * INTEGRATION — Flujo completo de subastas contra Postgres real.
 *
 * Verifica que la transacción atómica de submitOffer + acceptOffer
 * efectivamente persiste cambios en BD y que la doble adjudicación se
 * bloquea contra una BD viva (no solo en el guard de aplicación).
 *
 * Cubre:
 *   1. createRequest → registra ServiceRequest OPEN, expiresAt 24h.
 *   2. submitOffer x N hasta 5 → crea ofertas PENDING; al llenar el
 *      cupo, status pasa a CLOSED.
 *   3. acceptOffer → marca offer ACCEPTED, REJECTED las demás
 *      PENDING, request → AWARDED.
 *   4. Segundo intento de acceptOffer → BadRequestException
 *      (la BD ya tiene la primera ACCEPTED y el guard lo detecta).
 */

import { SubastasService } from '../../src/subastas/subastas.service.js';
import { getTestPrisma, disconnectTestPrisma, truncateAll, ensureSeedCatalogs } from '../utils/db.util';
import { createEventsGatewayMock } from '../mocks/events-gateway.mock';
import { createPushMock } from '../mocks/push.mock';
import { createTestUser, createTestProvider } from '../utils/factories';
import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';

function build(prisma: PrismaService) {
  const events = createEventsGatewayMock();
  const push   = createPushMock();
  const service = new SubastasService(prisma, events as any, push as any);
  return { service, events, push };
}

describe('Subastas flow (integration)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await getTestPrisma();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
    await ensureSeedCatalogs(prisma);
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  it('crea solicitud → 2 ofertas → acepta una → request AWARDED + otras REJECTED', async () => {
    const { service } = build(prisma);

    // Cliente + 2 providers de la misma categoría.
    const client    = await createTestUser(prisma);
    const user1     = await createTestUser(prisma, { email: `prov1-${Date.now()}@x.com` });
    const user2     = await createTestUser(prisma, { email: `prov2-${Date.now()}@x.com` });
    const provider1 = await createTestProvider(prisma, user1.id, { categoryName: 'Gasfitería' });
    // Reusar la misma category que provider1 (mismo nombre → mismo slug).
    const provider2 = await createTestProvider(prisma, user2.id, { categoryName: 'Gasfitería' });
    expect(provider1.categoryId).toBe(provider2.categoryId);

    // 1. createRequest
    const request = await service.createRequest(client.id, {
      categoryId:  provider1.categoryId,
      description: 'Necesito reparar caño del baño',
      department:  'Lima',
      province:    'Lima',
      district:    'Miraflores',
    });
    expect(request.status).toBe('OPEN');
    expect(request.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // 2. submitOffer x 2 (ambos providers)
    const offer1 = await service.submitOffer(provider1.id, {
      serviceRequestId: request.id,
      price:            150,
      message:          'Voy mañana en la mañana',
    });
    expect(offer1.status).toBe('PENDING');

    const offer2 = await service.submitOffer(provider2.id, {
      serviceRequestId: request.id,
      price:            180,
      message:          'Hoy mismo si quieres',
    });
    expect(offer2.status).toBe('PENDING');

    // Ambas en BD.
    const offers = await prisma.offer.findMany({ where: { serviceRequestId: request.id } });
    expect(offers).toHaveLength(2);

    // 3. acceptOffer (la primera).
    const result = await service.acceptOffer(client.id, { offerId: offer1.id });
    expect(result.success).toBe(true);

    // Estado final en BD:
    const r = await prisma.serviceRequest.findUnique({ where: { id: request.id } });
    expect(r!.status).toBe('AWARDED');

    const o1 = await prisma.offer.findUnique({ where: { id: offer1.id } });
    const o2 = await prisma.offer.findUnique({ where: { id: offer2.id } });
    expect(o1!.status).toBe('ACCEPTED');
    expect(o2!.status).toBe('REJECTED');

    // El provider ganador tiene una adminNotification persistida
    // (obs 7 — el chat/oferta debe sobrevivir cambios de cuenta).
    const notif = await prisma.adminNotification.findFirst({
      where: { providerId: provider1.id, type: 'OFERTA_ACEPTADA' },
    });
    expect(notif).not.toBeNull();
    expect(notif!.targetUserId).toBe(user1.id);
  });

  it('impide doble adjudicación: segundo accept lanza BadRequestException', async () => {
    const { service } = build(prisma);

    const client    = await createTestUser(prisma);
    const u1        = await createTestUser(prisma, { email: `dup-prov1-${Date.now()}@x.com` });
    const u2        = await createTestUser(prisma, { email: `dup-prov2-${Date.now()}@x.com` });
    const provider1 = await createTestProvider(prisma, u1.id, { categoryName: 'Electricidad' });
    const provider2 = await createTestProvider(prisma, u2.id, { categoryName: 'Electricidad' });

    const request = await service.createRequest(client.id, {
      categoryId:  provider1.categoryId,
      description: 'Cambio de interruptores',
      department:  'Lima',
      province:    'Lima',
      district:    'Miraflores',
    });
    const offer1 = await service.submitOffer(provider1.id, {
      serviceRequestId: request.id,
      price: 100,
      message: 'Voy hoy',
    });
    const offer2 = await service.submitOffer(provider2.id, {
      serviceRequestId: request.id,
      price: 120,
      message: 'Voy mañana',
    });

    // Primera aceptación: OK.
    await service.acceptOffer(client.id, { offerId: offer1.id });

    // Segundo intento de aceptar OFFER2 ahora que la request está AWARDED:
    // según el código, lanza BadRequestException porque
    // serviceRequest.status ya no es OPEN ni CLOSED.
    await expect(service.acceptOffer(client.id, { offerId: offer2.id }))
      .rejects.toThrow(BadRequestException);

    // El estado final NO debe haber cambiado: offer1 sigue ACCEPTED,
    // offer2 sigue REJECTED.
    const finalRequest = await prisma.serviceRequest.findUnique({ where: { id: request.id } });
    const finalO1      = await prisma.offer.findUnique({ where: { id: offer1.id } });
    const finalO2      = await prisma.offer.findUnique({ where: { id: offer2.id } });
    expect(finalRequest!.status).toBe('AWARDED');
    expect(finalO1!.status).toBe('ACCEPTED');
    expect(finalO2!.status).toBe('REJECTED');
  });

  it('cuando 5 providers ofertan, la quinta oferta deja la request en CLOSED', async () => {
    const { service } = build(prisma);
    const client = await createTestUser(prisma);

    // 5 providers de la misma categoría.
    const providers: Awaited<ReturnType<typeof createTestProvider>>[] = [];
    for (let i = 0; i < 5; i++) {
      const u = await createTestUser(prisma, { email: `cap-prov${i}-${Date.now()}@x.com` });
      const p = await createTestProvider(prisma, u.id, { categoryName: 'Cerrajería' });
      providers.push(p);
    }
    const request = await service.createRequest(client.id, {
      categoryId:  providers[0].categoryId,
      description: 'Cambio de cerradura urgente',
      department:  'Lima',
      province:    'Lima',
      district:    'Miraflores',
    });

    for (let i = 0; i < 5; i++) {
      await service.submitOffer(providers[i].id, {
        serviceRequestId: request.id,
        price:            100 + i * 10,
        message:          `Oferta del proveedor ${i + 1}`,
      });
    }

    // Cupo lleno → request CLOSED.
    const r = await prisma.serviceRequest.findUnique({ where: { id: request.id } });
    expect(r!.status).toBe('CLOSED');

    // Un sexto intento debe ser rechazado.
    const u6 = await createTestUser(prisma, { email: `cap-prov6-${Date.now()}@x.com` });
    const p6 = await createTestProvider(prisma, u6.id, { categoryName: 'Cerrajería' });
    await expect(service.submitOffer(p6.id, {
      serviceRequestId: request.id,
      price:            999,
      message:          'Demasiado tarde',
    })).rejects.toThrow(/máximo|no está activa/i);
  });

  it('impide oferta duplicada del mismo provider en la misma request', async () => {
    const { service } = build(prisma);
    const client   = await createTestUser(prisma);
    const u        = await createTestUser(prisma, { email: `dup-${Date.now()}@x.com` });
    const provider = await createTestProvider(prisma, u.id, { categoryName: 'Limpieza' });

    const request = await service.createRequest(client.id, {
      categoryId:  provider.categoryId,
      description: 'Limpieza profunda apartamento',
      department:  'Lima',
      province:    'Lima',
      district:    'Miraflores',
    });

    await service.submitOffer(provider.id, {
      serviceRequestId: request.id,
      price:            200,
      message:          'Primera',
    });

    await expect(service.submitOffer(provider.id, {
      serviceRequestId: request.id,
      price:            150,
      message:          'Segunda (no debería entrar)',
    })).rejects.toThrow(/Ya enviaste/i);

    const offers = await prisma.offer.findMany({ where: { serviceRequestId: request.id } });
    expect(offers).toHaveLength(1);
  });
});
