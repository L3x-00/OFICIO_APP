/**
 * UNIT — AuthService.
 *
 * Cubre los flujos críticos donde un error de regresión rompería
 * autenticación, registro, refresh de tokens o social-login:
 *
 *   • Login: 404 si email no existe, 401 si pwd incorrecta, generación
 *     de tokens correcta, lastLoginAt fire-and-forget no bloquea.
 *   • Registro: conflict si email activo, reactivación permitida si
 *     soft-deleted, OTP guardado en cache, notif admin USER_PENDING.
 *   • Refresh tokens: invalida el viejo, emite par nuevo, falla si
 *     expirado.
 *   • Social login: crea nuevo si no existe (isNewUser=true), conflict
 *     si email manual ya registrado, reactivación SIN beneficios para
 *     soft-deleted (anti-freemium).
 *   • Setup password: solo válido para usuarios social con dummy hash
 *     (regresión bug obs 6: usuarios manual no deben usarlo).
 */

import { AuthService } from '../../src/auth/auth.service.js';
import { AuthRegistrationService } from '../../src/auth/services/auth-registration.service.js';
import { AuthAccountService } from '../../src/auth/services/auth-account.service.js';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  EventsGatewayMock,
} from '../mocks/events-gateway.mock';
import { createJwtMock, JwtMock } from '../mocks/jwt.mock';
import { createConfigMock, ConfigMock } from '../mocks/config.mock';
import {
  userFixture,
  socialUserFixture,
  softDeletedUserFixture,
} from '../fixtures/users.fixture';
import * as bcrypt from 'bcrypt';

