-- Normalización + performance de localities.
-- PRE-REQ verificado por el usuario: queries retornaron 0 filas.

-- ── PIEZA 1: extensión unaccent (Supabase ya activada)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ── PIEZA 1b: función immutable wrapper (requerido por índices)
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
RETURN public.unaccent($1);

-- ── PIEZA 2: reemplazar @@unique por functional index
DROP INDEX IF EXISTS "localities_dept_prov_dist_unique";

CREATE UNIQUE INDEX "localities_dept_prov_dist_unaccent_unique"
  ON "localities" (
    lower(public.immutable_unaccent("department")),
    lower(public.immutable_unaccent(coalesce("province", ''))),
    lower(public.immutable_unaccent(coalesce("district", '')))
  );

-- ── PIEZA 3: trigger BEFORE INSERT/UPDATE
CREATE OR REPLACE FUNCTION trim_locality_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."department" := regexp_replace(trim(NEW."department"), '\s+', ' ', 'g');
  IF NEW."province" IS NOT NULL THEN
    NEW."province" := regexp_replace(trim(NEW."province"), '\s+', ' ', 'g');
  END IF;
  IF NEW."district" IS NOT NULL THEN
    NEW."district" := regexp_replace(trim(NEW."district"), '\s+', ' ', 'g');
  END IF;
  IF NEW."name" IS NOT NULL THEN
    NEW."name" := regexp_replace(trim(NEW."name"), '\s+', ' ', 'g');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trim_locality_fields_trg ON "localities";
CREATE TRIGGER trim_locality_fields_trg
  BEFORE INSERT OR UPDATE ON "localities"
  FOR EACH ROW EXECUTE FUNCTION trim_locality_fields();

-- ── PIEZA 4: columnas generadas STORED
ALTER TABLE "localities"
  ADD COLUMN "department_norm" text
    GENERATED ALWAYS AS (lower(public.immutable_unaccent("department"))) STORED,
  ADD COLUMN "province_norm" text
    GENERATED ALWAYS AS (lower(public.immutable_unaccent(coalesce("province", '')))) STORED,
  ADD COLUMN "district_norm" text
    GENERATED ALWAYS AS (lower(public.immutable_unaccent(coalesce("district", '')))) STORED;

-- Index parcial
CREATE INDEX "localities_norm_active_idx"
  ON "localities" ("department_norm", "province_norm", "district_norm")
  WHERE "isActive" = true;