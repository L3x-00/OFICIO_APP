/**
 * convert-leads.ts — Paso 6: convierte leads NEGOCIO CONSENTED (tablas de
 * staging `provider_leads`) en User + Provider reales de Servi.
 *
 * Herramienta LOCAL e independiente: NO forma parte del backend desplegado.
 * Usa DATABASE_URL como cualquier script del repo. Por defecto hace DRY-RUN
 * (solo imprime qué convertiría); escribe únicamente con --commit.
 *
 *   npm run convert-leads                 # dry-run (no escribe nada)
 *   npm run convert-leads -- --commit     # crea los negocios en PENDIENTE
 *   npm run convert-leads -- --commit --approve   # además los aprueba/visibiliza
 *   npm run convert-leads -- --commit --limit 10  # tope de leads por corrida
 *
 * Requisitos: haber aplicado `provider_leads_staging.sql` y cargado el
 * `import.sql` del panel (que genera email/password de los CONSENTED).
 */
import { PrismaClient } from '../src/generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { convertLead, type StagingLead } from '../src/lead-conversion/lead-conversion.core.js';
import { MinioService } from '../src/common/minio.service.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const APPROVE = args.includes('--approve');
const SKIP_PHOTOS = args.includes('--skip-photos');
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Math.max(1, parseInt(args[limitArg + 1] ?? '50', 10) || 50) : 50;
// Fotos: solo si hay R2 configurado y no se pidió saltarlas. El CLI descarga
// las URLs guardadas del lead y las sube a R2 (MinioService re-encoda con sharp).
const PHOTOS = !SKIP_PHOTOS && !!process.env.MINIO_ACCESS_KEY;
const MAX_PHOTOS = 5;

if (!process.env.DATABASE_URL) {
  console.error('❌  Falta DATABASE_URL en backend/.env');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const SELECT_LEADS = `
  SELECT "leadKey", "businessName", "publicPhone", "whatsapp", "ruc", "address",
         "department", "province", "district", "mappedCategoryId", "categoryIds",
         "scheduleJson", "introduction", "storeDelivery", "website", "instagram",
          "facebook", "tiktok", "linkedin", "twitterX", "telegram", "consentStatus",
          "latitude", "longitude", "convertedProviderId", "suggestedEmail", "suggestedPassword",
         (SELECT count(*)::int FROM "provider_lead_photos" ph WHERE ph."leadId" = "provider_leads"."id") AS "photoCount"
  FROM "provider_leads"
  WHERE "consentStatus" = 'CONSENTED'
    AND "convertedProviderId" IS NULL
    AND "suggestedEmail" IS NOT NULL
  ORDER BY "createdAt" ASC
  LIMIT $1`;

const SELECT_PHOTOS = `
  SELECT ph."url"
  FROM "provider_lead_photos" ph
  JOIN "provider_leads" l ON l."id" = ph."leadId"
  WHERE l."leadKey" = $1
  ORDER BY ph."position" ASC`;

type LeadRow = StagingLead & { photoCount?: number };

/** Descarga las fotos del lead y las sube a R2. Best-effort por foto. */
async function uploadLeadPhotos(minio: MinioService, leadKey: string): Promise<string[]> {
  const rows = (await prisma.$queryRawUnsafe(SELECT_PHOTOS, leadKey)) as { url: string }[];
  const out: string[] = [];
  for (const { url } of rows.slice(0, MAX_PHOTOS)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (ServiLeads)' },
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      out.push(await minio.uploadFile(buffer, 'lead-photo.jpg', 'providers/gallery'));
    } catch (error: any) {
      console.log(`      ⚠ foto omitida (${error?.message ?? error})`);
    }
  }
  return out;
}

