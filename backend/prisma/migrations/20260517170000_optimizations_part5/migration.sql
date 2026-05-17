-- Parte 5 — Optimizaciones de rendimiento:
--   a) PostGIS: columna geography(Point) generada en providers y
--      service_requests, con GiST index para ST_DWithin.
--   b) Full-text search: tsvector generado + GIN index en providers.
--      Trigram index para tolerancia a typos.
--   c) Materialized view admin_dashboard_stats.
--   d) Índices compuestos faltantes (alineados con los patrones de
--      consulta del backend).

-- ═══════════════════════════════════════════════════════════════
-- a) PostGIS — coordenadas como GEOGRAPHY(Point, 4326)
-- ═══════════════════════════════════════════════════════════════
--
-- Mantenemos las columnas latitude/longitude (no las tiramos) para
-- compatibilidad con el código existente y para que el cliente Flutter
-- siga recibiéndolas. La nueva columna `location_geog` es GENERATED
-- ALWAYS STORED desde lat/lng — siempre sincronizada sin trigger.
--
-- Beneficio: ST_DWithin sobre GiST index es O(log n) vs Haversine
-- en JS O(n). A 10k+ providers, la diferencia es 50-100x.

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "providers"
  ADD COLUMN location_geog geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN latitude IS NOT NULL AND longitude IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      ELSE NULL
    END
  ) STORED;

CREATE INDEX "providers_location_geog_gist"
  ON "providers" USING GIST (location_geog)
  WHERE location_geog IS NOT NULL;

ALTER TABLE "service_requests"
  ADD COLUMN location_geog geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN latitude IS NOT NULL AND longitude IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      ELSE NULL
    END
  ) STORED;

CREATE INDEX "service_requests_location_geog_gist"
  ON "service_requests" USING GIST (location_geog)
  WHERE location_geog IS NOT NULL;

-- EJEMPLO DE USO en el código:
-- Encontrar providers aprobados a ≤5km de Huancayo centro:
--
--   SELECT id, "businessName", ST_Distance(
--     location_geog,
--     ST_SetSRID(ST_MakePoint(-75.2049, -12.0653), 4326)::geography
--   ) / 1000 AS km
--   FROM providers
--   WHERE "verificationStatus" = 'APROBADO'
--     AND "isVisible" = true
--     AND ST_DWithin(
--       location_geog,
--       ST_SetSRID(ST_MakePoint(-75.2049, -12.0653), 4326)::geography,
--       5000  -- metros
--     )
--   ORDER BY km;


-- ═══════════════════════════════════════════════════════════════
-- b) Full-text search + tolerancia a typos
-- ═══════════════════════════════════════════════════════════════
--
-- search_tsv pesa businessName (A) > description (B) — al rankear por
-- ts_rank_cd, un match en el nombre del negocio pesa más que uno solo
-- en la descripción. Diccionario 'spanish' para stemming de plurales,
-- conjugaciones, etc. ('electricistas' encuentra 'electricista').
--
-- Para typos leves usamos pg_trgm: 'electristia' (typo) matchea
-- 'electricista' via similarity() o ILIKE '%xxx%' acelerado por GIN.

ALTER TABLE "providers"
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce("businessName", '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(description, '')),    'B')
  ) STORED;

CREATE INDEX "providers_search_tsv_gin"
  ON "providers" USING GIN (search_tsv);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "providers_businessname_trgm"
  ON "providers" USING GIN ("businessName" gin_trgm_ops);

CREATE INDEX "providers_description_trgm"
  ON "providers" USING GIN (description gin_trgm_ops)
  WHERE description IS NOT NULL;

-- EJEMPLOS DE USO:
-- 1. Búsqueda exacta con ranking (escribió "electricista huancayo"):
--
--   SELECT id, "businessName",
--          ts_rank_cd(search_tsv, q) AS rank
--   FROM providers,
--        plainto_tsquery('spanish', 'electricista huancayo') q
--   WHERE search_tsv @@ q
--     AND "verificationStatus" = 'APROBADO'
--   ORDER BY rank DESC
--   LIMIT 20;
--
-- 2. Búsqueda con typos ("electrisista"):
--
--   SELECT id, "businessName",
--          similarity("businessName", 'electrisista') AS sim
--   FROM providers
--   WHERE "businessName" % 'electrisista'  -- usa el GIN trgm
--     AND "verificationStatus" = 'APROBADO'
--   ORDER BY sim DESC
--   LIMIT 20;
--
-- 3. Combinado (FTS primero, si no hay match cae a trigram):
--   ver providers.service.ts post-migración.


-- ═══════════════════════════════════════════════════════════════
-- c) Materialized view admin_dashboard_stats
-- ═══════════════════════════════════════════════════════════════
--
-- Una sola fila con todas las métricas del dashboard. Se construye
-- a partir de COUNTs/aggregates sobre múltiples tablas — sin la MV,
-- el panel hace ~10 queries cada vez que se abre.
--
-- REFRESH: el endpoint /admin/dashboard/refresh la regenera. También
-- corre como cron cada 5min (configurable). En Postgres < 9.4 no hay
-- CONCURRENTLY; aquí (16) sí, así que el refresh no bloquea lectores.

