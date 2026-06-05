/**
 * UNIT — SubastasService: penalización por cancelar ofertas (proveedor).
 *
 *   • submitOfferByUser bloquea con offerCancelCount >= 10 (403) ANTES de
 *     resolver el provider o crear la oferta.
 *   • submitOfferByUser con < 10 NO bloquea (resuelve el provider).
 *   • withdrawOfferByUser marca WITHDRAWN e incrementa el contador.
 *
 * Los tests existentes llaman a submitOffer/withdrawOffer DIRECTOS (providerId);
 * la penalización vive en los wrappers *ByUser → no los afecta.
 */
import { SubastasService } from '../../src/subastas/subastas.service.js';
import { ForbiddenException } from '@nestjs/common';

function makeDeps(prismaOver: Record<string, any> = {}) {
  const prisma: any = {
    provider: {
      findFirst: jest.fn(async () => ({ id: 10 })),
      findUnique: jest.fn(),
    },
    userPenalty: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async () => ({})),
    },
    offer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $executeRaw: jest.fn(async () => 1),
    ...prismaOver,
  };
  const events: any = { emitNotification: jest.fn(), emitSubastaNew: jest.fn() };
  const push: any = { sendToUser: jest.fn() };
  const service = new SubastasService(prisma, events, push);
  return { service, prisma };
}

const DTO = { serviceRequestId: 500, price: 150, message: 'Disponible' };

describe('SubastasService — penalización por cancelaciones', () => {
  it('submitOfferByUser: bloquea (403) con offerCancelCount >= 10', async () => {
    const { service, prisma } = makeDeps({
      userPenalty: {
        findUnique: jest.fn(async () => ({ offerCancelCount: 10 })),
        upsert: jest.fn(),
      },
    });

    await expect(service.submitOfferByUser(2, DTO)).rejects.toThrow(
      ForbiddenException,
    );
    // Cortó antes de resolver el provider o crear la oferta.
    expect(prisma.provider.findFirst).not.toHaveBeenCalled();
  });

  it('submitOfferByUser: con < 10 cancelaciones NO bloquea (resuelve provider)', async () => {
    const { service, prisma } = makeDeps({
      userPenalty: {
        findUnique: jest.fn(async () => ({ offerCancelCount: 3 })),
        upsert: jest.fn(),
      },
      // El provider activo existe; submitOffer fallará luego por falta de
      // mocks, pero NO con ForbiddenException → prueba que el gate pasó.
      provider: { findFirst: jest.fn(async () => ({ id: 10 })) },
      serviceRequest: { findUnique: jest.fn(async () => null) },
      $transaction: jest.fn(async (fn: any) => fn(prismaTxStub())),
    });

    await expect(service.submitOfferByUser(2, DTO)).rejects.not.toThrow(
      ForbiddenException,
    );
    expect(prisma.provider.findFirst).toHaveBeenCalled();
  });

  it('withdrawOfferByUser: marca WITHDRAWN e incrementa el contador', async () => {
    const { service, prisma } = makeDeps({
      offer: {
        findUnique: jest.fn(async () => ({
          id: 600,
          providerId: 10,
          status: 'PENDING',
        })),
        update: jest.fn(async () => ({ id: 600, status: 'WITHDRAWN' })),
      },
    });

    const r = await service.withdrawOfferByUser(2, 600);

    expect(r.status).toBe('WITHDRAWN');
    // Incremento atómico del contador del proveedor.
    expect(prisma.userPenalty.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 2 } }),
    );
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });
});

/** Stub de transacción para que submitOffer falle por datos, no por el gate. */
function prismaTxStub() {
  return {
    serviceRequest: { findUnique: jest.fn(async () => null) },
    offer: { count: jest.fn(async () => 0), findUnique: jest.fn(), create: jest.fn() },
  };
}
