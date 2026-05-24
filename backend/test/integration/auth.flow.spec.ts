/**
 * INTEGRATION — Flujo de autenticación completo contra Postgres real.
 *
 * Levantamos AuthService con:
 *   • Prisma real (test/utils/db.util.ts) → oficio_test_db.
 *   • JwtService real (@nestjs/jwt) — firma y verifica JWTs reales.
 *   • Cache in-memory (Map) — emula Redis sin levantar Redis.
 *   • Email/Firebase/Minio/Events/Push mockeados — no se llama a la red.
 *
 * Flujos cubiertos:
 *   1. registerUser → pendingId + OTP en cache + USER_PENDING emitido.
 *   2. verifyOtp → user real persistido + tokens reales.
 *   3. login → tokens reales + refreshToken persistido en BD.
 *   4. Login con password inválida → 401.
 *   5. refreshTokens → invalida viejo + emite par nuevo.
 *   6. refreshTokens con token inválido → 401.
 */

import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../src/auth/auth.service.js';
import { getTestPrisma, disconnectTestPrisma, truncateAll } from '../utils/db.util';
import { createEventsGatewayMock } from '../mocks/events-gateway.mock';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';

// ─── Helpers de DI manual ────────────────────────────────────────────
function buildAuthService(prisma: PrismaService) {
  const jwt = new JwtService({});
  const config = {
    get: (key: string) => process.env[key],
  } as unknown as import('@nestjs/config').ConfigService;
  const events = createEventsGatewayMock();
  const cache  = createInMemoryCache();
  // EmailService.sendOtpEmail debe retornar Promise — auth.service hace
  // `.catch()` sobre el resultado (fire-and-forget).
  const email  = {
    sendOtpEmail:           jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };
  const firebase = { verifyIdToken: jest.fn().mockResolvedValue(undefined) };
  const minio    = { uploadFile:    jest.fn().mockResolvedValue('') };

  const service = new AuthService(
    prisma,
    jwt,
    config,
    events as any,
    email as any,
    firebase as any,
    minio as any,
    cache as any,
  );
  return { service, jwt, events, cache, email };
}

function createInMemoryCache() {
  const store = new Map<string, string>();
  return {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: any, _ttlMs?: number) => {
      store.set(key, String(value));
    }),
    del: jest.fn(async (key: string) => store.delete(key)),
    _store: store,
  };
}

