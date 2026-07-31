-- FASE 5 (auditoría de seguimiento) — features para las categorías pro-*.
--
-- Hallazgo: profesionales_05_catalogo_inicial.sql creó los 5 sectores y 27
-- especialidades PROFESIONAL sin `features` (quedaron en el default '[]').
-- Un OFICIO con cotizaciones/agenda abiertas que migra a PROFESIONAL pierde
-- el acceso a esas secciones en su panel — los registros NO se borran, solo
-- se ocultan porque el panel deriva su UI del array `features` heredado del
-- sector. Este script solo completa lo que 05 dejó vacío.
--
-- Orden: ejecutar DESPUÉS de profesionales_01, 02 y 05.
--
-- Seguridad e idempotencia:
-- - Solo UPDATE de la columna `features`, nunca INSERT/DELETE.
-- - Acotado a los 5 slugs pro-* raíz Y solo si `features` sigue vacío — si
--   alguien ya los personalizó a mano, este script no los toca.
-- - Mismo patrón ya usado en pr1_features_agenda.sql (agenda/cotizacion por
--   categoría padre) — aquí por slug en vez de nombre porque pro-* sí tiene
--   slugs estables y reservados.
-- - No reactiva nada de cara al cliente: los CTA de Agenda/Cotización siguen
--   detrás de FEATURE_AGENDA/FEATURE_COTIZACION (gate por superficie
--   'public'); esto solo afecta lo que el panel del propio proveedor ve.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type AS provider_type
    JOIN pg_enum AS provider_enum ON provider_enum.enumtypid = provider_type.oid
    WHERE provider_type.typname = 'ProviderType'
      AND provider_enum.enumlabel = 'PROFESIONAL'
  ) THEN
    RAISE EXCEPTION
      'Falta ProviderType.PROFESIONAL. Ejecutar profesionales_01_provider_type.sql primero.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "categories"
    WHERE "slug" IN ('pro-ingenieria', 'pro-tecnologia', 'pro-legal', 'pro-salud', 'pro-educacion')
      AND "forType" = 'PROFESIONAL'
  ) THEN
    RAISE EXCEPTION
      'No se encontraron los sectores pro-*. Ejecutar profesionales_05_catalogo_inicial.sql primero.';
  END IF;
END $$;

-- cotizacion: análogo a of-hogar/of-tecnologia/of-ingenieria/of-legal.
UPDATE "categories" SET "features" = '["cotizacion"]'::jsonb
WHERE "slug" IN ('pro-ingenieria', 'pro-tecnologia', 'pro-legal')
  AND "forType" = 'PROFESIONAL'
  AND ("features" IS NULL OR "features" = '[]'::jsonb);

-- agenda: análogo a of-salud/of-educacion.
UPDATE "categories" SET "features" = '["agenda"]'::jsonb
WHERE "slug" IN ('pro-salud', 'pro-educacion')
  AND "forType" = 'PROFESIONAL'
  AND ("features" IS NULL OR "features" = '[]'::jsonb);

-- VERIFICACIÓN — deben aparecer los 5 sectores, cada uno con su feature.
SELECT "id", "name", "slug", "features"
FROM "categories"
WHERE "slug" IN ('pro-ingenieria', 'pro-tecnologia', 'pro-legal', 'pro-salud', 'pro-educacion')
ORDER BY "slug";
