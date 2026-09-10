-- provider_analytics_distance.sql
--
-- QUÉ: agrega 3 columnas OPCIONALES a provider_analytics para registrar la
--   ubicación del cliente al momento del evento y su distancia al proveedor:
--     • "clientLat"  DOUBLE PRECISION  (latitud del cliente)
--     • "clientLng"  DOUBLE PRECISION  (longitud del cliente)
--     • "distanceKm" DOUBLE PRECISION  (distancia haversine, km)
--   + un índice parcial sobre "distanceKm" para la métrica de conversión.
--
-- POR QUÉ: habilita "conversión por distancia" en el panel. El evento no
--   guardaba ninguna ubicación; el cliente (web/móvil) empezará a enviar
--   coords de forma gradual. Nada existente cambia si no se envían.
--
-- SEGURO DE RE-EJECUTAR: sí — ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
--
-- ORDEN: aplicar ANTES del deploy del backend. Si faltan, el backend degrada
--   sin romper (el track sin coords no las escribe y la métrica de distancia
--   se atrapa y devuelve vacío), pero conviene tenerlas listas.
--
-- Tipos: Float de Prisma = double precision; columnas nullable = OPCIONALES.

ALTER TABLE provider_analytics ADD COLUMN IF NOT EXISTS "clientLat"  DOUBLE PRECISION;
ALTER TABLE provider_analytics ADD COLUMN IF NOT EXISTS "clientLng"  DOUBLE PRECISION;
ALTER TABLE provider_analytics ADD COLUMN IF NOT EXISTS "distanceKm" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "provider_analytics_distanceKm_idx"
  ON provider_analytics ("distanceKm")
  WHERE "distanceKm" IS NOT NULL;
