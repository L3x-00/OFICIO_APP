import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client/client.js';

const TEST_USER_ID = 2;
const TEST_PASSWORD = 'Test1234';
// Huancayo, Junín, Perú.
const HCO_LAT = -12.0653;
const HCO_LNG = -75.2049;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    // 1. Locality Huancayo (provider la requiere por FK).
    let locality = await prisma.locality.findFirst({
      where: { name: 'Huancayo' },
      select: { id: true },
    });
    if (!locality) {
      locality = await prisma.locality.create({
        data: {
          name: 'Huancayo',
          department: 'Junín',
          province: 'Huancayo',
          district: 'Huancayo',
          isActive: true,
        },
        select: { id: true },
      });
    }

    // 2. Categorías.
    const elec = await prisma.category.upsert({
      where: { slug: 'electricistas' },
      update: {},
      create: { name: 'Electricistas', slug: 'electricistas', isActive: true },
      select: { id: true, name: true },
    });
    const plom = await prisma.category.upsert({
      where: { slug: 'plomeria' },
      update: {},
      create: { name: 'Plomería', slug: 'plomeria', isActive: true },
      select: { id: true, name: true },
    });

    // 3. Provider para el user id=2 (visible + APROBADO → lo ve search_providers).
    const provider = await prisma.provider.upsert({
      where: { userId_type: { userId: TEST_USER_ID, type: 'OFICIO' } },
      update: {
        isVisible: true,
        verificationStatus: 'APROBADO',
        isVerified: true,
        averageRating: 4.5,
        totalReviews: 12,
        latitude: HCO_LAT,
        longitude: HCO_LNG,
        localityId: locality.id,
        isTrusted: true,
        trustStatus: 'APPROVED',
      },
      create: {
        userId: TEST_USER_ID,
        type: 'OFICIO',
        businessName: 'Electricistas Huancayo (Test)',
        description: 'Servicio de electricista de prueba en Huancayo.',
        phone: '964123456',
        whatsapp: '964123456',
        localityId: locality.id,
        latitude: HCO_LAT,
        longitude: HCO_LNG,
        isVisible: true,
        verificationStatus: 'APROBADO',
        isVerified: true,
        averageRating: 4.5,
        totalReviews: 12,
        isTrusted: true,
        trustStatus: 'APPROVED',
        planPriority: 2,
      },
      select: { id: true, businessName: true },
    });

    // 4. Especialidad principal: Electricistas.
    await prisma.providerCategory.upsert({
      where: {
        providerId_categoryId: {
          providerId: provider.id,
          categoryId: elec.id,
        },
      },
      update: { isPrimary: true },
      create: { providerId: provider.id, categoryId: elec.id, isPrimary: true },
    });

    // 5. Suscripción ESTANDAR activa (1 año).
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    await prisma.subscription.upsert({
      where: { providerId: provider.id },
      update: { plan: 'ESTANDAR', status: 'ACTIVA', endDate },
      create: {
        providerId: provider.id,
        plan: 'ESTANDAR',
        status: 'ACTIVA',
        endDate,
        priceUSD: 0,
      },
    });

    // 6. Password real para login en Flutter.
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    await prisma.user.update({
      where: { id: TEST_USER_ID },
      data: { passwordHash },
    });

    console.log('LOCALITY_ID=' + locality.id);
    console.log('CATEGORIES=' + JSON.stringify([elec, plom]));
    console.log('PROVIDER=' + JSON.stringify(provider));
    console.log('PASSWORD_SET=' + TEST_PASSWORD + ' (user id ' + TEST_USER_ID + ')');
    console.log('OK');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main().catch((e) => {
  console.error('SEED_ERROR', e?.message ?? e);
  process.exit(1);
});
