import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client/client.js';

// Backup de usuarios vía SQL raw (selecciona solo columnas que existen,
// esquiva el drift). Guarda a scripts/users-backup.json para restaurar
// tras el force-reset.
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const users = await prisma.$queryRaw<unknown[]>`
      SELECT "email","passwordHash","firstName","lastName","role","isActive","coins"
      FROM "users" ORDER BY "id"
    `;
    writeFileSync(
      'scripts/users-backup.json',
      JSON.stringify(users, null, 2),
      'utf8',
    );
    console.log('BACKED_UP=' + users.length);
    console.log(JSON.stringify(users));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main().catch((e) => {
  console.error('ERR', e?.message ?? e);
  process.exit(1);
});
