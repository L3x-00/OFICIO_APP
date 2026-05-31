import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client/client.js';

/**
 * Script de smoke-test: encuentra un usuario PROVEEDOR activo y firma un
 * JWT válido (mismo payload que auth.service: { sub, email, role }, mismo
 * secreto JWT_SECRET, mismo expiresIn). El JwtStrategy valida con
 * JWT_SECRET y toma el rol REAL de la DB, así que el token solo necesita
 * un sub/email de un usuario activo existente.
 */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Buscamos un PROVEEDOR activo existente.
    let user = await prisma.user.findFirst({
      where: { role: 'PROVEEDOR', isActive: true },
      select: { id: true, email: true, role: true, coins: true },
      orderBy: { id: 'asc' },
    });

    // Si no hay ninguno (DB local mínima), creamos un PROVEEDOR de prueba
    // vía SQL raw (evita el drift de columnas del cliente Prisma). El
    // passwordHash es dummy: el login no se usa, el JWT se firma directo.
    if (!user) {
      const rows = await prisma.$queryRaw<
        { id: number; email: string; role: string; coins: number }[]
      >`
        INSERT INTO "users"
          ("email","passwordHash","firstName","lastName","role","isActive","coins","createdAt","updatedAt")
        VALUES
          ('smoketest.prov@servi.test','$2a$10$smoke.test.dummy.hash.not.real.0123456789012345678901','Smoke','Test','PROVEEDOR',true,250,now(),now())
        ON CONFLICT ("email") DO UPDATE
          SET "role" = 'PROVEEDOR', "coins" = 250, "isActive" = true
        RETURNING "id","email","role","coins";
      `;
      user = rows[0];
      console.log('CREATED_TEST_PROVEEDOR=true');
    }

    const secret = process.env.JWT_SECRET as string;
    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn } as jwt.SignOptions,
    );

    console.log('USER_ID=' + user.id);
    console.log('EMAIL=' + user.email);
    console.log('ROLE=' + user.role);
    console.log('COINS=' + user.coins);
    console.log('TOKEN=' + token);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('SCRIPT_ERROR', e?.message ?? e);
  process.exit(1);
});
