import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client/client.js';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const rows = await prisma.aiMessage.findMany({
      where: { flagged: true },
      orderBy: { id: 'desc' },
      take: 3,
      select: { role: true, flagged: true, moderationPass: true, content: true },
    });
    console.log('FLAGGED_COUNT=' + rows.length);
    for (const r of rows) {
      console.log(
        `[${r.role}] flagged=${r.flagged} modPass=${r.moderationPass} | ${r.content.slice(0, 55)}`,
      );
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main().catch((e) => { console.error('ERR', e?.message ?? e); process.exit(1); });