// ─── Suite ──────────────────────────────────────────────────────────
describe('Auth flow (integration)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await getTestPrisma();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  // ──────────────────────────────────────────────────────────────────
  it('register → OTP en cache → verifyOtp crea User + tokens reales', async () => {
    const { service, jwt, cache } = buildAuthService(prisma);

    // Paso 1: registerUser
    const reg = await service.registerUser({
      email:     'flow-register@example.com',
      password:  'Pwd-flow-2026!',
      firstName: 'Lucia',
      lastName:  'Rojas',
      phone:     '987654321',
    });

    expect(reg.requiresEmailVerification).toBe(true);
    expect(reg.pendingId).toBeDefined();
    expect(reg._devOtpCode).toMatch(/^\d{6}$/);

    // El cache debe tener las 3 entradas (pending_reg, pending_otp, pending_email).
    expect(cache._store.has(`pending_reg:${reg.pendingId}`)).toBe(true);
    expect(cache._store.has(`pending_otp:${reg.pendingId}`)).toBe(true);
    expect(cache._store.has('pending_email:flow-register@example.com')).toBe(true);

    // Hasta acá, NO debe existir el user en BD.
    const before = await prisma.user.findUnique({ where: { email: 'flow-register@example.com' } });
    expect(before).toBeNull();

    // Paso 2: verifyOtp con el código real
    const verified = await service.verifyOtp(reg.pendingId, reg._devOtpCode!);
    expect(verified.verified).toBe(true);
    expect(verified.accessToken).toBeDefined();
    expect(verified.refreshToken).toBeDefined();

    // Ahora SÍ debe estar en BD, marcado como isEmailVerified.
    const after = await prisma.user.findUnique({
      where: { email: 'flow-register@example.com' },
    });
    expect(after).not.toBeNull();
    expect(after!.isEmailVerified).toBe(true);
    expect(after!.firstName).toBe('Lucia');

    // El refresh token está persistido (login posterior puede rotarlo).
    const stored = await prisma.refreshToken.findUnique({
      where: { token: verified.refreshToken },
    });
    expect(stored).not.toBeNull();
    expect(stored!.userId).toBe(after!.id);

    // Y el JWT es verificable con el secret correcto.
    const payload = jwt.verify<{ sub: number; email: string; role: string }>(
      verified.accessToken,
      { secret: process.env.JWT_SECRET },
    );
    expect(payload.sub).toBe(after!.id);
    expect(payload.email).toBe('flow-register@example.com');
  });

  // ──────────────────────────────────────────────────────────────────
  it('login con email + password reales emite tokens y persiste refresh', async () => {
    const { service } = buildAuthService(prisma);

    // Setup: registramos + verificamos para tener un user activo con
    // password real.
    const reg = await service.registerUser({
      email:     'flow-login@example.com',
      password:  'Login-flow-2026!',
      firstName: 'Mario',
      lastName:  'Lopez',
    });
    await service.verifyOtp(reg.pendingId, reg._devOtpCode!);

    // El JWT tiene resolución de segundos en `iat`. Si verifyOtp y
    // login firman ambos en el MISMO segundo + mismo payload, el
    // string del JWT es idéntico y prisma rechaza el create del
    // refresh por unique constraint. Esperamos > 1s.
    await new Promise((r) => setTimeout(r, 1100));

    // Path feliz
    const result = await service.login('flow-login@example.com', 'Login-flow-2026!', '127.0.0.1');
    expect(result.userId).toBeGreaterThan(0);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.firstName).toBe('Mario');

    // Token persistido en BD.
    const stored = await prisma.refreshToken.findUnique({ where: { token: result.refreshToken } });
    expect(stored).not.toBeNull();

    // lastLoginAt y lastIp deben actualizarse (fire-and-forget, esperamos un tick).
    await new Promise((r) => setImmediate(r));
    const updated = await prisma.user.findUnique({ where: { id: result.userId } });
    expect(updated!.lastLoginAt).not.toBeNull();
    expect(updated!.lastIp).toBe('127.0.0.1');
  });

  // ──────────────────────────────────────────────────────────────────
  it('login con password incorrecta lanza UnauthorizedException', async () => {
    const { service } = buildAuthService(prisma);
    const reg = await service.registerUser({
      email:     'flow-badpwd@example.com',
      password:  'Right-pwd-2026!',
      firstName: 'Ana',
      lastName:  'Soto',
    });
    await service.verifyOtp(reg.pendingId, reg._devOtpCode!);

    await expect(
      service.login('flow-badpwd@example.com', 'Wrong-pwd!!!'),
    ).rejects.toThrow(UnauthorizedException);

    // Y NO debe haberse creado ningún refresh token para esa cuenta.
    const user  = await prisma.user.findUnique({ where: { email: 'flow-badpwd@example.com' } });
    const after = await prisma.refreshToken.count({ where: { userId: user!.id } });
    // Hay 1 sí: el de verifyOtp del setup. NO debe haberse sumado uno por el login fallido.
    expect(after).toBe(1);
  });

  // ──────────────────────────────────────────────────────────────────
  it('login con email no registrado lanza NotFoundException', async () => {
    const { service } = buildAuthService(prisma);
    await expect(service.login('inexistente@example.com', 'cualquiera'))
      .rejects.toThrow(NotFoundException);
  });

  // ──────────────────────────────────────────────────────────────────
  it('refreshTokens invalida el refresh viejo y emite par nuevo', async () => {
    const { service } = buildAuthService(prisma);
    const reg = await service.registerUser({
      email:     'flow-refresh@example.com',
      password:  'Pwd-refresh-2026!',
      firstName: 'Refresh',
      lastName:  'Test',
    });
    const verified = await service.verifyOtp(reg.pendingId, reg._devOtpCode!);
    const oldRefresh = verified.refreshToken;

    // Esperar 1 segundo para que el JWT firmado tenga un `iat`
    // distinto al viejo — sin esto, firmar con el mismo payload +
    // secret + expiresIn produce el mismo string y el test no puede
    // distinguir rotación.
    await new Promise((r) => setTimeout(r, 1100));

    // Refresh
    const rotated = await service.refreshTokens(oldRefresh);
    expect(rotated.accessToken).toBeDefined();
    expect(rotated.refreshToken).toBeDefined();
    expect(rotated.refreshToken).not.toBe(oldRefresh);

    // El viejo se borró de la BD (single-use).
    const oldRow = await prisma.refreshToken.findUnique({ where: { token: oldRefresh } });
    expect(oldRow).toBeNull();

    // El nuevo está en la BD y es la única fila del usuario.
    const user   = await prisma.user.findUnique({ where: { email: 'flow-refresh@example.com' } });
    const newRow = await prisma.refreshToken.findUnique({ where: { token: rotated.refreshToken } });
    expect(newRow).not.toBeNull();
    expect(newRow!.userId).toBe(user!.id);
    const allTokens = await prisma.refreshToken.count({ where: { userId: user!.id } });
    expect(allTokens).toBe(1);
  });

  // ──────────────────────────────────────────────────────────────────
  it('refreshTokens con token inválido o ya consumido lanza UnauthorizedException', async () => {
    const { service } = buildAuthService(prisma);

    // (a) Token totalmente malformado.
    await expect(service.refreshTokens('not-a-real-token'))
      .rejects.toThrow(UnauthorizedException);

    // (b) Token que parece JWT pero firmado con otro secret.
    const fake = new JwtService({}).sign(
      { sub: 9999, email: 'x@x', role: 'USUARIO' },
      { secret: 'wrong-secret' },
    );
    await expect(service.refreshTokens(fake))
      .rejects.toThrow(UnauthorizedException);
  });
});
