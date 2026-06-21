/**
 * UNIT — UsersService: regresión de fixes de esta sesión.
 *   • bug 6 — updateProfile mapea P2002(phone) → 409 con mensaje claro.
 *   • bug 2 — getMyProviderStatus filtra el inbox por targetUserId (no
 *     filtra notifs admin-only al proveedor).
 *   • P5    — getMe y getMyProviderStatus incluyen subscription (plan fresco).
 */
import { UsersService } from '../../src/users/users.service.js';
import { ConflictException } from '@nestjs/common';
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  EventsGatewayMock,
} from '../mocks/events-gateway.mock';

describe('UsersService — regresión (unit)', () => {
  let service: UsersService;
  let prisma: PrismaMock;
  let events: EventsGatewayMock;

  beforeEach(() => {
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    service = new UsersService(prisma as any, events as any);
  });

  describe('updateProfile — P2002 phone → 409 (bug 6)', () => {
    it('phone duplicado lanza ConflictException con mensaje claro', async () => {
      prisma.user.update.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['phone'] },
      });
      await expect(
        service.updateProfile(1, { phone: '999' }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(service.updateProfile(1, { phone: '999' })).rejects.toThrow(
        'El número de teléfono ya está en uso',
      );
    });

    it('P2002 de otro campo se re-lanza tal cual', async () => {
      const err = { code: 'P2002', meta: { target: ['email'] } };
      prisma.user.update.mockRejectedValue(err);
      await expect(service.updateProfile(1, { phone: '999' })).rejects.toBe(err);
    });

    it('éxito devuelve el usuario actualizado', async () => {
      prisma.user.update.mockResolvedValue({ id: 1, phone: '999' });
      const r: any = await service.updateProfile(1, { phone: '999' });
      expect(r.phone).toBe('999');
    });
  });

  describe('getMyProviderStatus — inbox filtra targetUserId (bug 2 / P5)', () => {
    it('notifications.where exige targetUserId = userId', async () => {
      prisma.provider.findMany.mockResolvedValue([]);
      await service.getMyProviderStatus(42);
      const arg: any = prisma.provider.findMany.mock.calls[0][0];
      expect(arg.select.notifications.where).toMatchObject({
        isRead: false,
        targetUserId: 42,
      });
    });

    it('incluye subscription en el select (plan fresco)', async () => {
      prisma.provider.findMany.mockResolvedValue([]);
      await service.getMyProviderStatus(42);
      const arg: any = prisma.provider.findMany.mock.calls[0][0];
      expect(arg.select.subscription).toBeDefined();
    });
  });

  describe('getMe — incluye providers.subscription (P5)', () => {
    it('el select pide providers con subscription', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      await service.getMe(1);
      const arg: any = prisma.user.findUnique.mock.calls[0][0];
      expect(arg.select.providers.select.subscription).toBeDefined();
    });
  });
});
