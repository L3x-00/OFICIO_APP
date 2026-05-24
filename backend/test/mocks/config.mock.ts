/**
 * Mock mínimo de `ConfigService` de @nestjs/config para UNIT tests.
 *
 * Acepta un mapa `key → value` opcional al construir; sin él devuelve
 * valores razonables de ambiente test.
 */
const DEFAULTS: Record<string, string> = {
  JWT_SECRET: 'test-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_EXPIRES_IN: '8h',
  JWT_REFRESH_EXPIRES_IN: '7d',
  NODE_ENV: 'test',
};

export type ConfigMock = {
  get: jest.Mock;
};

export function createConfigMock(
  overrides: Record<string, string> = {},
): ConfigMock {
  const merged = { ...DEFAULTS, ...overrides };
  const get = jest.fn((key: string) => merged[key]);
  return { get };
}
