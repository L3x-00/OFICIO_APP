/**
 * UNIT — AdminPaymentsService (panel admin valida pagos Yape / solicitudes de plan).
 * Dinero-adyacente: aprobar/rechazar es idempotente (no reprocesa una solicitud
 * ya resuelta), la activación es atómica (subscription + provider + request en 1 tx),
 * y persiste la notificación + emite WS + push al proveedor.
 */
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminPaymentsService } from '../../src/admin/services/admin-payments.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  type EventsGatewayMock,
} from '../mocks/events-gateway.mock';
import { createPushMock, type PushMock } from '../mocks/push.mock';

describe('AdminPaymentsService (unit)', () => {
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let push: PushMock;
  let service: AdminPaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    push = createPushMock();
    service = new AdminPaymentsService(
      prisma as any,
      events as any,
      push as any,
    );
  });

  describe('approvePlanRequest()', () => {
    it('solicitud inexistente → NotFound', async () => {
      prisma.planRequest.findUnique.mockResolvedValue(null);
      await expect(service.approvePlanRequest(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('IDEMPOTENCIA: ya procesada → BadRequest sin activar ni notificar', async () => {
      prisma.planRequest.findUnique.mockResolvedValue({
        id: 1,
        status: 'APROBADO',
        plan: 'PREMIUM',
        providerId: 10,
        provider: { userId: 7, type: 'OFICIO', subscription: { id: 99 } },
      });
      await expect(service.approvePlanRequest(1)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(push.sendToUser).not.toHaveBeenCalled();
    });

    it('éxito con suscripción existente: activa en tx, persiste notif y avisa al proveedor', async () => {
      prisma.planRequest.findUnique.mockResolvedValue({
        id: 1,
        status: 'PENDIENTE',
        plan: 'PREMIUM',
        providerId: 10,
        provider: { userId: 7, type: 'OFICIO', subscription: { id: 99 } },
      });
      const res = await service.approvePlanRequest(1);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.subscription.update).toHaveBeenCalled();
      expect(prisma.planRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'APROBADO' } }),
      );
      // Notificación PERSISTIDA al proveedor.
      expect(prisma.adminNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'PLAN_APROBADO',
            targetUserId: 7,
          }),
        }),
      );
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PLAN_APROBADO', targetUserId: 7 }),
      );
      expect(push.sendToUser).toHaveBeenCalledTimes(1);
      expect(res).toEqual({ success: true });
    });

    it('éxito sin suscripción previa: la crea (no update)', async () => {
      prisma.planRequest.findUnique.mockResolvedValue({
        id: 1,
        status: 'PENDIENTE',
        plan: 'ESTANDAR',
        providerId: 10,
        provider: { userId: 7, type: 'OFICIO', subscription: null },
      });
      await service.approvePlanRequest(1);
      expect(prisma.subscription.create).toHaveBeenCalled();
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });
  });

  describe('rejectPlanRequest()', () => {
    it('solicitud inexistente → NotFound', async () => {
      prisma.planRequest.findUnique.mockResolvedValue(null);
      await expect(service.rejectPlanRequest(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('IDEMPOTENCIA: ya procesada → BadRequest sin tocar nada', async () => {
      prisma.planRequest.findUnique.mockResolvedValue({
        id: 1,
        status: 'RECHAZADO',
        plan: 'PREMIUM',
        provider: { userId: 7, businessName: 'X', type: 'OFICIO' },
      });
      await expect(service.rejectPlanRequest(1, 'motivo')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.planRequest.update).not.toHaveBeenCalled();
    });

    it('con motivo: marca RECHAZADO, persiste notif con el motivo y avisa', async () => {
      prisma.planRequest.findUnique.mockResolvedValue({
        id: 1,
        status: 'PENDIENTE',
        plan: 'PREMIUM',
        providerId: 10,
        provider: { userId: 7, businessName: 'X', type: 'OFICIO' },
      });
      await service.rejectPlanRequest(1, 'comprobante inválido');
      expect(prisma.planRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'RECHAZADO', reason: 'comprobante inválido' },
        }),
      );
      expect(prisma.adminNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'PLAN_RECHAZADO',
            message: expect.stringContaining('comprobante inválido'),
          }),
        }),
      );
      expect(push.sendToUser).toHaveBeenCalledTimes(1);
    });

    it('sin motivo: reason null', async () => {
      prisma.planRequest.findUnique.mockResolvedValue({
        id: 1,
        status: 'PENDIENTE',
        plan: 'PREMIUM',
        providerId: 10,
        provider: { userId: 7, businessName: 'X', type: 'OFICIO' },
      });
      await service.rejectPlanRequest(1);
      expect(prisma.planRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reason: null }),
        }),
      );
    });
  });
});
