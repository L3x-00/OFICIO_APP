-- ═══════════════════════════════════════════════════════════════════
-- location_geog en INSERT y UPDATE de providers (idempotente)
-- ═══════════════════════════════════════════════════════════════════
-- Contexto: el registro (web/móvil) ahora puede enviar latitude/longitude.
-- El trigger original vive solo en Supabase y no está versionado en el
-- repo; este script garantiza que location_geog se calcule también al
-- INSERTAR un proveedor nuevo (no solo al actualizar). Re-aplicarlo es
-- seguro: recrea función y trigger con la misma semántica que usa
-- getNearby (ST_MakePoint(lng, lat)::geography).
--
-- APLICAR MANUALMENTE en Supabase SQL Editor (protocolo /sql-prod).

CREATE OR REPLACE FUNCTION sync_provider_location_geog()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location_geog :=
      ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location_geog := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_provider_location_geog ON providers;

CREATE TRIGGER trg_sync_provider_location_geog
  BEFORE INSERT OR UPDATE OF latitude, longitude ON providers
  FOR EACH ROW
  EXECUTE FUNCTION sync_provider_location_geog();

-- Backfill: proveedores con coords pero sin geografía calculada.
UPDATE providers
SET location_geog =
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location_geog IS NULL;
