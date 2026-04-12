/**
 * fix-image-urls.ts
 * Reemplaza las URLs de imágenes almacenadas como "http://localhost:3000/..."
 * por la URL pública correcta del servidor.
 *
 * Ejecutar UNA sola vez desde la carpeta backend/:
 *   npm run fix:image-urls
 *
 * Requiere que API_BASE_URL esté configurada en .env (ej: http://192.168.1.65:3000)
 */

import { PrismaClient } from '../src/generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const OLD_BASE = 'http://localhost:3000';
const NEW_BASE = (process.env.API_BASE_URL ?? '').replace(/\/$/, '');

if (!NEW_BASE || NEW_BASE === OLD_BASE) {
  console.error('❌  Configura API_BASE_URL en .env con la IP real del servidor antes de ejecutar este script.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function run() {
  await prisma.$connect();
  console.log(`🔄  Reemplazando "${OLD_BASE}" → "${NEW_BASE}" en la BD...\n`);

  // Tablas mapeadas con @@map() en schema.prisma → snake_case
  // Columnas también mapeadas → verificar nombres exactos en el schema
  const users = await prisma.$executeRawUnsafe(
    `UPDATE users SET "avatarUrl" = REPLACE("avatarUrl", '${OLD_BASE}', '${NEW_BASE}') WHERE "avatarUrl" LIKE '${OLD_BASE}%'`,
  );
  console.log(`✅  users.avatarUrl              → ${users} filas actualizadas`);

  const providerImages = await prisma.$executeRawUnsafe(
    `UPDATE provider_images SET url = REPLACE(url, '${OLD_BASE}', '${NEW_BASE}') WHERE url LIKE '${OLD_BASE}%'`,
  );
  console.log(`✅  provider_images.url          → ${providerImages} filas actualizadas`);

  const reviews = await prisma.$executeRawUnsafe(
    `UPDATE reviews SET "photoUrl" = REPLACE("photoUrl", '${OLD_BASE}', '${NEW_BASE}') WHERE "photoUrl" LIKE '${OLD_BASE}%'`,
  );
  console.log(`✅  reviews.photoUrl             → ${reviews} filas actualizadas`);

  const verificationDocs = await prisma.$executeRawUnsafe(
    `UPDATE verification_docs SET "fileUrl" = REPLACE("fileUrl", '${OLD_BASE}', '${NEW_BASE}') WHERE "fileUrl" LIKE '${OLD_BASE}%'`,
  );
  console.log(`✅  verification_docs.fileUrl    → ${verificationDocs} filas actualizadas`);

  console.log('\n🎉  Listo. Reinicia el servidor backend para aplicar los cambios.');
  await prisma.$disconnect();
  await pool.end();
}

run().catch(async (err) => {
  console.error('❌  Error:', err);
  await prisma.$disconnect().catch(() => {});
  await pool.end().catch(() => {});
  process.exit(1);
});
