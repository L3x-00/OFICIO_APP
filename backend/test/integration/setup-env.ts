import { jest } from '@jest/globals';

/**
 * Setup file de jest-integration — corre ANTES de cualquier import.
 *
 * 1. Inyecta `jest` como global (en modo ESM no se inyecta por
 *    defecto, y los mocks compartidos con UNIT tests usan
 *    `jest.fn()` directamente sin import).
 * 2. Setea las env vars que PrismaService y los demás servicios leen
 *    al cargarse. Sin esto, PrismaService intentaría conectarse a la
 *    BD de dev (oficio_db) en lugar de oficio_test_db.
 *
 * Si el caller exporta DATABASE_URL antes de invocar a jest, lo
 * respetamos — útil para CI o para apuntar a una BD distinta sin
 * editar este archivo.
 */
(globalThis as unknown as { jest: typeof jest }).jest = jest;

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://oficio_user:oficio_pass_2025@localhost:5432/oficio_test_db?schema=public';

process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'integration-test-jwt-secret';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'integration-test-jwt-refresh';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Redis del docker-compose (`redis_pass_2025`). Solo el E2E levanta el
// AppModule completo y necesita conectarse a Redis real para el
// CacheModule + ThrottlerModule storage; los integration tests usan
// cache in-memory y no tocan estas vars.
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_TLS = process.env.REDIS_TLS || 'false';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'redis_pass_2025';

// Servicios externos deshabilitados en test — los stubs no llaman a la
// red real pero algunos clients fallan en boot si la env var falta.
process.env.BREVO_API_KEY = 'integration-disabled';
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_PORT = '9000';
process.env.MINIO_USE_SSL = 'false';
process.env.MINIO_ACCESS_KEY = 'integration-test';
process.env.MINIO_SECRET_KEY = 'integration-test-secret';
process.env.MINIO_BUCKET_NAME = 'integration-test';
