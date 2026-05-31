import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client/client.js';

// Tablas que el schema espera (@@map). Comparamos contra las reales.
const EXPECTED = [
  'users', 'otp_codes', 'refresh_tokens', 'localities', 'categories',
  'provider_categories', 'providers', 'provider_images', 'subscriptions',
  'subscription_audit_log', 'payments', 'plan_requests', 'reviews',
  'review_replies', 'favorites', 'verification_docs', 'provider_analytics',
  'admin_notifications', 'recommendations', 'provider_reports',
  'platform_issues', 'trust_validation_requests', 'service_requests',
  'offers', 'yape_payments', 'user_penalties', 'referral_codes', 'referrals',
  'referral_rewards', 'coin_redemptions', 'chat_rooms', 'chat_messages',
  'offer_posts', 'offer_post_categories', 'offer_reports',
  'ai_knowledge_entries', 'ai_conversations', 'ai_messages',
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    const actual = new Set(rows.map((r) => r.tablename));
    const missing = EXPECTED.filter((t) => !actual.has(t));
    console.log('TABLAS_EN_DB=' + actual.size);
    console.log('FALTANTES(' + missing.length + ')=' + JSON.stringify(missing));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main().catch((e) => { console.error('ERR', e?.message ?? e); process.exit(1); });