async function run() {
  await prisma.$connect();

  let leads: LeadRow[];
  try {
    leads = (await prisma.$queryRawUnsafe(SELECT_LEADS, LIMIT)) as LeadRow[];
  } catch (error: any) {
    console.error(
      '❌  No se pudo leer "provider_leads". ¿Aplicaste provider_leads_staging.sql y cargaste import.sql?\n   ' +
        (error?.message ?? error),
    );
    await shutdown(1);
    return;
  }

  // R2 solo en modo commit (subir fotos escribe en el almacenamiento).
  let minio: MinioService | null = null;
  if (COMMIT && PHOTOS) {
    minio = new MinioService();
    minio.onModuleInit();
  }

  const mode = COMMIT ? (APPROVE ? 'COMMIT + APPROVE' : 'COMMIT') : 'DRY-RUN';
  const photosNote = COMMIT
    ? PHOTOS
      ? 'fotos: R2 ON'
      : SKIP_PHOTOS
        ? 'fotos: OFF (--skip-photos)'
        : 'fotos: OFF (sin MINIO_ACCESS_KEY)'
    : 'fotos: se suben al convertir';
  console.log(
    `\n🧩  Conversión de leads NEGOCIO — modo ${mode} · ${photosNote} — ${leads.length} candidato(s) (límite ${LIMIT})\n`,
  );

  if (leads.length === 0) {
    console.log('   No hay leads CONSENTED pendientes de convertir.\n');
    await shutdown(0);
    return;
  }

  let converted = 0;
  let reused = 0;
  const failures: { businessName: string; error: string }[] = [];

  for (const [index, lead] of leads.entries()) {
    const n = `${index + 1}`.padStart(2, ' ');
    const cats = Array.isArray(lead.categoryIds) ? lead.categoryIds.length : 0;

    if (!COMMIT) {
      console.log(
        `${n}. ${lead.businessName}\n      email: ${lead.suggestedEmail}\n      categorías: ${cats} · delivery: ${lead.storeDelivery ? 'sí' : 'no'} · fotos: ${lead.photoCount ?? 0} · ${lead.district ?? '—'}`,
      );
      continue;
    }

    try {
      const imageUrls = minio ? await uploadLeadPhotos(minio, lead.leadKey) : [];
      const result = await convertLead(prisma as any, lead, { approve: APPROVE, imageUrls });
      if (result.reused) {
        reused += 1;
        console.log(`${n}. ↺ ${lead.businessName} — ya existía (provider #${result.providerId})`);
      } else {
        converted += 1;
        console.log(
          `${n}. ✅ ${lead.businessName} — provider #${result.providerId}${result.approved ? ' (APROBADO/visible)' : ' (PENDIENTE)'} · ${result.images} foto(s)`,
        );
      }
      // Marcar el lead como convertido (idempotente por convertedProviderId).
      await prisma.$executeRawUnsafe(
        `UPDATE "provider_leads" SET "status" = 'CONVERTED', "convertedProviderId" = $1, "updatedAt" = now() WHERE "leadKey" = $2`,
        result.providerId,
        lead.leadKey,
      );
    } catch (error: any) {
      failures.push({ businessName: lead.businessName, error: error?.message ?? String(error) });
      console.log(`${n}. ❌ ${lead.businessName} — ${error?.message ?? error}`);
    }
  }

  console.log('\n──────────────────────────────────────────────');
  if (!COMMIT) {
    console.log(`Dry-run: ${leads.length} lead(s) se convertirían. Corré con --commit para escribir.\n`);
  } else {
    console.log(`Convertidos: ${converted} · Ya existían: ${reused} · Fallidos: ${failures.length}`);
    if (failures.length) {
      console.log('\nFallidos:');
      for (const f of failures) console.log(`  · ${f.businessName}: ${f.error}`);
    }
    console.log('');
  }

  await shutdown(failures.length ? 1 : 0);
}

async function shutdown(code: number) {
  await prisma.$disconnect().catch(() => {});
  await pool.end().catch(() => {});
  process.exit(code);
}

run().catch(async (err) => {
  console.error('❌  Error inesperado:', err);
  await shutdown(1);
});