describe('AuthService (unit)', () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let jwt: JwtMock;
  let config: ConfigMock;
  let events: EventsGatewayMock;
  let cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let email: {
    sendOtpEmail: jest.Mock;
    sendPasswordResetEmail: jest.Mock;
    sendWelcomeEmail: jest.Mock;
  };
  let firebase: { verifyIdToken: jest.Mock };
  let minio: { uploadFile: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    jwt = createJwtMock();
    config = createConfigMock();
    events = createEventsGatewayMock();
    cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    // sendOtpEmail debe retornar Promise — auth.service hace `.catch()`
    // sobre el resultado en fire-and-forget. Sin esto, las pruebas que
    // entran a la rama de "OTP enviado" estallan con "Cannot read
    // properties of undefined (reading 'catch')".
    email = {
      sendOtpEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    };
    firebase = { verifyIdToken: jest.fn() };
    minio = { uploadFile: jest.fn() };
    // Auditoría fire-and-forget (lastLoginAt/lastIp) en login/socialLogin usa
    // `.catch()`; sin un valor por defecto el mock devuelve undefined y el
    // `.catch` revienta. Los tests que necesitan el RETORNO lo overridean.
    prisma.user.update.mockResolvedValue({} as any);

    // Sub-servicios extraídos del god object (patrón Facade): AuthService
    // delega registro/OTP y gestión de cuenta en ellos. Comparten los mismos
    // mocks para que las pruebas de registro/setup ejerciten la lógica real.
    const registration = new AuthRegistrationService(
      prisma as any,
      jwt as any,
      config as any,
      events as any,
      email as any,
      minio as any,
      cache as any,
    );
    const account = new AuthAccountService(
      prisma as any,
      config as any,
      email as any,
    );

    service = new AuthService(
      prisma as any,
      jwt as any,
      config as any,
      events as any,
      firebase as any,
      registration,
      account,
    );
  });

  // ────────────────────────────────────────────────────────────
  //  LOGIN
  // ────────────────────────────────────────────────────────────
  describe('login()', () => {
    it('lanza NotFoundException si el email no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login('nope@example.com', 'pwd')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza UnauthorizedException si el usuario está inactivo', async () => {
      prisma.user.findUnique.mockResolvedValue(
        userFixture({ isActive: false }),
      );
      await expect(service.login('user@example.com', 'pwd')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si la contraseña no coincide', async () => {
      const hash = await bcrypt.hash('correctpwd', 10);
      prisma.user.findUnique.mockResolvedValue(
        userFixture({ passwordHash: hash }),
      );
      await expect(
        service.login('user@example.com', 'wrongpwd'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('genera tokens y retorna datos del usuario en login exitoso', async () => {
      const hash = await bcrypt.hash('mypwd', 10);
      const user = userFixture({
        id: 42,
        passwordHash: hash,
        firstName: 'Ana',
        lastName: 'Soto',
      });
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login(
        'user@example.com',
        'mypwd',
        '127.0.0.1',
      );

      expect(result).toMatchObject({
        userId: 42,
        role: 'USUARIO',
        firstName: 'Ana',
        lastName: 'Soto',
      });
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      // Se firmó con el secret correcto
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 42,
          email: user.email,
          role: 'USUARIO',
        }),
        expect.objectContaining({ secret: 'test-secret' }),
      );
      // RefreshToken se persiste para poder invalidarlo después
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('no falla si el update de lastLoginAt falla (fire-and-forget)', async () => {
      const hash = await bcrypt.hash('pwd', 10);
      prisma.user.findUnique.mockResolvedValue(
        userFixture({ passwordHash: hash }),
      );
      prisma.user.update.mockRejectedValue(new Error('db hiccup'));
      prisma.refreshToken.create.mockResolvedValue({});

      // No debe lanzar — el update es fire-and-forget.
      await expect(
        service.login('user@example.com', 'pwd', '127.0.0.1'),
      ).resolves.toMatchObject({ accessToken: expect.any(String) });
    });
  });

  // ────────────────────────────────────────────────────────────
  //  REGISTER USER (pre-OTP, datos en Redis)
  // ────────────────────────────────────────────────────────────
  describe('registerUser()', () => {
    const baseDto = {
      email: 'new@example.com',
      password: 'secret123',
      firstName: 'Maria',
      lastName: 'Lopez',
      phone: '987654321',
    };

    it('lanza ConflictException si el email pertenece a una cuenta ACTIVA', async () => {
      prisma.user.findUnique.mockResolvedValue(
        userFixture({ email: baseDto.email, isActive: true }),
      );
      await expect(service.registerUser(baseDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('lanza ConflictException si el email pertenece a cuenta inactiva sin deletedAt (suspendida)', async () => {
      prisma.user.findUnique.mockResolvedValue(
        userFixture({
          email: baseDto.email,
          isActive: false,
          deletedAt: null,
        }),
      );
      await expect(service.registerUser(baseDto)).rejects.toThrow(
        /suspendida/i,
      );
    });

    it('permite re-registro de cuentas soft-deleted (deletedAt presente)', async () => {
      prisma.user.findUnique.mockResolvedValue(
        softDeletedUserFixture({ email: baseDto.email }),
      );
      cache.get.mockResolvedValue(null); // no pending previo
      cache.set.mockResolvedValue(undefined);

      const result = await service.registerUser(baseDto);

      expect(result.requiresEmailVerification).toBe(true);
      expect(result.pendingId).toBeDefined();
      // Cache.set se llamó 3 veces (pending_reg, pending_otp, pending_email)
      expect(cache.set).toHaveBeenCalledTimes(3);
      // Notif a admin USER_PENDING
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'USER_PENDING', targetRole: 'ADMIN' }),
      );
      // REGRESIÓN (notif rota): además del emit efímero, persistir el registro
      // en proceso en el historial del admin (providerId:null → whitelist).
      expect(prisma.adminNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'USER_PENDING',
            providerId: null,
          }),
        }),
      );
      // OTP se envía por email (fire-and-forget)
      expect(email.sendOtpEmail).toHaveBeenCalledWith(
        baseDto.email,
        expect.any(String),
      );
    });

    it('lanza ConflictException si ya hay un proceso de verificación en curso', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      cache.get.mockResolvedValue('existing-pending-id'); // email-key collisiona
      await expect(service.registerUser(baseDto)).rejects.toThrow(
        /proceso de verificación/i,
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  //  REFRESH TOKENS
  // ────────────────────────────────────────────────────────────
  describe('refreshTokens()', () => {
    it('invalida el refresh viejo y emite uno nuevo en éxito', async () => {
      const user = userFixture({ id: 7 });
      // El mock de jwt.verify decodifica el token; le pasamos un payload
      // ya firmado por sign.
      const token = jwt.sign({
        sub: user.id,
        email: user.email,
        role: 'USUARIO',
      });
      prisma.refreshToken.findUnique.mockResolvedValue({
        token,
        user,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 3600_000),
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens(token);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { token },
      });
    });

    it('lanza UnauthorizedException si el refresh ya expiró en BD', async () => {
      const token = jwt.sign({ sub: 1, email: 'x', role: 'USUARIO' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        token,
        user: userFixture(),
        userId: 1,
        expiresAt: new Date(Date.now() - 60_000), // ya pasó
      });
      await expect(service.refreshTokens(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si el token no se puede verificar', async () => {
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('jwt malformed');
      });
      await expect(service.refreshTokens('not-a-valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  //  VERIFY OTP (completa el registro pendiente)
  // ────────────────────────────────────────────────────────────
  describe('verifyOtp()', () => {
    const pendingId = 'pid-abc-123';
    const otpCode = '654321';
    const regData = {
      email: 'new@example.com',
      passwordHash: 'hash',
      firstName: 'New',
      lastName: 'User',
      phone: '999888777',
    };

    it('lanza BadRequestException si el OTP expiró', async () => {
      cache.get.mockResolvedValueOnce(null); // pending_otp ausente
      await expect(service.verifyOtp(pendingId, otpCode)).rejects.toThrow(
        /expirado|inválido/i,
      );
    });

    it('lanza BadRequestException si el código no coincide', async () => {
      cache.get
        .mockResolvedValueOnce('111111') // pending_otp
        .mockResolvedValueOnce(JSON.stringify(regData)); // pending_reg
      await expect(service.verifyOtp(pendingId, otpCode)).rejects.toThrow(
        /inválido/i,
      );
    });

    it('crea usuario nuevo y genera tokens en flujo exitoso', async () => {
      cache.get
        .mockResolvedValueOnce(otpCode)
        .mockResolvedValueOnce(JSON.stringify(regData));
      cache.del.mockResolvedValue(undefined);

      prisma.user.findUnique.mockResolvedValue(null); // no existía
      const created = userFixture({ id: 99, email: regData.email });
      prisma.user.create.mockResolvedValue(created);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.verifyOtp(pendingId, otpCode);

      expect(result).toMatchObject({
        verified: true,
        email: regData.email,
        firstName: created.firstName,
      });
      expect(prisma.user.create).toHaveBeenCalled();
      // Notif NEW_USER_VERIFIED al admin
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NEW_USER_VERIFIED',
          targetRole: 'ADMIN',
        }),
      );
      // REGRESIÓN (notif rota): el emit de arriba es EFÍMERO. Sin esta fila
      // persistida el registro se veía en el feed del dashboard pero NO
      // quedaba en el historial del admin. providerId:null → aparece por el
      // whitelist de `type` en ADMIN_NOTIF_WHERE.
      expect(prisma.adminNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'NEW_USER_VERIFIED',
            providerId: null,
          }),
        }),
      );
    });

    it('reactiva cuenta soft-deleted en vez de crear duplicada', async () => {
      cache.get
        .mockResolvedValueOnce(otpCode)
        .mockResolvedValueOnce(JSON.stringify(regData));
      cache.del.mockResolvedValue(undefined);

      const old = softDeletedUserFixture({ id: 50, email: regData.email });
      prisma.user.findUnique.mockResolvedValue(old);
      prisma.provider.deleteMany.mockResolvedValue({ count: 0 });
      // _reactivateUser hace un user.update internamente
      prisma.user.update.mockResolvedValue({
        ...old,
        isActive: true,
        hasUsedTrial: true,
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.verifyOtp(pendingId, otpCode);

      expect(result.verified).toBe(true);
      // Reactivación borra providers viejos para forzar re-aprobación
      expect(prisma.provider.deleteMany).toHaveBeenCalledWith({
        where: { userId: old.id },
      });
      // Marca hasUsedTrial → no recibe mes gratis otra vez
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ hasUsedTrial: true, coins: 0 }),
        }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  //  SOCIAL LOGIN (Firebase)
  // ────────────────────────────────────────────────────────────
  describe('socialLogin()', () => {
    it('crea cuenta nueva cuando Firebase trae un email sin usuario previo', async () => {
      firebase.verifyIdToken.mockResolvedValue({
        uid: 'fbuid-1',
        email: 'social@example.com',
        name: 'Ana Soto',
        picture: 'https://pic',
      });
      prisma.user.findFirst.mockResolvedValue(null);
      const created = socialUserFixture({
        id: 200,
        email: 'social@example.com',
      });
      prisma.user.create.mockResolvedValue(created);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.socialLogin('firebase-id-token');

      expect(result.isNewUser).toBe(true);
      expect(prisma.user.create).toHaveBeenCalled();
      // emitNotification admin NEW_USER_VERIFIED
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NEW_USER_VERIFIED',
          targetRole: 'ADMIN',
        }),
      );
      // REGRESIÓN (notif rota): el registro con Google se veía en el feed del
      // dashboard pero NO se guardaba. Debe persistir adminNotification con
      // providerId:null (visible vía whitelist de type en ADMIN_NOTIF_WHERE).
      expect(prisma.adminNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'NEW_USER_VERIFIED',
            providerId: null,
          }),
        }),
      );
    });

    // REGRESIÓN (Plan D): la respuesta plana DEBE incluir userId + role, igual
    // que /login y /verify-otp. El móvil arma el UserModel con data['userId']
    // (cast a int) y data['role']. Si alguien borra esos campos, la sesión
    // social deja de persistir ("no has iniciado sesión" al reabrir) — este
    // test falla antes de que eso llegue a producción.
    it('REGRESIÓN: la respuesta incluye userId y role (shape consistente)', async () => {
      firebase.verifyIdToken.mockResolvedValue({
        uid: 'fbuid-shape',
        email: 'shape@example.com',
        name: 'Shape Test',
      });
      prisma.user.findFirst.mockResolvedValue(null);
      const created = socialUserFixture({
        id: 321,
        email: 'shape@example.com',
        role: 'USUARIO',
      });
      prisma.user.create.mockResolvedValue(created);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = (await service.socialLogin('token')) as Record<
        string,
        unknown
      >;

      expect(result).toHaveProperty('userId', 321);
      expect(result).toHaveProperty('role', 'USUARIO');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('vincula firebaseUid (NO bloquea) si el email existe sin firebaseUid', async () => {
      // Cuenta creada por email/password, o social cuyo firebaseUid se limpió.
      // Firebase ya verificó el correo → se vincula y loguea, no se bloquea.
      firebase.verifyIdToken.mockResolvedValue({
        uid: 'fbuid-2',
        email: 'manual@example.com',
        picture: 'https://pic',
      });
      const existing = userFixture({
        id: 77,
        email: 'manual@example.com',
        firebaseUid: null,
        isActive: true,
      });
      prisma.user.findFirst.mockResolvedValue(existing);
      prisma.user.update.mockResolvedValue({ ...existing, firebaseUid: 'fbuid-2' });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.socialLogin('any-token');

      expect(result.isNewUser).toBe(false);
      expect(result.userId).toBe(existing.id);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: existing.id },
          data: expect.objectContaining({ firebaseUid: 'fbuid-2' }),
        }),
      );
    });

    it('reactiva cuenta soft-deleted vía social SIN otorgar mes de gracia', async () => {
      firebase.verifyIdToken.mockResolvedValue({
        uid: 'fbuid-3',
        email: 'deleted@example.com',
      });
      const soft = softDeletedUserFixture({ email: 'deleted@example.com' });
      prisma.user.findFirst.mockResolvedValue(soft);
      prisma.provider.deleteMany.mockResolvedValue({ count: 1 });
      prisma.user.update.mockResolvedValue({
        ...soft,
        isActive: true,
        hasUsedTrial: true,
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.socialLogin('any-token');

      expect(result.isNewUser).toBe(false);
      expect(prisma.provider.deleteMany).toHaveBeenCalledWith({
        where: { userId: soft.id },
      });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
            deletedAt: null,
            coins: 0,
            hasUsedTrial: true,
          }),
        }),
      );
    });

    it('lanza UnauthorizedException si la cuenta está suspendida por admin (inactiva sin deletedAt)', async () => {
      firebase.verifyIdToken.mockResolvedValue({
        uid: 'fbuid-4',
        email: 'banned@example.com',
      });
      prisma.user.findFirst.mockResolvedValue(
        userFixture({
          email: 'banned@example.com',
          isActive: false,
          deletedAt: null,
        }),
      );
      await expect(service.socialLogin('any-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza BadRequestException si Firebase no devuelve email', async () => {
      firebase.verifyIdToken.mockResolvedValue({
        uid: 'no-email',
        email: undefined,
      });
      await expect(service.socialLogin('any-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  //  SETUP PASSWORD (obs 6 — usuarios sociales sin pwd propia)
  // ────────────────────────────────────────────────────────────
  describe('setupPassword()', () => {
    it('rechaza contraseñas menores a 6 caracteres', async () => {
      await expect(service.setupPassword(1, '123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza usuarios MANUAL (sin firebaseUid)', async () => {
      prisma.user.findUnique.mockResolvedValue(
        userFixture({ id: 1, firebaseUid: null }),
      );
      await expect(service.setupPassword(1, 'newPassword')).rejects.toThrow(
        /contraseña/i,
      );
    });

    it('rechaza usuarios sociales que ya establecieron contraseña real', async () => {
      const user = socialUserFixture({
        id: 1,
        firebaseUid: 'fbuid-x',
        // Hash de "una-contraseña-real" — NO el dummy FIREBASE_SOCIAL_*.
        passwordHash: await bcrypt.hash('contraseña-real', 10),
      });
      prisma.user.findUnique.mockResolvedValue(user);
      await expect(service.setupPassword(1, 'otra-contraseña')).rejects.toThrow(
        /Ya estableciste/i,
      );
    });

    it('permite establecer contraseña a usuario social con dummy hash', async () => {
      const uid = 'fbuid-y';
      const dummyHash = await bcrypt.hash(`FIREBASE_SOCIAL_${uid}`, 10);
      prisma.user.findUnique.mockResolvedValue(
        socialUserFixture({
          id: 1,
          firebaseUid: uid,
          passwordHash: dummyHash,
        }),
      );
      prisma.user.update.mockResolvedValue({});

      const result = await service.setupPassword(1, 'nueva-contraseña-real');

      expect(result.message).toMatch(/establecida/i);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ passwordHash: expect.any(String) }),
        }),
      );
    });
  });
});
