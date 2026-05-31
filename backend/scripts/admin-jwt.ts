import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client/client.js';

// Mintea un JWT de ADMIN (mismo payload/secreto que auth.service) para
// pre-verificar el chat del panel admin sin conocer su password.
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const user = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true, email: true, role: true },
      orderBy: { id: 'asc' },
    });
    if (!user) {
      console.log('NO_ADMIN');
      return;
    }
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' } as jwt.SignOptions,
    );
    console.log('ADMIN_ID=' + user.id);
    console.log('ADMIN_EMAIL=' + user.email);
    console.log('TOKEN=' + token);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main().catch((e) => {
  console.error('ERR', e?.message ?? e);
  process.exit(1);
});
