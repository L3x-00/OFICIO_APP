import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client/client.js';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const kb = await prisma.aiKnowledgeEntry.count();
    console.log('KNOWLEDGE_ENTRIES=' + kb);

    const conv = await prisma.aiConversation.findFirst({
      where: { userId: 20 },
      orderBy: { id: 'desc' },
      select: { id: true, promptVersion: true },
    });
    if (!conv) {
      console.log('NO_CONVERSATION_FOR_USER_20');
      return;
    }
    console.log('CONVERSATION_ID=' + conv.id + ' promptVersion=' + conv.promptVersion);

    const msgs = await prisma.aiMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: { id: 'asc' },
      select: {
        role: true,
        flagged: true,
        moderationPass: true,
        tokensUsed: true,
        responseTimeMs: true,
        content: true,
      },
    });
    console.log('--- MENSAJES (' + msgs.length + ') ---');
    for (const m of msgs) {
      const snippet = m.content.replace(/\s+/g, ' ').slice(0, 58);
      console.log(
        `[${m.role.padEnd(5)}] flagged=${m.flagged} modPass=${m.moderationPass} ` +
          `tok=${m.tokensUsed ?? '-'} ms=${m.responseTimeMs ?? '-'} | ${snippet}`,
      );
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('CHECK_ERROR', e?.message ?? e);
  process.exit(1);
});
