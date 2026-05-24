/**
 * Fixtures de usuarios para tests unitarios. Producen objetos completos
 * compatibles con `select` de Prisma — los tests sobrescriben los campos
 * relevantes con spread.
 */

export type FixtureUser = {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: 'USUARIO' | 'PROVEEDOR' | 'ADMIN';
  isActive: boolean;
  isEmailVerified: boolean;
  firebaseUid: string | null;
  coins: number;
  hasUsedTrial: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  department: string | null;
  province: string | null;
  district: string | null;
  fcmToken: string | null;
  lastIp: string | null;
  lastLoginAt: Date | null;
};

export const userFixture = (overrides: Partial<FixtureUser> = {}): FixtureUser => ({
  id:               1,
  email:            'user@example.com',
  passwordHash:     '$2b$10$dummyhashforfixtureonly1234567890ABCD',
  firstName:        'Juan',
  lastName:         'Pérez',
  phone:            '999999999',
  avatarUrl:        null,
  role:             'USUARIO',
  isActive:         true,
  isEmailVerified:  true,
  firebaseUid:      null,
  coins:            0,
  hasUsedTrial:     false,
  deletedAt:        null,
  createdAt:        new Date('2026-01-01T00:00:00Z'),
  updatedAt:        new Date('2026-01-01T00:00:00Z'),
  department:       'Lima',
  province:         'Lima',
  district:         'Miraflores',
  fcmToken:         null,
  lastIp:           null,
  lastLoginAt:      null,
  ...overrides,
});

/** Usuario social-only (Google) — passwordHash es dummy y tiene firebaseUid. */
export const socialUserFixture = (overrides: Partial<FixtureUser> = {}): FixtureUser =>
  userFixture({
    email:        'social@example.com',
    firebaseUid:  'firebase-uid-abc-123',
    passwordHash: '$2b$10$socialdummyhashvalueABCDEF1234567890ABCD',
    ...overrides,
  });

/** Usuario soft-deleted — puede re-registrarse SIN beneficios (anti-freemium). */
export const softDeletedUserFixture = (overrides: Partial<FixtureUser> = {}): FixtureUser =>
  userFixture({
    email:        'deleted@example.com',
    isActive:     false,
    deletedAt:    new Date('2026-01-15T00:00:00Z'),
    hasUsedTrial: true,
    coins:        0,
    ...overrides,
  });
