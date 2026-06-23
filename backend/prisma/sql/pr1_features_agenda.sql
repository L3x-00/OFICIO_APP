-- ============================================================================
-- PR1 — Sistema de funcionalidades por categoría + Módulo Agenda de Citas
-- ----------------------------------------------------------------------------
-- ADITIVO e IDEMPOTENTE: no borra datos. Seguro para correr en Supabase prod.
-- Aplicar UNA vez (los IF NOT EXISTS lo hacen re-ejecutable sin error).
--
-- IMPORTANTE (honestidad): los `features` se asignan por NOMBRE + forType de la
-- categoría PADRE (parentId IS NULL), NO por id (los ids son autoincrement y no
-- coinciden con los del prompt). Corre el SELECT final para VERIFICAR qué
-- categorías quedaron con cada feature y avísame si falta alguna (puede que en
-- prod el nombre exacto difiera del asumido aquí).
-- ============================================================================

-- 1) Columna features en categories ------------------------------------------
ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "features" JSONB DEFAULT '[]';

-- 2) Columna appointmentSchedule en providers (horario semanal de agenda) -----
ALTER TABLE "providers"
  ADD COLUMN IF NOT EXISTS "appointmentSchedule" JSONB;

-- 3) Tabla appointments -------------------------------------------------------
CREATE TABLE IF NOT EXISTS "appointments" (
  "id"             SERIAL NOT NULL,
  "providerId"     INTEGER NOT NULL,
  "userId"         INTEGER NOT NULL,
  "date"           TIMESTAMP(3) NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'PENDIENTE',
  "description"    TEXT,
  "reminderSentAt" TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "appointments_providerId_date_idx" ON "appointments"("providerId", "date");
CREATE INDEX IF NOT EXISTS "appointments_userId_idx"          ON "appointments"("userId");
CREATE INDEX IF NOT EXISTS "appointments_status_date_idx"     ON "appointments"("status", "date");

-- FKs (DO block para que ADD CONSTRAINT sea idempotente).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_providerId_fkey') THEN
    ALTER TABLE "appointments"
      ADD CONSTRAINT "appointments_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "providers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_userId_fkey') THEN
    ALTER TABLE "appointments"
      ADD CONSTRAINT "appointments_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) Asignación de features por categoría PADRE (nombre + forType) ------------
-- Sobre-escribe features (idempotente). Solo categorías padre (parentId IS NULL);
-- las hijas heredan en runtime.

-- agenda
UPDATE "categories" SET "features" = '["agenda"]'::jsonb
WHERE "parentId" IS NULL AND "forType" = 'OFICIO'
  AND "name" IN ('Salud y Bienestar','Educación','Servicios Personales',
                 'Transporte y Mudanzas','Mecánica y Automotriz','Animación y Shows');

UPDATE "categories" SET "features" = '["agenda"]'::jsonb
WHERE "parentId" IS NULL AND "forType" = 'NEGOCIO'
  AND "name" IN ('Belleza y Estética','Salud y Farmacia');

-- carta_digital (Gastronomía — el seed la nombra "Alimentación y Gastronomía")
UPDATE "categories" SET "features" = '["carta_digital"]'::jsonb
WHERE "parentId" IS NULL AND "forType" = 'NEGOCIO'
  AND "name" IN ('Gastronomía','Alimentación y Gastronomía');

-- catalogo
UPDATE "categories" SET "features" = '["catalogo"]'::jsonb
WHERE "parentId" IS NULL AND "forType" = 'NEGOCIO'
  AND "name" IN ('Tiendas y Retail','Ferreterías');

-- cotizacion
UPDATE "categories" SET "features" = '["cotizacion"]'::jsonb
WHERE "parentId" IS NULL AND "forType" = 'OFICIO'
  AND "name" IN ('Hogar y Construcción','Ingeniería y Diseño','Legal y Financiero','Tecnología');

UPDATE "categories" SET "features" = '["cotizacion"]'::jsonb
WHERE "parentId" IS NULL AND "forType" = 'NEGOCIO'
  AND "name" IN ('Automotriz y Vehículos','Servicios y Otros','Imprenta y Publicidad');

-- 5) VERIFICACIÓN — revisa que cada categoría esperada quedó con su feature.
--    Si una categoría del prompt NO aparece aquí, su nombre en prod difiere:
--    avísame el nombre exacto y ajusto.
SELECT "id", "name", "forType", "features"
FROM "categories"
WHERE "parentId" IS NULL AND "features" IS NOT NULL AND "features" <> '[]'::jsonb
ORDER BY "forType", "name";
