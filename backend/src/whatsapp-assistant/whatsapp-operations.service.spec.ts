import { ServiceUnavailableException } from '@nestjs/common';
import { WhatsappOperationsService } from './whatsapp-operations.service.js';

function store(overrides: Record<string, unknown> = {}) {
  return {
    whatsappHandover: {
      upsert: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    whatsappInboundMessage: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    ...overrides,
  } as any;
}

describe('WhatsappOperationsService', () => {
  it('flag apagado no crea handover ni consulta tablas F4', async () => {
    const db = store();
    const service = new WhatsappOperationsService(db, {
      operationsEnabled: false,
    } as any);

    await service.recordHandover(db, 'session', 'contact-hmac');

    expect(db.whatsappHandover.upsert).not.toHaveBeenCalled();
    await expect(service.getSummary()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('crea un handover único usando solo el identificador opaco', async () => {
    const db = store();
    const service = new WhatsappOperationsService(db, {
      operationsEnabled: true,
    } as any);

    await service.recordHandover(db, 'servi-session', 'contact-hmac');

    expect(db.whatsappHandover.upsert).toHaveBeenCalledWith({
      where: {
        sessionId_contactHash: {
          sessionId: 'servi-session',
          contactHash: 'contact-hmac',
        },
      },
      create: {
        sessionId: 'servi-session',
        contactHash: 'contact-hmac',
        status: 'OPEN',
      },
      update: {},
    });
  });

  it('resumen y listas no exponen hash, sesión, texto ni chat', async () => {
    const db = store();
    db.whatsappHandover.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
    db.whatsappInboundMessage.count.mockResolvedValueOnce(3);
    db.whatsappHandover.findMany.mockResolvedValueOnce([
      { id: 8, status: 'OPEN', requestedAt: new Date('2026-08-12T12:00:00Z') },
    ]);
    db.whatsappInboundMessage.findMany.mockResolvedValueOnce([
      {
        id: 9,
        errorCode: 'SEND_TIMEOUT',
        createdAt: new Date('2026-08-12T13:00:00Z'),
      },
    ]);
    const service = new WhatsappOperationsService(db, {
      operationsEnabled: true,
    } as any);

    await expect(service.getSummary()).resolves.toEqual({
      handoversToday: 4,
      openHandovers: 2,
      pendingDeliveryFailures: 3,
    });
    await expect(service.listOpenHandovers(999)).resolves.toHaveLength(1);
    await expect(service.listPendingDeliveryFailures(30)).resolves.toHaveLength(
      1,
    );

    const handoverArgs = db.whatsappHandover.findMany.mock.calls[0][0];
    expect(handoverArgs.take).toBe(100);
    expect(handoverArgs.select).toEqual({
      id: true,
      status: true,
      requestedAt: true,
    });
    const failureArgs = db.whatsappInboundMessage.findMany.mock.calls[0][0];
    expect(failureArgs.select).toEqual({
      id: true,
      errorCode: true,
      createdAt: true,
    });
  });

  it('reconoce de forma atómica y nunca llama a OpenWA', async () => {
    const db = store();
    const service = new WhatsappOperationsService(db, {
      operationsEnabled: true,
    } as any);

    await expect(service.acknowledgeHandover(8, 42)).resolves.toBe(true);
    await expect(service.acknowledgeDeliveryFailure(9, 42)).resolves.toBe(true);

    expect(db.whatsappHandover.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 8, status: 'OPEN' } }),
    );
    expect(db.whatsappInboundMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 9, status: 'FAILED', dlqAcknowledgedAt: null },
      }),
    );
  });
});
