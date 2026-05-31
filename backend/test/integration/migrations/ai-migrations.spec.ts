/**
 * INTEGRATION — Guard de migraciones IA (anti-drift).
 *
 * Fuente de verdad = migraciones Prisma:
 *   prisma/migrations/20260529120000_add_ai_knowledge_entry
 *   prisma/migrations/20260529130000_add_ai_conversation
 *
 * Valida que la estructura REAL en BD (tablas, columnas, índices, FKs,
 * constraints) coincide EXACTAMENTE con lo que emiten esas migraciones. Si
 * alguien re-crea las tablas a mano y diverge (p.ej. un DEFAULT extra), este
 * test falla → drift detectado. Read-only; no muta datos.
 */
import {
  getTestPrisma,
  disconnectTestPrisma,
} from '../../utils/db.util';
import type { PrismaService } from '../../../prisma/prisma.service.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

type ColSpec = {
  type: string;
  nullable: boolean;
  default: string | RegExp | null; // null = SIN default
};

const TABLES: Record<string, { columns: Record<string, ColSpec>; indexes: string[] }> = {
  ai_knowledge_entries: {
    columns: {
      id: { type: 'integer', nullable: false, default: /nextval/ },
      topic: { type: 'text', nullable: false, default: null },
      content: { type: 'jsonb', nullable: false, default: null },
      version: { type: 'integer', nullable: false, default: '1' },
      isActive: { type: 'boolean', nullable: false, default: 'true' },
      createdBy: { type: 'integer', nullable: true, default: null },
      // CANÓNICO: la migración NO define default (Prisma setea @updatedAt en app).
      updatedAt: { type: 'timestamp without time zone', nullable: false, default: null },
    },
    indexes: [
      'ai_knowledge_entries_pkey',
      'ai_knowledge_entries_topic_key',
      'ai_knowledge_entries_isActive_idx',
    ],
  },
  ai_conversations: {
    columns: {
      id: { type: 'integer', nullable: false, default: /nextval/ },
      userId: { type: 'integer', nullable: false, default: null },
      promptVersion: { type: 'text', nullable: false, default: /'v1'/ },
      createdAt: {
        type: 'timestamp without time zone',
        nullable: false,
        default: /CURRENT_TIMESTAMP/,
      },
    },
    indexes: [
      'ai_conversations_pkey',
      'ai_conversations_userId_idx',
      'ai_conversations_createdAt_idx',
    ],
  },
  ai_messages: {
    columns: {
      id: { type: 'integer', nullable: false, default: /nextval/ },
      conversationId: { type: 'integer', nullable: false, default: null },
      role: { type: 'text', nullable: false, default: null },
      content: { type: 'text', nullable: false, default: null },
      ipAddress: { type: 'text', nullable: true, default: null },
      userAgent: { type: 'text', nullable: true, default: null },
      responseTimeMs: { type: 'integer', nullable: true, default: null },
      tokensUsed: { type: 'integer', nullable: true, default: null },
      flagged: { type: 'boolean', nullable: false, default: 'false' },
      moderationPass: { type: 'boolean', nullable: false, default: 'true' },
      createdAt: {
        type: 'timestamp without time zone',
        nullable: false,
        default: /CURRENT_TIMESTAMP/,
      },
    },
    indexes: [
      'ai_messages_pkey',
      'ai_messages_conversationId_createdAt_idx',
      'ai_messages_createdAt_idx',
    ],
  },
};

function matchDefault(actual: string | null, expected: string | RegExp | null) {
  if (expected === null) return expect(actual).toBeNull();
  if (expected instanceof RegExp) return expect(actual ?? '').toMatch(expected);
  return expect(actual ?? '').toContain(expected);
}

describe('AI migrations — estructura canónica (anti-drift)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await getTestPrisma();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  const columnsOf = (t: string): Promise<any[]> =>
    prisma.$queryRawUnsafe(
      `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns WHERE table_name = $1`,
      t,
    );
  const indexesOf = (t: string): Promise<any[]> =>
    prisma.$queryRawUnsafe(
      `SELECT indexname FROM pg_indexes WHERE tablename = $1`,
      t,
    );

  for (const [table, spec] of Object.entries(TABLES)) {
    describe(table, () => {
      it('existe', async () => {
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = $1`,
          table,
        );
        expect(rows).toHaveLength(1);
      });

      it('columnas: tipo, nullabilidad y default coinciden con la migración', async () => {
        const rows = await columnsOf(table);
        const got = new Map(rows.map((r) => [r.column_name, r]));
        // No sobran ni faltan columnas.
        expect(got.size).toBe(Object.keys(spec.columns).length);
        for (const [name, c] of Object.entries(spec.columns)) {
          const r = got.get(name);
          expect(r).toBeDefined();
          expect(r.data_type).toBe(c.type);
          expect(r.is_nullable).toBe(c.nullable ? 'YES' : 'NO');
          matchDefault(r.column_default, c.default);
        }
      });

      it('índices: existen todos los declarados', async () => {
        const names = (await indexesOf(table)).map((r) => r.indexname);
        for (const idx of spec.indexes) {
          expect(names).toContain(idx);
        }
      });
    });
  }

  it('constraint: topic es UNIQUE en ai_knowledge_entries (unique index)', async () => {
    // Prisma @unique emite un UNIQUE INDEX (no un table constraint) → se
    // valida vía pg_index.indisunique.
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT i.relname AS idx, ix.indisunique
         FROM pg_index ix
         JOIN pg_class i ON i.oid = ix.indexrelid
         JOIN pg_class t ON t.oid = ix.indrelid
        WHERE t.relname = 'ai_knowledge_entries'
          AND i.relname = 'ai_knowledge_entries_topic_key'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].indisunique).toBe(true);
  });

  it('FK: ai_messages.conversationId → ai_conversations(id) ON DELETE/UPDATE CASCADE', async () => {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT conname, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
        WHERE conrelid = 'ai_messages'::regclass AND contype = 'f'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].conname).toBe('ai_messages_conversationId_fkey');
    expect(rows[0].def).toContain('REFERENCES ai_conversations(id)');
    expect(rows[0].def).toContain('ON DELETE CASCADE');
    expect(rows[0].def).toContain('ON UPDATE CASCADE');
  });

  it('primary keys: una PK por tabla', async () => {
    for (const table of Object.keys(TABLES)) {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT conname FROM pg_constraint
           WHERE conrelid = $1::regclass AND contype = 'p'`,
        table,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].conname).toBe(`${table}_pkey`);
    }
  });
});
