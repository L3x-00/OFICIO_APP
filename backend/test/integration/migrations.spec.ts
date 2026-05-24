/**
 * INTEGRATION — Validación de migraciones / schema en BD real.
 *
 * Verifica que la BD `oficio_test_db` tenga:
 *   • Extensiones requeridas (postgis, pg_trgm) — sin ellas, las
 *     migraciones del schema fallan con "type geography does not exist"
 *     o "gin_trgm_ops does not exist".
 *   • Las tablas críticas del negocio.
 *   • Columnas + tipos clave en tablas que el código toca al boot.
 *   • Constraints UNIQUE críticos (chatRoom client+provider, provider
 *     user+type, users.email, etc).
 *   • FKs hacia tablas padre.
 *
 * Si esta suite explota, una migración rompió el contrato del schema y
 * el resto de los tests / la app en producción también va a romperse.
 */

import { getTestPrisma, disconnectTestPrisma } from '../utils/db.util';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('DB migrations / schema integrity (integration)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await getTestPrisma();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  // ────────────────────────────────────────────────────────────────
  it('extensiones postgis + pg_trgm están activas', async () => {
    const exts = await prisma.$queryRaw<{ extname: string }[]>`
      SELECT extname FROM pg_extension
       WHERE extname IN ('postgis', 'pg_trgm')
    `;
    const names = exts.map((e) => e.extname).sort();
    expect(names).toEqual(['pg_trgm', 'postgis']);
  });

  // ────────────────────────────────────────────────────────────────
  it('todas las tablas críticas existen en el schema public', async () => {
    const expectedTables = [
      'users',
      'providers',
      'provider_categories',
      'provider_images',
      'categories',
      'localities',
      'service_requests',
      'offers',
      'chat_rooms',
      'chat_messages',
      'referrals',
      'referral_codes',
      'referral_rewards',
      'coin_redemptions',
      'admin_notifications',
      'subscriptions',
      'payments',
      'yape_payments',
      'refresh_tokens',
      'otp_codes',
      'user_penalties',
    ];

    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const actual = new Set(rows.map((r) => r.tablename));
    const missing = expectedTables.filter((t) => !actual.has(t));
    expect(missing).toEqual([]);
  });

  // ────────────────────────────────────────────────────────────────
  it('users tiene columnas críticas con tipos correctos', async () => {
    const cols = await prisma.$queryRaw<
      { column_name: string; data_type: string; is_nullable: string }[]
    >`
      SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'
    `;
    const byName = new Map(cols.map((c) => [c.column_name, c]));

    expect(byName.get('id')?.data_type).toBe('integer');
    expect(byName.get('email')?.data_type).toBe('text');
    expect(byName.get('email')?.is_nullable).toBe('NO');
    expect(byName.get('coins')?.data_type).toBe('integer');
    expect(byName.get('hasUsedTrial')?.data_type).toBe('boolean');
    // deletedAt nullable — soft-delete (anti freemium abuse).
    expect(byName.get('deletedAt')?.is_nullable).toBe('YES');
    expect(byName.get('firebaseUid')?.is_nullable).toBe('YES');
  });

  // ────────────────────────────────────────────────────────────────
  it('admin_notifications tiene providerId nullable + type STRING (no enum)', async () => {
    const cols = await prisma.$queryRaw<
      { column_name: string; data_type: string; is_nullable: string }[]
    >`
      SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'admin_notifications'
    `;
    const byName = new Map(cols.map((c) => [c.column_name, c]));

    // El cambio de Fase 1: providerId pasó a nullable + type es String
    // (antes enum NotificationType). Sin esto, las notificaciones de
    // chat / referrals / plan rompían el insert.
    expect(byName.get('providerId')?.is_nullable).toBe('YES');
    expect(byName.get('type')?.data_type).toBe('text');
    expect(byName.get('targetUserId')?.is_nullable).toBe('YES');
  });

  // ────────────────────────────────────────────────────────────────
  it('providers tiene location_geog (Unsupported geography) nullable', async () => {
    const cols = await prisma.$queryRaw<
      { column_name: string; udt_name: string; is_nullable: string }[]
    >`
      SELECT column_name, udt_name, is_nullable
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'providers'
         AND column_name IN ('location_geog', 'search_tsv')
    `;
    const map = new Map(cols.map((c) => [c.column_name, c]));

    // El user removió el @default(dbgenerated(...)) con column refs y
    // creó triggers en su lugar. Las columnas siguen existiendo,
    // nullable, y los triggers las completan en INSERT/UPDATE.
    expect(map.get('location_geog')?.udt_name).toBe('geography');
    expect(map.get('location_geog')?.is_nullable).toBe('YES');
    expect(map.get('search_tsv')?.udt_name).toBe('tsvector');
  });

  // ────────────────────────────────────────────────────────────────
  it('chat_rooms tiene UNIQUE (clientId, providerId) — idempotencia de salas', async () => {
    const rows = await prisma.$queryRaw<
      { index_name: string; columns: string }[]
    >`
      SELECT idx.relname AS index_name,
             string_agg(att.attname, ',' ORDER BY x.ord) AS columns
        FROM pg_index i
        JOIN pg_class tbl ON tbl.oid = i.indrelid
        JOIN pg_class idx ON idx.oid = i.indexrelid
        JOIN unnest(i.indkey) WITH ORDINALITY x(attnum, ord) ON true
        JOIN pg_attribute att ON att.attrelid = tbl.oid AND att.attnum = x.attnum
       WHERE tbl.relname = 'chat_rooms' AND i.indisunique
       GROUP BY idx.relname
    `;
    // Esperamos al menos un índice unique que cubra clientId + providerId.
    const found = rows.some((r) => {
      const cols = r.columns.split(',');
      return cols.includes('clientId') && cols.includes('providerId');
    });
    expect(found).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────
  it('providers tiene UNIQUE (userId, type) — un OFICIO + un NEGOCIO por user', async () => {
    const rows = await prisma.$queryRaw<
      { index_name: string; columns: string }[]
    >`
      SELECT idx.relname AS index_name,
             string_agg(att.attname, ',' ORDER BY x.ord) AS columns
        FROM pg_index i
        JOIN pg_class tbl ON tbl.oid = i.indrelid
        JOIN pg_class idx ON idx.oid = i.indexrelid
        JOIN unnest(i.indkey) WITH ORDINALITY x(attnum, ord) ON true
        JOIN pg_attribute att ON att.attrelid = tbl.oid AND att.attnum = x.attnum
       WHERE tbl.relname = 'providers' AND i.indisunique
       GROUP BY idx.relname
    `;
    const found = rows.some((r) => {
      const cols = r.columns.split(',');
      return cols.includes('userId') && cols.includes('type');
    });
    expect(found).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────
  it('users tiene UNIQUE en email + phone + firebaseUid', async () => {
    const rows = await prisma.$queryRaw<{ columns: string }[]>`
      SELECT string_agg(att.attname, ',' ORDER BY x.ord) AS columns
        FROM pg_index i
        JOIN pg_class tbl ON tbl.oid = i.indrelid
        JOIN unnest(i.indkey) WITH ORDINALITY x(attnum, ord) ON true
        JOIN pg_attribute att ON att.attrelid = tbl.oid AND att.attnum = x.attnum
       WHERE tbl.relname = 'users' AND i.indisunique
       GROUP BY i.indexrelid
    `;
    const flat = rows.map((r) => r.columns);
    expect(flat).toContain('email');
    expect(flat).toContain('phone');
    expect(flat).toContain('firebaseUid');
  });

  // ────────────────────────────────────────────────────────────────
  it('refresh_tokens.token tiene UNIQUE (anti rotación duplicada)', async () => {
    const rows = await prisma.$queryRaw<{ columns: string }[]>`
      SELECT string_agg(att.attname, ',' ORDER BY x.ord) AS columns
        FROM pg_index i
        JOIN pg_class tbl ON tbl.oid = i.indrelid
        JOIN unnest(i.indkey) WITH ORDINALITY x(attnum, ord) ON true
        JOIN pg_attribute att ON att.attrelid = tbl.oid AND att.attnum = x.attnum
       WHERE tbl.relname = 'refresh_tokens' AND i.indisunique
       GROUP BY i.indexrelid
    `;
    expect(rows.map((r) => r.columns)).toContain('token');
  });

  // ────────────────────────────────────────────────────────────────
  it('FKs críticas existen — providers→users, chat_rooms→users + providers', async () => {
    const fks = await prisma.$queryRaw<
      {
        table_name: string;
        column_name: string;
        foreign_table_name: string;
        foreign_column_name: string;
      }[]
    >`
      SELECT tc.table_name,
             kcu.column_name,
             ccu.table_name  AS foreign_table_name,
             ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage  kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = 'public'
    `;

    const has = (table: string, col: string, fkTable: string, fkCol: string) =>
      fks.some(
        (f) =>
          f.table_name === table &&
          f.column_name === col &&
          f.foreign_table_name === fkTable &&
          f.foreign_column_name === fkCol,
      );

    expect(has('providers', 'userId', 'users', 'id')).toBe(true);
    expect(has('chat_rooms', 'clientId', 'users', 'id')).toBe(true);
    expect(has('chat_rooms', 'providerId', 'providers', 'id')).toBe(true);
    expect(has('chat_messages', 'chatRoomId', 'chat_rooms', 'id')).toBe(true);
    expect(has('offers', 'serviceRequestId', 'service_requests', 'id')).toBe(
      true,
    );
    expect(has('offers', 'providerId', 'providers', 'id')).toBe(true);
    expect(has('referrals', 'inviterId', 'users', 'id')).toBe(true);
    expect(has('referrals', 'invitedUserId', 'users', 'id')).toBe(true);
    expect(has('referral_codes', 'userId', 'users', 'id')).toBe(true);
    expect(has('subscriptions', 'providerId', 'providers', 'id')).toBe(true);
    expect(has('refresh_tokens', 'userId', 'users', 'id')).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────
  it('offers tiene UNIQUE (serviceRequestId, providerId) — anti doble oferta', async () => {
    const rows = await prisma.$queryRaw<{ columns: string }[]>`
      SELECT string_agg(att.attname, ',' ORDER BY x.ord) AS columns
        FROM pg_index i
        JOIN pg_class tbl ON tbl.oid = i.indrelid
        JOIN unnest(i.indkey) WITH ORDINALITY x(attnum, ord) ON true
        JOIN pg_attribute att ON att.attrelid = tbl.oid AND att.attnum = x.attnum
       WHERE tbl.relname = 'offers' AND i.indisunique
       GROUP BY i.indexrelid
    `;
    const found = rows.some((r) => {
      const c = r.columns.split(',');
      return c.includes('serviceRequestId') && c.includes('providerId');
    });
    expect(found).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────
  it('referrals.invitedUserId tiene UNIQUE — anti doble aplicación de código', async () => {
    const rows = await prisma.$queryRaw<{ columns: string }[]>`
      SELECT string_agg(att.attname, ',' ORDER BY x.ord) AS columns
        FROM pg_index i
        JOIN pg_class tbl ON tbl.oid = i.indrelid
        JOIN unnest(i.indkey) WITH ORDINALITY x(attnum, ord) ON true
        JOIN pg_attribute att ON att.attrelid = tbl.oid AND att.attnum = x.attnum
       WHERE tbl.relname = 'referrals' AND i.indisunique
       GROUP BY i.indexrelid
    `;
    expect(rows.map((r) => r.columns)).toContain('invitedUserId');
  });
});
