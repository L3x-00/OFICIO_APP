/**
 * UNIT — AuthRegistrationService: registerProvider + sendOtp + resendPendingOtp.
 * (registerUser y verifyOtp ya se cubren vía el facade en auth.service.spec.)
 */
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AuthRegistrationService } from '../../src/auth/services/auth-registration.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import { createJwtMock } from '../mocks/jwt.mock';
import { createConfigMock } from '../mocks/config.mock';
import {
  createEventsGatewayMock,
  type EventsGatewayMock,
} from '../mocks/events-gateway.mock';
import { userFixture } from '../fixtures/users.fixture';

describe('AuthRegistrationService (unit)', () => {
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let email: { sendOtpEmail: jest.Mock };
  let minio: {
    uploadFile: jest.Mock;
    assertManagedImageUrl: jest.Mock;
    isSameImageReference: jest.Mock;
  };
  let cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let service: AuthRegistrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    email = { sendOtpEmail: jest.fn().mockResolvedValue(undefined) };
    minio = {
      uploadFile: jest.fn().mockResolvedValue('https://cdn/x.jpg'),
      assertManagedImageUrl: jest.fn((url: string) => url),
      isSameImageReference: jest.fn(
        (current: string | null, next: string | null) => current === next,
      ),
    };
    cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    service = new AuthRegistrationService(
      prisma as any,
      createJwtMock() as any,
      createConfigMock() as any,
      events as any,
      email as any,
      minio as any,
      cache as any,
    );
  });

  describe('sendOtp()', () => {
    it('usuario inexistente → Unauthorized', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.sendOtp(7)).rejects.toThrow(UnauthorizedException);
    });

    it('email ya verificado: no genera OTP', async () => {
      prisma.user.findUnique.mockResolvedValue(
        userFixture({ id: 7, isEmailVerified: true }),
      );
      const res = await service.sendOtp(7);
      expect(res.message).toMatch(/ya está verificado/i);
      expect(prisma.otpCode.create).not.toHaveBeenCalled();
    });

    it('email sin verificar: borra OTPs previos y crea uno nuevo', async () => {
      prisma.user.findUnique.mockResolvedValue(
        userFixture({ id: 7, isEmailVerified: false }),
      );
      await service.sendOtp(7);
      expect(prisma.otpCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: 7 },
      });
      expect(prisma.otpCode.create).toHaveBeenCalled();
    });
  });

  describe('resendPendingOtp()', () => {
    it('sin registro pendiente en cache → BadRequest', async () => {
      cache.get.mockResolvedValue(null);
      await expect(service.resendPendingOtp('p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('éxito: setea nuevo OTP, reenvía email y devuelve _devCode (no-prod)', async () => {
      cache.get.mockResolvedValue(JSON.stringify({ email: 'a@b.com' }));
      cache.set.mockResolvedValue(undefined);
      const res = await service.resendPendingOtp('p1');
      expect(cache.set).toHaveBeenCalledWith(
        'pending_otp:p1',
        expect.any(String),
        expect.any(Number),
      );
      expect(email.sendOtpEmail).toHaveBeenCalledWith(
        'a@b.com',
        expect.any(String),
      );
      expect((res as Record<string, unknown>)._devCode).toBeDefined();
    });
  });

  describe('registerProvider()', () => {
    const baseData = {
      type: 'OFICIO',
      businessName: 'Mi Oficio',
      phone: '999111222',
      dni: '12345678',
      localityId: 1,
      categoryIds: [1],
      primaryCategoryId: 1,
    } as any;

    it('usuario inexistente → Unauthorized', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.registerProvider(7, baseData, [])).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('ya tiene perfil del mismo tipo (no rechazado) → Conflict', async () => {
      prisma.user.findUnique.mockResolvedValue(userFixture({ id: 7 }));
      prisma.provider.findUnique.mockResolvedValue({
        id: 5,
        verificationStatus: 'APROBADO',
      });
      await expect(service.registerProvider(7, baseData, [])).rejects.toThrow(
        ConflictException,
      );
    });

    it('DNI ya usado por OTRO usuario → Conflict', async () => {
      prisma.user.findUnique.mockResolvedValue(userFixture({ id: 7 }));
      prisma.provider.findUnique.mockResolvedValue(null); // sin perfil previo
      prisma.provider.findFirst.mockResolvedValue({ id: 9 }); // DNI tomado
      await expect(service.registerProvider(7, baseData, [])).rejects.toThrow(
        ConflictException,
      );
    });

    it('rechaza imagen externa embebida en servicios del registro', async () => {
      prisma.user.findUnique.mockResolvedValue(userFixture({ id: 7 }));
      prisma.provider.findUnique.mockResolvedValue(null);
      minio.assertManagedImageUrl.mockImplementationOnce(() => {
        throw new BadRequestException('URL no permitida');
      });

      await expect(
        service.registerProvider(
          7,
          {
            ...baseData,
            type: 'NEGOCIO',
            dni: undefined,
            scheduleJson: {
              services: [
                {
                  id: 'service-1',
                  imageUrl: 'https://evil.example/service.jpg',
                },
              ],
            },
          },
          [],
        ),
      ).rejects.toThrow(BadRequestException);

      expect(minio.uploadFile).not.toHaveBeenCalled();
    });

    it('éxito: crea el perfil PENDIENTE y emite eventos al admin', async () => {
      prisma.user.findUnique.mockResolvedValue(userFixture({ id: 7 }));
      prisma.provider.findUnique.mockResolvedValue(null); // sin perfil + slug libre
      prisma.provider.findFirst.mockResolvedValue(null); // DNI libre
      prisma.locality.findUnique.mockResolvedValue({ id: 1 });
      prisma.category.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.provider.create.mockResolvedValue({ id: 10 });
      // $transaction(callback) → ejecuta el callback con el propio mock como tx.
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));

      const res = await service.registerProvider(7, baseData, []);

      expect(prisma.provider.create).toHaveBeenCalled();
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'NEW_PROVIDER', targetRole: 'ADMIN' }),
      );
      expect(events.emitAdminEvent).toHaveBeenCalledWith(
        'NEW_PROVIDER',
        expect.objectContaining({ providerId: 10 }),
      );
      expect(res).toEqual({
        success: true,
        providerId: 10,
        role: 'USUARIO',
      });
    });
  });
});