CREATE MATERIALIZED VIEW admin_dashboard_stats AS
WITH provider_stats AS (
  SELECT
    count(*)                                                       AS total,
    count(*) FILTER (WHERE "verificationStatus" = 'PENDIENTE')     AS pending,
    count(*) FILTER (WHERE "verificationStatus" = 'APROBADO')      AS approved,
    count(*) FILTER (WHERE "verificationStatus" = 'RECHAZADO')     AS rejected,
    count(*) FILTER (WHERE "verificationStatus" = 'APROBADO'
                     AND type = 'OFICIO')                          AS approved_oficio,
    count(*) FILTER (WHERE "verificationStatus" = 'APROBADO'
                     AND type = 'NEGOCIO')                         AS approved_negocio
  FROM providers
),
yape_stats AS (
  SELECT
    count(*)                                          AS total,
    count(*) FILTER (WHERE status = 'PENDING')        AS pending,
    count(*) FILTER (WHERE status = 'APPROVED')       AS approved,
    count(*) FILTER (WHERE status = 'REJECTED')       AS rejected,
    COALESCE(SUM(amount) FILTER (WHERE status = 'APPROVED'), 0) AS approved_amount
  FROM yape_payments
),
request_stats AS (
  SELECT
    count(*)                                          AS total,
    count(*) FILTER (WHERE status = 'OPEN')           AS open,
    count(*) FILTER (WHERE status = 'CLOSED')         AS closed,
    count(*) FILTER (WHERE status = 'AWARDED')        AS awarded,
    count(*) FILTER (WHERE status = 'EXPIRED')        AS expired,
    count(*) FILTER (WHERE status = 'CANCELLED')      AS cancelled
  FROM service_requests
),
top_cats AS (
  -- Top 10 categorías por # de providers aprobados asociados.
  SELECT json_agg(row_to_json(t)) AS cats
  FROM (
    SELECT c.id, c.name, c.slug, count(pc."providerId") AS provider_count
    FROM categories c
    JOIN provider_categories pc ON pc."categoryId" = c.id
    JOIN providers p ON p.id = pc."providerId"
                    AND p."verificationStatus" = 'APROBADO'
    GROUP BY c.id, c.name, c.slug
    ORDER BY provider_count DESC
    LIMIT 10
  ) t
)
SELECT
  (SELECT count(*) FROM users)                       AS total_users,
  (SELECT count(*) FROM users WHERE "isActive")      AS active_users,
  (SELECT count(*) FROM reviews WHERE "isVisible")   AS total_reviews,
  (SELECT COALESCE(SUM(coins), 0) FROM users)        AS coins_in_circulation,
  ps.total          AS providers_total,
  ps.pending        AS providers_pending,
  ps.approved       AS providers_approved,
  ps.rejected       AS providers_rejected,
  ps.approved_oficio,
  ps.approved_negocio,
  ys.total          AS yape_total,
  ys.pending        AS yape_pending,
  ys.approved       AS yape_approved,
  ys.rejected       AS yape_rejected,
  ys.approved_amount AS yape_approved_amount,
  rs.total          AS requests_total,
  rs.open           AS requests_open,
  rs.closed         AS requests_closed,
  rs.awarded        AS requests_awarded,
  rs.expired        AS requests_expired,
  rs.cancelled      AS requests_cancelled,
  tc.cats           AS top_categories,
  now()             AS refreshed_at
FROM provider_stats ps, yape_stats ys, request_stats rs, top_cats tc;

-- UNIQUE INDEX requerido para poder hacer REFRESH ... CONCURRENTLY.
CREATE UNIQUE INDEX admin_dashboard_stats_pk
  ON admin_dashboard_stats ((1));

-- Función de conveniencia para refrescar sin bloquear lectores.
CREATE OR REPLACE FUNCTION refresh_admin_dashboard_stats()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_dashboard_stats;
END $$;

-- CADENCIA RECOMENDADA:
--   - Manual: el endpoint /admin/dashboard incluye botón "Refrescar".
--   - Automática: pg_cron cada 5 minutos:
--       SELECT cron.schedule('refresh-admin-dashboard',
--                            '*/5 * * * *',
--                            'SELECT refresh_admin_dashboard_stats()');
--     (Si Supabase no tiene pg_cron habilitado, hacerlo desde un
--      @Cron de NestJS llamando a $executeRaw.)


-- ═══════════════════════════════════════════════════════════════
-- d) Índices compuestos faltantes (alineados con queries reales)
-- ═══════════════════════════════════════════════════════════════
--
-- Auditoría rápida de los patrones más frecuentes en services/:
--   * providers: ya tiene (isVisible, verificationStatus) y
--     (isVisible, verificationStatus, averageRating). Falta:
--     (isVisible, verificationStatus, localityId) para el filtro
--     base + localización (caso más común post-Parte 2).
--   * reviews: ya tiene (providerId, isVisible).
--   * service_requests: ya tiene (status, expiresAt), (status, categoryId, expiresAt).
--     Falta (userId, status) para "mis solicitudes activas".
--   * provider_analytics: ya tiene (providerId, eventType) y (createdAt).
--     Falta (providerId, eventType, createdAt) para los rangos de fecha
--     por evento que usa el dashboard.

CREATE INDEX "providers_isVisible_verificationStatus_localityId_idx"
  ON "providers" ("isVisible", "verificationStatus", "localityId");

CREATE INDEX "service_requests_userId_status_idx"
  ON "service_requests" ("userId", status);

CREATE INDEX "provider_analytics_providerId_eventType_createdAt_idx"
  ON "provider_analytics" ("providerId", "eventType", "createdAt");
