/**
 * UNIT — PaymentsService.cancelPlan: regresión (bug 5).
 *   • Idempotente: cancelar un plan ya cancelado/vencido devuelve 200 OK
 *     ({ alreadyCancelled: true }), NO lanza 400 (evita crash del móvil).
 *   • Cancelar un plan activo emite PLAN_CANCELADO al PROPIO proveedor
 *     (targetUserId) para refrescar su plan en tiempo real.
 */
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../../src/payments/payments.service.js';
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  EventsGatewayMock,
} from '../mocks/events-gateway.mock';
import { createPushMock, PushMock } from '../mocks/push.mock';

describe('PaymentsService.cancelPlan (unit)', () => {
  let service: PaymentsService;
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let push: PushMock;
  let minio: { assertManagedImageUrl: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    push = createPushMock();
    minio = {
      assertManagedImageUrl: jest.fn((url: string) => url),
    };
    service = new PaymentsService(
      prisma as any,
      events as any,
      push as any,
      minio as any,
    );
  });

  it('idempotente: plan ya CANCELADA → { success, alreadyCancelled } sin lanzar', async () => {
    prisma.provider.findMany.mockResolvedValue([{
      id: 1,
      userId: 2,
      businessName: 'X',
      type: 'OFICIO',
      subscription: { id: 1, plan: 'GRATIS', status: 'CANCELADA' },
    }]);

    const r: any = await service.cancelPlan(2);
    expect(r).toEqual({ success: true, alreadyCancelled: true });
    expect(events.emitNotification).not.toHaveBeenCalled();
  });

  it('sin suscripción → idempotente (no crash)', async () => {
    prisma.provider.findMany.mockResolvedValue([{
      id: 1,
      userId: 2,
      businessName: 'X',
      type: 'OFICIO',
      subscription: null,
    }]);
    const r: any = await service.cancelPlan(2);
    expect(r.alreadyCancelled).toBe(true);
  });

  it('plan ACTIVA → cancela y emite PLAN_CANCELADO al proveedor (targetUserId)', async () => {
    prisma.provider.findMany.mockResolvedValue([{
      id: 1,
      userId: 2,
      businessName: 'X',
      type: 'OFICIO',
      subscription: { id: 1, plan: 'ESTANDAR', status: 'ACTIVA' },
    }]);

    const r: any = await service.cancelPlan(2);
    expect(r.success).toBe(true);
    expect(events.emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'PLAN_CANCELADO', targetUserId: 2 }),
    );
  });

  it('con PROFESIONAL + NEGOCIO exige tipo para no cancelar el plan equivocado', async () => {
    prisma.provider.findMany.mockResolvedValue([
      { id: 1, type: 'PROFESIONAL' },
      { id: 2, type: 'NEGOCIO' },
    ]);

    await expect(service.cancelPlan(2)).rejects.toThrow(BadRequestException);
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it('con tipo PROFESIONAL cancela solo el perfil profesional', async () => {
    prisma.provider.findMany.mockResolvedValue([
      {
        id: 1,
        userId: 2,
        businessName: 'Perfil profesional',
        type: 'PROFESIONAL',
        subscription: { id: 1, plan: 'PREMIUM', status: 'ACTIVA' },
      },
    ]);

    await service.cancelPlan(2, 'PROFESIONAL');

    expect(prisma.provider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 2, isVisible: true, type: 'PROFESIONAL' },
        take: 1,
      }),
    );
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { providerId: 1 } }),
    );
  });
});
