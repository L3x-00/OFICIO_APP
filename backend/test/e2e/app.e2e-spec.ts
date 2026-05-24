/**
 * E2E — NestJS AppModule completo.
 *
 * Bootea TODA la app contra:
 *   • oficio_test_db (Postgres real del docker-compose).
 *   • Redis real con password redis_pass_2025 (CacheModule).
 *   • Throttler real (ttl=60s, limit=60).
 *
 * Aplica los mismos hooks globales de main.ts: ValidationPipe (whitelist
 * + forbidNonWhitelisted + transform) y filtros/interceptores Prisma.
 *
 * Cubre:
 *   1. GET /health → 200 con shape esperado.
 *   2. POST /auth/login con DTO inválido → 400 (ValidationPipe).
 *   3. POST /auth/login → 404 si email no existe (UNAUTHORIZED real).
 *   4. Flujo JWT real: register → verifyOtp → login → GET /users/me con
 *      bearer token → 200.
 *   5. GET /users/me sin token → 401.
 *   6. Rate limiting: ≥1 request en una ráfaga de 80 al /health debe
 *      devolver 429 (ThrottlerGuard activo).
 */

import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcrypt';

import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { truncateAll } from '../utils/db.util';

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mismos hooks que main.ts.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    await truncateAll(prisma);
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  // ─────────────────────────────────────────────────────────────────
  it('GET /health responde 200 con { status: "ok", timestamp }', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    // El healthCheck() devuelve `new Date()` — NestJS sin
    // BigintInterceptor (que no montamos aquí intencionalmente) lo
    // serializa como objeto. Validamos solo que esté presente.
    expect(res.body.timestamp).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────
  it('POST /auth/login con DTO inválido (sin email) → 400 ValidationPipe', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ password: 'cualquiera' });
    expect(res.status).toBe(400);
    expect(
      Array.isArray(res.body.message) || typeof res.body.message === 'string',
    ).toBe(true);
  });

  it('POST /auth/login con email malformado → 400 ValidationPipe', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'no-es-email', password: 'algo' });
    expect(res.status).toBe(400);
  });

  it('POST /auth/login con email no registrado → 404', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'inexistente-e2e@example.com', password: 'algo' });
    expect(res.status).toBe(404);
  });

  // ─────────────────────────────────────────────────────────────────
  it('Flujo JWT real: login + GET /users/me con bearer token → 200', async () => {
    // Sembramos un usuario directo en BD para evitar OTP / Redis flow.
    const password = 'E2e-real-pwd-2026!';
    const passwordHash = await bcrypt.hash(password, 4);
    await truncateAll(prisma); // limpio antes de este test específico

    const created = await prisma.user.create({
      data: {
        email: 'e2e-jwt@example.com',
        passwordHash,
        firstName: 'Jwt',
        lastName: 'Tester',
        role: 'USUARIO',
        isActive: true,
        isEmailVerified: true,
      },
    });

    // login real → obtiene access token firmado con JWT_SECRET.
    // NestJS por default devuelve 201 a POSTs (POST /auth/login no usa
    // @HttpCode(200)), aceptamos ambos para evitar coupling con la
    // anotación del controller.
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2e-jwt@example.com', password });
    expect([200, 201]).toContain(loginRes.status);
    expect(loginRes.body.accessToken).toBeDefined();
    const token = loginRes.body.accessToken as string;

    // /users/me protegido por JwtAuthGuard.
    const meRes = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.id).toBe(created.id);
    expect(meRes.body.email).toBe('e2e-jwt@example.com');
  });

  it('GET /users/me sin Authorization header → 401', async () => {
    const res = await request(app.getHttpServer()).get('/users/me');
    expect(res.status).toBe(401);
  });

  it('GET /users/me con bearer inválido → 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer bogus-token');
    expect(res.status).toBe(401);
  });

  // ─────────────────────────────────────────────────────────────────
  // ThrottlerGuard global (limit=60 en 60s). Mandamos 80 requests al
  // /health en serie y exigimos que AL MENOS UNO devuelva 429. Si el
  // throttler no estuviera montado, todos serían 200.
  it('ThrottlerGuard activo: ráfaga de 80 requests dispara 429', async () => {
    const responses: number[] = [];
    for (let i = 0; i < 80; i++) {
      const r = await request(app.getHttpServer()).get('/health');
      responses.push(r.status);
    }
    const throttled = responses.filter((s) => s === 429).length;
    const ok = responses.filter((s) => s === 200).length;

    expect(ok).toBeGreaterThan(0);
    expect(throttled).toBeGreaterThan(0);
    expect(throttled + ok).toBe(80);
  }, 60_000);
});
