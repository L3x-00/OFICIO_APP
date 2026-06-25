/**
 * UNIT — UsersService: gestión de cuenta (complementa users.service.spec +
 * users.regression.spec, que ya cubren getPublicProfile y updateProfile P2002).
 * Foco: changePassword (verifica actual + invalida sesiones), saveFcmToken
 * (roba el token de otro user en transacción → anti-leak de push cross-cuenta),
 * clearFcmToken, updateProfilePicture, getMyProviderStatus (plan default GRATIS).
 */
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../src/users/users.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  type EventsGatewayMock,
} from '../mocks/events-gateway.mock';

describe('UsersService — cuenta (unit)', () => {
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    service = new UsersService(prisma as any, events as any);
  });

  describe('getMyProviderStatus()', () => {
    it('sin perfiles → hasProvider false, profiles vacío', async () => {
      prisma.provider.findMany.mockResolvedValue([]);
      await expect(service.getMyProviderStatus(7)).resolves.toEqual({
        hasProvider: false,
        profiles: [],
      });
    });

    it('perfil sin suscripción → plan default GRATIS', async () => {
      prisma.provider.findMany.mockResolvedValue([
        {
          id: 5,
          businessName: 'X',
          type: 'OFICIO',
          providerCategories: [],
          notifications: [],
          trustValidations: [],
          subscription: null,
        },
      ]);
      const res = await service.getMyProviderStatus(7);
      expect(res.hasProvider).toBe(true);
      expect(res.profiles[0].plan).toBe('GRATIS');
      expect(res.profiles[0].subscriptionStatus).toBeNull();
    });
  });

  describe('getMe()', () => {
    it('usuario inexistente → NotFound', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getMe(7)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfilePicture()', () => {
    it('actualiza el avatar y devuelve los campos públicos', async () => {
      prisma.user.update.mockResolvedValue({ id: 7, avatarUrl: 'https://p' });
      const res = await service.updateProfilePicture(7, 'https://p');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 7 },
          data: { avatarUrl: 'https://p' },
        }),
      );
      expect((res as any).avatarUrl).toBe('https://p');
    });
  });

  describe('saveFcmToken()', () => {
    it('libera el token de cualquier OTRO user y luego lo asigna, en 1 transacción (anti-leak)', async () => {
      await service.saveFcmToken(7, 'fcm-xyz');
      // ATOMICIDAD: ambas escrituras en una sola tx (sin esto, 2 users
      // podrían sostener el mismo token transitoriamente → leak de push).
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { fcmToken: 'fcm-xyz', id: { not: 7 } },
        data: { fcmToken: null },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { fcmToken: 'fcm-xyz' },
      });
      // ORDEN: liberar ANTES de asignar (asignar primero se auto-anularía).
      expect(
        prisma.user.updateMany.mock.invocationCallOrder[0],
      ).toBeLessThan(prisma.user.update.mock.invocationCallOrder[0]);
    });
  });

  describe('clearFcmToken()', () => {
    it('pone el token FCM en null', async () => {
      await service.clearFcmToken(7);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { fcmToken: null },
      });
    });
  });

  describe('changePassword()', () => {
    const hash = bcrypt.hashSync('oldpass', 10);

    it('usuario inexistente → NotFound', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.changePassword(7, 'oldpass', 'newpass'),
      ).rejects.toThrow(NotFoundException);
    });

    it('contraseña actual incorrecta → BadRequest y NO cambia nada', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 7, passwordHash: hash });
      await expect(
        service.changePassword(7, 'WRONG', 'newpass'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });

    it('éxito: guarda hash nuevo (no plano), invalida sesiones y notifica', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 7, passwordHash: hash });
      const res = await service.changePassword(7, 'oldpass', 'newpass');
      // Actualiza al usuario CORRECTO (no a otro id) con el HASH (no el plano).
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 7 } }),
      );
      const savedHash = prisma.user.update.mock.calls[0][0].data.passwordHash;
      expect(savedHash).not.toBe('newpass');
      expect(bcrypt.compareSync('newpass', savedHash)).toBe(true);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 7 },
      });
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PASSWORD_CHANGED', targetUserId: 7 }),
      );
      expect(res).toEqual({ message: 'Contraseña actualizada correctamente' });
    });
  });
});
