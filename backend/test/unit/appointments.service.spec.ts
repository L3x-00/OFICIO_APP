/**
 * UNIT — AppointmentsService: reglas de negocio críticas.
 *   • feature-gate "agenda" (proveedor sin el feature → 403).
 *   • límite por plan: GRATIS=1 cita activa/mes → 402.
 *   • cálculo de slots (bloques de 30 min, excluye tomados).
 *   • ownership: cancelar (cliente) / confirmar (proveedor).
 */
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AppointmentsService } from '../../src/appointments/appointments.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import { createPushMock } from '../mocks/push.mock';

const futureISO = () => new Date(Date.now() + 2 * 86_400_000).toISOString();

describe('AppointmentsService (unit)', () => {
  let prisma: PrismaMock;
  let push: ReturnType<typeof createPushMock>;
  let features: {
    assertProviderHasFeature: jest.Mock;
    providerHasFeature: jest.Mock;
    getProviderFeatures: jest.Mock;
    getCategoryFeatures: jest.Mock;
  };
  let service: AppointmentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    push = createPushMock();
    features = {
      assertProviderHasFeature: jest.fn().mockResolvedValue(undefined),
      providerHasFeature: jest.fn().mockResolvedValue(true),
      getProviderFeatures: jest.fn().mockResolvedValue(['agenda']),
      getCategoryFeatures: jest.fn().mockResolvedValue(['agenda']),
    };
    service = new AppointmentsService(
      prisma as any,
      features as any,
      push as any,
    );
  });

  describe('create() — feature-gate', () => {
    it('rechaza si el proveedor NO tiene el feature "agenda"', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: 7,
        userId: 99,
        businessName: 'X',
      });
      features.assertProviderHasFeature.mockRejectedValue(
        new ForbiddenException('sin agenda'),
      );
      await expect(
        service.create(5, { providerId: 7, date: futureISO() }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });
  });

  describe('create() — límite por plan', () => {
    it('GRATIS con 1 cita activa este mes → 402', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: 7,
        userId: 99,
        businessName: 'X',
      });
      prisma.subscription.findFirst.mockResolvedValue({ plan: 'GRATIS' });
      prisma.appointment.count.mockResolvedValue(1); // ya usó su cita

      expect.assertions(2);
      try {
        await service.create(5, { providerId: 7, date: futureISO() });
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    });

    it('ESTANDAR con 0 citas → crea y notifica a cliente y proveedor', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: 7,
        userId: 99,
        businessName: 'Barbería X',
      });
      prisma.subscription.findFirst.mockResolvedValue({ plan: 'ESTANDAR' });
      prisma.appointment.count.mockResolvedValue(0);
      prisma.appointment.findFirst.mockResolvedValue(null); // sin choque
      prisma.appointment.create.mockResolvedValue({ id: 1, providerId: 7 });

      const res = await service.create(5, {
        providerId: 7,
        date: futureISO(),
      });
      expect(res).toMatchObject({ id: 1 });
      expect(prisma.appointment.create).toHaveBeenCalled();
      // push al cliente (5) y al proveedor (99).
      expect(push.sendToUser).toHaveBeenCalledTimes(2);
      const targets = push.sendToUser.mock.calls.map((c: any[]) => c[0]);
      expect(targets).toEqual(expect.arrayContaining([5, 99]));
    });

    it('PREMIUM: no chequea conteo (ilimitado)', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: 7,
        userId: 99,
        businessName: 'X',
      });
      prisma.subscription.findFirst.mockResolvedValue({ plan: 'PREMIUM' });
      prisma.appointment.findFirst.mockResolvedValue(null);
      prisma.appointment.create.mockResolvedValue({ id: 2 });
      await service.create(5, { providerId: 7, date: futureISO() });
      expect(prisma.appointment.count).not.toHaveBeenCalled();
    });
  });

  describe('getSlots() — bloques de 30 min', () => {
    const allDays = (range: string) => ({
      lun: range, mar: range, mie: range, jue: range,
      vie: range, sab: range, dom: range,
    });

    it('genera bloques de 30 min del rango del día', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        appointmentSchedule: allDays('08:00-10:00'),
      });
      prisma.appointment.findMany.mockResolvedValue([]);
      const res = await service.getSlots(7, '2026-06-25');
      expect(res.slots.map((s) => s.time)).toEqual([
        '08:00', '08:30', '09:00', '09:30',
      ]);
    });

    it('excluye los horarios ya reservados', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        appointmentSchedule: allDays('08:00-10:00'),
      });
      prisma.appointment.findMany.mockResolvedValue([
        { date: new Date('2026-06-25T08:00:00-05:00') },
      ]);
      const res = await service.getSlots(7, '2026-06-25');
      expect(res.slots.map((s) => s.time)).toEqual([
        '08:30', '09:00', '09:30',
      ]);
    });

    it('día sin horario configurado → sin slots', async () => {
      prisma.provider.findUnique.mockResolvedValue({ appointmentSchedule: {} });
      prisma.appointment.findMany.mockResolvedValue([]);
      const res = await service.getSlots(7, '2026-06-25');
      expect(res.slots).toEqual([]);
    });
  });

  describe('ownership', () => {
    it('cancel(): un usuario que NO creó la cita → 403', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 1,
        userId: 99,
        status: 'PENDIENTE',
      });
      await expect(service.cancel(5, 1)).rejects.toThrow(ForbiddenException);
    });

    it('confirm(): un usuario que NO es el proveedor dueño → 403', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 1,
        userId: 5,
        status: 'PENDIENTE',
        provider: { userId: 99, businessName: 'X' },
      });
      await expect(service.confirm(7, 1)).rejects.toThrow(ForbiddenException);
    });

    it('confirm(): el proveedor dueño confirma y notifica al cliente', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 1,
        userId: 5,
        status: 'PENDIENTE',
        date: new Date('2026-06-25T08:00:00-05:00'),
        provider: { userId: 99, businessName: 'Barbería X' },
      });
      prisma.appointment.update.mockResolvedValue({ id: 1, status: 'CONFIRMADA' });
      const res = await service.confirm(99, 1);
      expect(res).toMatchObject({ status: 'CONFIRMADA' });
      expect(push.sendToUser).toHaveBeenCalledWith(
        5,
        'Cita confirmada',
        expect.stringContaining('confirmada'),
        expect.objectContaining({ type: 'APPOINTMENT_CONFIRMED' }),
      );
    });
  });
});
