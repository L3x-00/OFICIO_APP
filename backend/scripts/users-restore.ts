import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client/client.js';

interface BackedUser {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  coins: number;
}

// Restaura los usuarios respaldados tras el force-reset. El cliente ya
// está regenerado y el schema completo, así que usamos el cliente Prisma
// (sin drift). skipDuplicates por si alguno ya fue recreado.
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const users = JSON.parse(
      readFileSync('scripts/users-backup.json', 'utf8'),
    ) as BackedUser[];

    const res = await prisma.user.createMany({
      data: users.map((u) => ({
        email: u.email,
        passwordHash: u.passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role as 'USUARIO' | 'PROVEEDOR' | 'ADMIN',
        isActive: u.isActive,
        coins: u.coins,
      })),
      skipDuplicates: true,
    });
    console.log('RESTORED=' + res.count + ' de ' + users.length);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main().catch((e) => {
  console.error('ERR', e?.message ?? e);
  process.exit(1);
});
