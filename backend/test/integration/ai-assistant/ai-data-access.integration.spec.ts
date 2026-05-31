/**
 * INTEGRATION — AiDataAccessService contra Postgres+PostGIS real.
 *
 * NO se mockea Prisma. Validamos:
 *   1. searchProvidersSafe (geo) → DTOs PLANOS (sin phone/email/userId).
 *   2. withTimeout corta queries lentas (>3s) y devuelve fallback.
 *   3. getMyContextSafe → DTO estricto (rating, plan / coins).
 *
 * Las tablas IA se crearon en oficio_test_db. El trigger de geog no existe
 * en test → seteamos location_geog a mano para la prueba PostGIS.
 */
import { AiDataAccessService } from '../../../src/ai-assistant/ai-data-access.service.js';
import {
  getTestPrisma,
  disconnectTestPrisma,
  truncateAll,
  ensureSeedCatalogs,
} from '../../utils/db.util';
import { createTestUser, createTestProvider } from '../../utils/factories';
import type { PrismaService } from '../../../prisma/prisma.service.js';

const HCO_LAT = -12.0653;
const HCO_LNG = -75.2049;

describe('AiDataAccessService (integration, BD real)', () => {
  let prisma: PrismaService;
  let data: AiDataAccessService;

  beforeAll(async () => {
    prisma = await getTestPrisma();
    data = new AiDataAccessService(prisma);
  });

  beforeEach(async () => {
    await truncateAll(prisma);
    await ensureSeedCatalogs(prisma);
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  it('Test 1 (PostGIS): searchProvidersSafe con coords Huancayo → DTOs planos (sin phone/email/userId)', async () => {
    const u = await createTestUser(prisma);
    const p = await createTestProvider(prisma, u.id, {
      categoryName: 'Electricistas',
      businessName: 'Electricistas Huancayo',
      averageRating: 4.5,
    });
    // En prod un trigger calcula location_geog; en test lo seteamos a mano.
    await prisma.$executeRawUnsafe(
      `UPDATE providers SET latitude = $1, longitude = $2,
         location_geog = ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
       WHERE id = $3`,
      HCO_LAT,
      HCO_LNG,
      p.id,
    );

    const res = await data.searchProvidersSafe('electricista', HCO_LAT, HCO_LNG, 10);

    expect(res.length).toBeGreaterThanOrEqual(1);
    const dto = res[0];
    // DTO plano esperado:
    expect(dto).toHaveProperty('businessName');
    expect(dto).toHaveProperty('averageRating', 4.5);
    expect(dto).toHaveProperty('distanceKm');
    // NUNCA expone campos crudos de la entidad Prisma:
    expect(dto).not.toHaveProperty('phone');
    expect(dto).not.toHaveProperty('whatsapp');
    expect(dto).not.toHaveProperty('email');
    expect(dto).not.toHaveProperty('userId');
  });

  it('Test 2 (Timeout): query lenta (5s) → withTimeout corta a 3s y devuelve fallback []', async () => {
    // Rama sin lat/lng usa prisma.provider.findMany → la hacemos lenta.
    const slow = jest
      .spyOn(prisma.provider, 'findMany')
      .mockImplementation(
        (() =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve([
                  { id: 1, businessName: 'lenta', averageRating: 5, totalReviews: 0, slug: null },
                ]),
              5000,
            ),
          )) as any,
      );

    const start = Date.now();
    const res = await data.searchProvidersSafe('electricista');
    const elapsed = Date.now() - start;

    slow.mockRestore();

    expect(res).toEqual([]); // fallback, NO la data lenta
    expect(elapsed).toBeLessThan(4500); // cortó a ~3s, no esperó los 5s
  }, 12000);

  it('Test 3 (Contexto PROVEEDOR): getMyContextSafe → DTO estricto con rating y plan', async () => {
    const u = await createTestUser(prisma, { role: 'PROVEEDOR', coins: 120 });
    const p = await createTestProvider(prisma, u.id, { averageRating: 4.5 });
    await prisma.subscription.create({
      data: {
        providerId: p.id,
        plan: 'ESTANDAR',
        status: 'ACTIVA',
        endDate: new Date(Date.now() + 1_000_000_000),
      },
    });

    const ctx = await data.getMyContextSafe(u.id, 'PROVEEDOR');

    expect(ctx.role).toBe('PROVEEDOR');
    expect(ctx.provider).toBeDefined();
    expect(ctx.provider!.averageRating).toBe(4.5);
    expect(ctx.provider!.plan).toBe('ESTANDAR');
    expect(ctx.provider).toHaveProperty('totalReviews');
    expect(ctx.provider).toHaveProperty('photosCount');
    expect(ctx.provider).toHaveProperty('activeOffers');
    // estricto: nada de entidad cruda
    expect(ctx.provider).not.toHaveProperty('userId');
    expect(ctx.provider).not.toHaveProperty('phone');
  });

  it('Test 3b (Contexto USUARIO): getMyContextSafe → coins + favorites', async () => {
    const u = await createTestUser(prisma, { coins: 80 });
    const ctx = await data.getMyContextSafe(u.id, 'USUARIO');

    expect(ctx.user).toBeDefined();
    expect(ctx.user!.coins).toBe(80);
    expect(ctx.user).toHaveProperty('favorites');
  });
});
