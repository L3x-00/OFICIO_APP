/**
 * UNIT — PaymentsService (dinero).
 * Complementa payments.regression.spec (cancelPlan). Foco en los invariantes
 * de plata flaggeados por el mapeo adversarial:
 *   • submitYape: anti-tampering — el monto lo fija el SERVIDOR, no el cliente.
 *   • approve: atomicidad (todo en 1 tx) + idempotencia (no re-activar) + monto fiel.
 *   • activateSubscriptionFromPayment: doble capa de idempotencia (pre-check +
 *     P2002), validación de monto vs catálogo, endDate 30 días, evento NEW_MP_PAYMENT.
 *   • expireSubscriptions: degrada SOLO vencidos, plan+status atómicos.
 *   • reject: idempotente, NO toca la suscripción.
 *   • adminList: bandera de discrepancia de monto (fraude).
 */
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from '../../src/payments/payments.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  type EventsGatewayMock,
} from '../mocks/events-gateway.mock';
import { createPushMock, type PushMock } from '../mocks/push.mock';

describe('PaymentsService (unit)', () => {
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let push: PushMock;
  let minio: { assertManagedImageUrl: jest.Mock };
  let service: PaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('expireSubscriptions() [cron]', () => {
    it('sin vencidos → no abre transacción', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);
      await service.expireSubscriptions();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('degrada SOLO los vencidos: plan GRATIS + status VENCIDA + planPriority 3', async () => {
      prisma.subscription.findMany.mockResolvedValue([
        { id: 1, providerId: 10 },
        { id: 2, providerId: 20 },
      ]);
      await service.expireSubscriptions();
      // Filtro: endDate pasada + status GRACIA/ACTIVA + plan ESTANDAR/PREMIUM.
      const whereArg = prisma.subscription.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toEqual({ in: ['GRACIA', 'ACTIVA'] });
      expect(whereArg.plan).toEqual({ in: ['ESTANDAR', 'PREMIUM'] });
      // EL filtro que restringe a "vencidas": endDate < ahora. Sin esto
      // degradaría suscripciones AÚN vigentes.
      expect(whereArg.endDate.lt).toBeInstanceOf(Date);
      expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { plan: 'GRATIS', status: 'VENCIDA' },
      });
      expect(prisma.provider.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [10, 20] } },
        data: { planPriority: 3 },
      });
    });
  });

  describe('submitYapePayment()', () => {
    it('sin perfil del tipo pedido → Forbidden', async () => {
      prisma.provider.findUnique.mockResolvedValue(null);
      await expect(
        service.submitYapePayment(7, {
          plan: 'PREMIUM',
          providerType: 'OFICIO',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('plan no válido → BadRequest', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 1 });
      await expect(
        service.submitYapePayment(7, { plan: 'GRATIS' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('pago pendiente existente → BadRequest (1 por proveedor)', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 1 });
      prisma.yapePayment.findFirst.mockResolvedValue({ id: 5 });
      await expect(
        service.submitYapePayment(7, { plan: 'PREMIUM' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('ANTI-TAMPERING: guarda el monto del SERVIDOR, no el del cliente', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 1 });
      prisma.yapePayment.findFirst.mockResolvedValue(null);
      prisma.yapePayment.create.mockResolvedValue({ id: 7 });
      // El cliente declara S/1 por un PREMIUM (39.9).
      await service.submitYapePayment(7, {
        plan: 'PREMIUM',
        amount: 1,
        voucherUrl: 'v',
        verificationCode: 'VC',
      } as any);
      const data = prisma.yapePayment.create.mock.calls[0][0].data;
      expect(minio.assertManagedImageUrl).toHaveBeenCalledWith('v', [
        'payments/vouchers',
      ]);
      expect(data.amount).toBe(39.9); // oficial, NO 1
      expect(data.uploadedAmount).toBe(1); // lo declarado, solo referencia
      // Evento admin con el monto oficial.
      expect(events.emitAdminEvent).toHaveBeenCalledWith(
        'NEW_YAPE_PAYMENT',
        expect.objectContaining({ amount: 39.9 }),
      );
      // La notificación WS al admin lleva el precio OFICIAL en el body, no el declarado.
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NEW_YAPE_PAYMENT',
          targetRole: 'ADMIN',
          body: expect.stringContaining('39.90'),
        }),
      );
      // Inbox del admin persistido.
      expect(prisma.adminNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'YAPE_PAYMENT_SUBMITTED',
            providerId: 1,
          }),
        }),
      );
    });
  });

  describe('getMyPayments()', () => {
    it('sin proveedores → [] sin consultar pagos', async () => {
      prisma.provider.findMany.mockResolvedValue([]);
      await expect(service.getMyPayments(7)).resolves.toEqual([]);
      expect(prisma.yapePayment.findMany).not.toHaveBeenCalled();
    });

    it('scope: solo pagos de los proveedores del propio usuario', async () => {
      prisma.provider.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      prisma.yapePayment.findMany.mockResolvedValue([{ id: 9 }]);
      await service.getMyPayments(7);
      expect(prisma.yapePayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { providerId: { in: [1, 2] } } }),
      );
    });
  });

  describe('adminList()', () => {
    it('marca isAmountMismatch cuando lo declarado difiere del oficial', async () => {
      prisma.yapePayment.findMany.mockResolvedValue([
        { plan: 'PREMIUM', amount: 39.9, uploadedAmount: 5 },
      ]);
      const res = await service.adminList();
      expect(res[0].expectedAmount).toBe(39.9);
      expect(res[0].isAmountMismatch).toBe(true);
    });

    it('uploadedAmount null → sin falso positivo de discrepancia', async () => {
      prisma.yapePayment.findMany.mockResolvedValue([
        { plan: 'PREMIUM', amount: 39.9, uploadedAmount: null },
      ]);
      const res = await service.adminList();
      expect(res[0].isAmountMismatch).toBe(false);
    });

    it('pasa el filtro de status al where', async () => {
      prisma.yapePayment.findMany.mockResolvedValue([]);
      await service.adminList('PENDING');
      expect(prisma.yapePayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'PENDING' } }),
      );
    });
  });

  describe('approvePayment()', () => {
    it('pago inexistente → NotFound', async () => {
      prisma.yapePayment.findUnique.mockResolvedValue(null);
      await expect(service.approvePayment(1, 2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('IDEMPOTENCIA: pago ya procesado → BadRequest sin re-activar ni notificar', async () => {
      prisma.yapePayment.findUnique.mockResolvedValue({
        id: 1,
        status: 'APPROVED',
        plan: 'PREMIUM',
        providerId: 10,
        amount: 39.9,
        provider: { userId: 7, type: 'OFICIO', subscription: { id: 99 } },
      });
      await expect(service.approvePayment(1, 2)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.subscription.update).not.toHaveBeenCalled();
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(push.sendToUser).not.toHaveBeenCalled();
    });

    it('ATOMICIDAD: con suscripción existente, activa + registra pago histórico fiel en 1 tx', async () => {
      // Reloj fijo para verificar endDate (approve usa setMonth+1).
      jest.useFakeTimers().setSystemTime(Date.UTC(2026, 5, 24, 12, 0, 0));
      try {
        prisma.yapePayment.findUnique.mockResolvedValue({
          id: 1,
          status: 'PENDING',
          plan: 'PREMIUM',
          providerId: 10,
          amount: 39.9,
          verificationCode: 'VC',
          provider: { userId: 7, type: 'OFICIO', subscription: { id: 99 } },
        });
        prisma.subscription.findUnique.mockResolvedValue({ id: 99 });

        const res = await service.approvePayment(1, 2);

        // NOTA: el mock de $transaction ejecuta el callback contra el MISMO
        // mock, así que estas escrituras quedan registradas estén dentro o
        // fuera de la tx — verificamos que la tx se abrió 1 vez + los payloads.
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.yapePayment.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 1 },
            data: expect.objectContaining({
              status: 'APPROVED',
              reviewedByAdminId: 2,
            }),
          }),
        );
        // Suscripción activada con el plan + status + endDate (~1 mes).
        const subData = prisma.subscription.update.mock.calls[0][0].data;
        expect(subData.plan).toBe('PREMIUM');
        expect(subData.status).toBe('ACTIVA');
        const days = (subData.endDate.getTime() - Date.now()) / 86_400_000;
        expect(days).toBeGreaterThanOrEqual(28);
        expect(days).toBeLessThanOrEqual(31);
        expect(prisma.provider.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: { planPriority: 1 } }),
        );
        // Pago histórico con el monto OFICIAL, moneda PEN, método yape, ref=código.
        expect(prisma.payment.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              amount: 39.9,
              currency: 'PEN',
              method: 'yape',
              reference: 'VC',
            }),
          }),
        );
        expect(events.emitNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'PLAN_APROBADO', targetUserId: 7 }),
        );
        expect(push.sendToUser).toHaveBeenCalledTimes(1);
        expect(res).toEqual({ success: true });
      } finally {
        jest.useRealTimers();
      }
    });

    it('sin suscripción previa: la crea con plan/status/priceUSD correctos y NO inserta pago histórico (gap documentado)', async () => {
      prisma.yapePayment.findUnique.mockResolvedValue({
        id: 1,
        status: 'PENDING',
        plan: 'ESTANDAR',
        providerId: 10,
        amount: 19.9,
        verificationCode: 'VC',
        provider: { userId: 7, type: 'OFICIO', subscription: null },
      });
      await service.approvePayment(1, 2);
      // Suscripción creada con el plan + status + precio OFICIAL (no el declarado).
      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'ESTANDAR',
            status: 'ACTIVA',
            priceUSD: 19.9,
          }),
        }),
      );
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('rejectPayment()', () => {
    it('pago inexistente → NotFound', async () => {
      prisma.yapePayment.findUnique.mockResolvedValue(null);
      await expect(service.rejectPayment(1, 2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('IDEMPOTENCIA: ya procesado → BadRequest y NO toca la suscripción', async () => {
      prisma.yapePayment.findUnique.mockResolvedValue({
        id: 1,
        status: 'APPROVED',
        provider: { userId: 7 },
      });
      await expect(service.rejectPayment(1, 2)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('con motivo: marca REJECTED y notifica el motivo al proveedor', async () => {
      prisma.yapePayment.findUnique.mockResolvedValue({
        id: 1,
        status: 'PENDING',
        provider: { userId: 7 },
      });
      await service.rejectPayment(1, 2, 'comprobante borroso');
      expect(prisma.yapePayment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            rejectionReason: 'comprobante borroso',
          }),
        }),
      );
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PLAN_RECHAZADO',
          targetUserId: 7,
          body: 'comprobante borroso',
        }),
      );
    });

    it('sin motivo: rejectionReason null', async () => {
      prisma.yapePayment.findUnique.mockResolvedValue({
        id: 1,
        status: 'PENDING',
        provider: { userId: 7 },
      });
      await service.rejectPayment(1, 2);
      expect(prisma.yapePayment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rejectionReason: null }),
        }),
      );
    });
  });

  describe('activateSubscriptionFromPayment() [webhook MercadoPago]', () => {
    const base = {
      userId: 7,
      plan: 'PREMIUM',
      amount: 39.9,
      paymentMethod: 'visa',
      paymentId: 'mp-123',
      dateApproved: '2026-06-24T00:00:00Z',
    };

    it('IDEMPOTENCIA capa 1: pago ya registrado (reference) → no activa nada', async () => {
      prisma.payment.findFirst.mockResolvedValue({ id: 1 });
      await service.activateSubscriptionFromPayment(base);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(push.sendToUser).not.toHaveBeenCalled();
    });

    it('ANTI-TAMPERING: monto < 99% del esperado → aborta sin activar', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      await service.activateSubscriptionFromPayment({ ...base, amount: 1 });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(push.sendToUser).not.toHaveBeenCalled();
    });

    it('provider inexistente → retorna en silencio (no 500 del webhook)', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.provider.findFirst.mockResolvedValue(null);
      await expect(
        service.activateSubscriptionFromPayment(base),
      ).resolves.toBeUndefined();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('éxito: upsert con endDate EXACTO 30 días + pago con reference=paymentId + evento NEW_MP_PAYMENT + push', async () => {
      jest.useFakeTimers().setSystemTime(Date.UTC(2026, 5, 24, 12, 0, 0));
      try {
        prisma.payment.findFirst.mockResolvedValue(null);
        prisma.provider.findFirst.mockResolvedValue({
          id: 10,
          businessName: 'B',
          type: 'OFICIO',
        });
        prisma.subscription.findUniqueOrThrow.mockResolvedValue({ id: 99 });

        await service.activateSubscriptionFromPayment(base);

        // A-03: endDate = ahora + 30 días EXACTOS (no setMonth+1, que pierde días).
        const expectedEnd = Date.now() + 30 * 24 * 60 * 60 * 1000;
        const upsertArg = prisma.subscription.upsert.mock.calls[0][0];
        expect(upsertArg.create.endDate.getTime()).toBe(expectedEnd);
        expect(upsertArg.update.endDate.getTime()).toBe(expectedEnd);
        // A-04: en renovación (update) NO se toca startDate.
        expect(upsertArg.update.startDate).toBeUndefined();
        expect(prisma.payment.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              amount: 39.9,
              currency: 'PEN',
              reference: 'mp-123', // clave de idempotencia
            }),
          }),
        );
        expect(prisma.provider.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: { planPriority: 1 } }),
        );
        // M-03: canal correcto (NO NEW_YAPE_PAYMENT).
        expect(events.emitAdminEvent).toHaveBeenCalledWith(
          'NEW_MP_PAYMENT',
          expect.objectContaining({ paymentId: 'mp-123' }),
        );
        expect(push.sendToUser).toHaveBeenCalledTimes(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('IDEMPOTENCIA capa 2: race P2002 en la tx → se traga sin notificar dos veces', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.provider.findFirst.mockResolvedValue({
        id: 10,
        businessName: 'B',
        type: 'OFICIO',
      });
      prisma.$transaction.mockRejectedValue({ code: 'P2002' });
      await expect(
        service.activateSubscriptionFromPayment(base),
      ).resolves.toBeUndefined();
      expect(push.sendToUser).not.toHaveBeenCalled();
    });

    it('error no-P2002 en la tx → se re-lanza', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.provider.findFirst.mockResolvedValue({
        id: 10,
        businessName: 'B',
        type: 'OFICIO',
      });
      prisma.$transaction.mockRejectedValue(new Error('boom'));
      await expect(
        service.activateSubscriptionFromPayment(base),
      ).rejects.toThrow('boom');
    });
  });
});
