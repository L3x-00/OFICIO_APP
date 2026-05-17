-- Normalización + performance de localities.
-- Decisión: mantener strings CON tildes ('Junín', 'El Tambo') como
-- formato canónico para alinear con peru_locations.dart del cliente y
-- con el seed. Defensa de duplicados se hace via UNIQUE INDEX funcional
-- accent-insensitive; performance se gana con columnas generadas + index
-- compuesto, eliminando el findMany() en JS de providers.service.ts.
--
-- PRE-REQ verificado por el usuario: queries 1, 2 y 6 retornaron 0 filas
-- (no hay duplicados accent-insensitive). El terreno está limpio para
-- crear el unique index sin conflicto.

-- ── PIEZA 1: extensión unaccent (Supabase ya activada)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ── PIEZA 2: reemplazar @@unique([dept,prov,dist]) por functional
-- index accent-insensitive. El antiguo trataba 'Junín' ≠ 'Junin'; el
-- nuevo los considera duplicados y bloquea el INSERT.
DROP INDEX IF EXISTS "localities_dept_prov_dist_unique";

CREATE UNIQUE INDEX "localities_dept_prov_dist_unaccent_unique"
  ON "localities" (
    lower(unaccent("department")),
    lower(unaccent(coalesce("province", ''))),
    lower(unaccent(coalesce("district", '')))
  );

-- ── PIEZA 3: trigger BEFORE INSERT/UPDATE que limpia espacios (trim +
-- colapso de espacios múltiples). NO toca tildes ni casing — eso lo
-- decide la fuente; el unique index funcional cubre el dedup.
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

-- ── PIEZA 4: columnas generadas STORED — el filtro de ubicación del
-- listado público (providers.service.ts) las usa via $queryRaw para
-- mover el match al engine (con index) y eliminar el findMany() en JS.
ALTER TABLE "localities"
  ADD COLUMN "department_norm" text
    GENERATED ALWAYS AS (lower(unaccent("department"))) STORED,
  ADD COLUMN "province_norm" text
    GENERATED ALWAYS AS (lower(unaccent(coalesce("province", '')))) STORED,
  ADD COLUMN "district_norm" text
    GENERATED ALWAYS AS (lower(unaccent(coalesce("district", '')))) STORED;

-- Index parcial: solo filtramos sobre isActive=true en el endpoint
-- público, así que el índice se mantiene chico ignorando inactivas.
CREATE INDEX "localities_norm_active_idx"
  ON "localities" ("department_norm", "province_norm", "district_norm")
  WHERE "isActive" = true;
