/**
 * UNIT — Estrategias de Passport: GoogleStrategy + JwtStrategy.
 * Cubre inicialización y la lógica de `validate`.
 */
import { UnauthorizedException } from '@nestjs/common';
import { GoogleStrategy } from '../../src/auth/strategy/google.strategy.js';
import { JwtStrategy } from '../../src/auth/jwt.strategy.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import { createConfigMock } from '../mocks/config.mock';

describe('GoogleStrategy (unit)', () => {
  beforeAll(() => {
    // El constructor de passport-google-oauth20 exige estas credenciales.
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost/cb';
  });

  it('se inicializa sin lanzar', () => {
    expect(() => new GoogleStrategy()).not.toThrow();
  });

  it('validate() arma el usuario desde el perfil y llama done(null, user)', async () => {
    const strategy = new GoogleStrategy();
    const done = jest.fn();
    const profile = {
      id: 'g-123',
      name: { givenName: 'Ana', familyName: 'Soto' },
      emails: [{ value: 'ana@example.com' }],
      photos: [{ value: 'https://pic' }],
    };
    await strategy.validate('access-tok', 'refresh-tok', profile, done);
    expect(done).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        googleId: 'g-123',
        email: 'ana@example.com',
        firstName: 'Ana',
        lastName: 'Soto',
        picture: 'https://pic',
        accessToken: 'access-tok',
      }),
    );
  });
});

describe('JwtStrategy (unit)', () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
  });

  it('lanza si falta JWT_SECRET', () => {
    const config = createConfigMock({ JWT_SECRET: '' });
    expect(() => new JwtStrategy(config as any, prisma as any)).toThrow(
      /JWT_SECRET/,
    );
  });

  it('se inicializa con JWT_SECRET presente', () => {
    const config = createConfigMock();
    expect(() => new JwtStrategy(config as any, prisma as any)).not.toThrow();
  });

  describe('validate()', () => {
    let strategy: JwtStrategy;
    beforeEach(() => {
      strategy = new JwtStrategy(createConfigMock() as any, prisma as any);
    });

    it('payload sin sub/email → Unauthorized', async () => {
      await expect(strategy.validate({ sub: 1 })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('usuario inexistente → Unauthorized', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        strategy.validate({ sub: 7, email: 'a@b.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('usuario inactivo → Unauthorized', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 7,
        isActive: false,
        role: 'USUARIO',
      });
      await expect(
        strategy.validate({ sub: 7, email: 'a@b.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('válido → devuelve { userId, role } con el rol REAL de la BD', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 7,
        isActive: true,
        role: 'ADMIN',
      });
      const res = await strategy.validate({ sub: 7, email: 'a@b.com' });
      expect(res).toEqual({
        userId: 7,
        id: 7,
        email: 'a@b.com',
        role: 'ADMIN',
      });
    });
  });
});
