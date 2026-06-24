/**
 * UNIT — AuthAccountService: recuperación/cambio de contraseña + borrado.
 * Mocks estrictos de Prisma + ConfigService + EmailService (sin red).
 */
import {
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthAccountService } from '../../src/auth/services/auth-account.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import { createConfigMock, type ConfigMock } from '../mocks/config.mock';
import { userFixture, socialUserFixture } from '../fixtures/users.fixture';

describe('AuthAccountService (unit)', () => {
  let prisma: PrismaMock;
  let config: ConfigMock;
  let email: {
    sendPasswordResetEmail: jest.Mock;
    sendAdminPasswordResetEmail: jest.Mock;
  };
  let service: AuthAccountService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    config = createConfigMock(); // NODE_ENV = 'test'
    email = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendAdminPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };
    service = new AuthAccountService(
      prisma as any,
      config as any,
      email as any,
    );
  });

  describe('forgotPassword()', () => {
    it('email inexistente: responde genérico SIN crear token (no revela)', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      const res = await service.forgotPassword('nope@example.com');
      expect(res.message).toMatch(/código de recuperación/i);
      expect((res as Record<string, unknown>)._devToken).toBeUndefined();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('email existente: crea token RESET_ y envía email (devToken en no-prod)', async () => {
      prisma.user.findFirst.mockResolvedValue(userFixture({ id: 7 }));
      const res = await service.forgotPassword('user@example.com');
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 7 }),
        }),
      );
      expect(email.sendPasswordResetEmail).toHaveBeenCalled();
      expect((res as Record<string, unknown>)._devToken).toBeDefined();
    });

    it('no falla si el envío de email lanza (best-effort)', async () => {
      prisma.user.findFirst.mockResolvedValue(userFixture({ id: 7 }));
      email.sendPasswordResetEmail.mockRejectedValue(new Error('brevo down'));
      await expect(
        service.forgotPassword('user@example.com'),
      ).resolves.toBeDefined();
    });
  });

  describe('resetPassword()', () => {
    it('usuario inexistente → Unauthorized', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.resetPassword('x@x.com', '123456', 'newpass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('token inexistente → Unauthorized', async () => {
      prisma.user.findFirst.mockResolvedValue(userFixture({ id: 7 }));
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(
        service.resetPassword('x@x.com', '123456', 'newpass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('token de OTRO usuario → Unauthorized', async () => {
      prisma.user.findFirst.mockResolvedValue(userFixture({ id: 7 }));
      prisma.refreshToken.findUnique.mockResolvedValue({
        userId: 99,
        expiresAt: new Date(Date.now() + 10000),
      });
      await expect(
        service.resetPassword('x@x.com', '123456', 'newpass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('token expirado → Unauthorized (expirado)', async () => {
      prisma.user.findFirst.mockResolvedValue(userFixture({ id: 7 }));
      prisma.refreshToken.findUnique.mockResolvedValue({
        userId: 7,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(
        service.resetPassword('x@x.com', '123456', 'newpass'),
      ).rejects.toThrow(/expirado/i);
    });

    it('éxito: consume token, cambia password e invalida sesiones', async () => {
      prisma.user.findFirst.mockResolvedValue(userFixture({ id: 7 }));
      prisma.refreshToken.findUnique.mockResolvedValue({
        userId: 7,
        expiresAt: new Date(Date.now() + 10000),
      });
      const res = await service.resetPassword('x@x.com', '123456', 'newpass');
      expect(prisma.refreshToken.delete).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 7 } }),
      );
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 7 },
      });
      expect(res.message).toMatch(/restablecida/i);
    });
  });

  describe('adminRequestPasswordReset()', () => {
    it('usuario inexistente → NotFound', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.adminRequestPasswordReset(7)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('éxito: crea token RESET_ y devuelve _devUrl en no-prod', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 7,
        email: 'p@x.com',
        firstName: 'Ana',
      });
      const res = await service.adminRequestPasswordReset(7);
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(email.sendAdminPasswordResetEmail).toHaveBeenCalled();
      expect((res as Record<string, unknown>)._devUrl).toContain(
        'reset-password?token=',
      );
    });
  });

  describe('setupPassword()', () => {
    it('rechaza contraseñas menores a 6 → BadRequest', async () => {
      await expect(service.setupPassword(7, '123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('usuario inexistente → NotFound', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.setupPassword(7, 'newpass')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('usuario MANUAL (sin firebaseUid) → BadRequest', async () => {
      prisma.user.findUnique.mockResolvedValue(
        userFixture({ id: 7, firebaseUid: null }),
      );
      await expect(service.setupPassword(7, 'newpass')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('social con dummy hash: establece contraseña', async () => {
      const dummy = await bcrypt.hash('FIREBASE_SOCIAL_fbuid-1', 10);
      prisma.user.findUnique.mockResolvedValue(
        socialUserFixture({ id: 7, firebaseUid: 'fbuid-1', passwordHash: dummy }),
      );
      const res = await service.setupPassword(7, 'newpass');
      expect(prisma.user.update).toHaveBeenCalled();
      expect(res.message).toMatch(/establecida/i);
    });
  });

  describe('deleteAccount()', () => {
    it('usuario inexistente → Error', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.deleteAccount(7)).rejects.toThrow(
        /Usuario no encontrado/i,
      );
    });

    it('éxito: soft-delete en transacción', async () => {
      prisma.user.findUnique.mockResolvedValue(userFixture({ id: 7 }));
      prisma.$transaction.mockResolvedValue([]);
      const res = await service.deleteAccount(7);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(res).toEqual({ success: true });
    });
  });
});
