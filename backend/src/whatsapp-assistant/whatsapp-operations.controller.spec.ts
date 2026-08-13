import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WhatsappOperationsController } from './whatsapp-operations.controller.js';

describe('WhatsappOperationsController', () => {
  function controller(overrides: Record<string, unknown> = {}) {
    const operations = {
      getSummary: jest.fn().mockResolvedValue({}),
      listOpenHandovers: jest.fn().mockResolvedValue([]),
      acknowledgeHandover: jest.fn().mockResolvedValue(true),
      listPendingDeliveryFailures: jest.fn().mockResolvedValue([]),
      acknowledgeDeliveryFailure: jest.fn().mockResolvedValue(true),
      ...overrides,
    };
    return {
      operations,
      controller: new WhatsappOperationsController(operations as any),
    };
  }

  it('pasa solo userId del JWT al reconocimiento de handover', async () => {
    const { controller: target, operations } = controller();

    await expect(
      target.acknowledgeHandover('12', { user: { userId: 42 } } as any),
    ).resolves.toEqual({ ok: true });

    expect(operations.acknowledgeHandover).toHaveBeenCalledWith(12, 42);
  });

  it('rechaza IDs ambiguos y estado no disponible', async () => {
    const { controller: target } = controller({
      acknowledgeDeliveryFailure: jest.fn().mockResolvedValue(false),
    });

    await expect(
      target.acknowledgeHandover('12x', { user: { userId: 42 } } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      target.acknowledgeDeliveryFailure('9', { user: { userId: 42 } } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
