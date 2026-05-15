-- prisma/add-provider-slug.sql

-- 1. Añadir columnas como nullable (coincide con String? en schema)
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "slugEditedAt" TIMESTAMP(3);

-- 2. Poblar slugs para registros existentes (nombre normalizado + id como sufijo único)
-- Solo los que aún no tienen slug
UPDATE "providers"
SET "slug" = LOWER(REGEXP_REPLACE(
  REGEXP_REPLACE(
    COALESCE("businessName", 'usuario'),
    '[àáâãäåā]', 'a', 'gi'
  ),
  '[^a-z0-9]', '-', 'gi'
)) || '-' || "id"
WHERE "slug" IS NULL AND "businessName" IS NOT NULL;

-- 3. UNIQUE index (PostgreSQL permite múltiples NULLs en unique indexes)
CREATE UNIQUE INDEX IF NOT EXISTS "Provider_slug_key" ON "providers"("slug");

-- 4. Índice para slugEditedAt
CREATE INDEX IF NOT EXISTS "Provider_slugEditedAt_idx" ON "providers"("slugEditedAt");