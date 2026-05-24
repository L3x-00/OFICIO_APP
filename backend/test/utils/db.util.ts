/**
 * Helpers para INTEGRATION tests con PostgreSQL real.
 *
 * Crea una `PrismaService` apuntando a la BD del runner (DATABASE_URL
 * inyectado por el CI o por `.env.test` localmente). Provee:
 *   - `withDb(fn)`: lambda que conecta, ejecuta y desconecta.
 *   - `truncateAll(prisma)`: limpia las tablas que tocan los flows
 *     testeados (users, providers, referrals, chat, subastas) ANTES de
 *     cada test, para que cada uno corra contra un estado conocido.
 *
 * Importante:
 *   - NO toca migraciones — asume que `prisma db push` ya corrió en CI.
 *   - El orden del truncate respeta las FKs (cascade evita errores).
 */
import { PrismaService } from '../../prisma/prisma.service.js';

let _prisma: PrismaService | null = null;

export async function getTestPrisma(): Promise<PrismaService> {
  if (!_prisma) {
    _prisma = new PrismaService();
    await _prisma.$connect();
  }
  return _prisma;
}

export async function disconnectTestPrisma() {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
}

/**
 * Limpia TODO el contenido aplicable a los integration tests. Usa
 * TRUNCATE ... RESTART IDENTITY CASCADE para resetear secuencias también
 * (los tests asumen ids predecibles dentro de su scope, no globales,
 * pero los autoincrementos no deben acumular ruido entre tests).
 *
 * NO usar en producción jamás.
 */
export async function truncateAll(prisma: PrismaService) {
  const tables = [
    'admin_notifications',
    'chat_messages',
    'chat_rooms',
    'offers',
    'service_requests',
    'coin_redemptions',
    'referral_rewards',
    'referrals',
    'referral_codes',
    'user_penalties',
    'yape_payments',
    'payments',
    'subscriptions',
    'provider_categories',
    'provider_images',
    'providers',
    'otp_codes',
    'refresh_tokens',
    'users',
  ];
  // Una sola sentencia para minimizar round-trips.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`,
  );
}

/**
 * Si la BD test no tiene catálogos mínimos (categorías, localities) los
 * crea idempotente. Los flujos de subastas/registro provider los
 * necesitan.
 */
export async function ensureSeedCatalogs(prisma: PrismaService) {
  // Localidad mínima
  await prisma.locality.upsert({
    where:  { id: 1 },
    create: {
      id:         1,
      name:       'Test City',
      department: 'Lima',
      province:   'Lima',
      district:   'Miraflores',
      isActive:   true,
      source:     'SEED',
    },
    update: {},
  });
  // Categoría raíz + hija
  await prisma.category.upsert({
    where:  { slug: 'test-root' },
    create: { name: 'Servicios', slug: 'test-root', isActive: true },
    update: {},
  });
  const root = await prisma.category.findUnique({ where: { slug: 'test-root' } });
  await prisma.category.upsert({
    where:  { slug: 'test-electricidad' },
    create: {
      name:     'Electricidad',
      slug:     'test-electricidad',
      parentId: root!.id,
      isActive: true,
    },
    update: {},
  });
}
