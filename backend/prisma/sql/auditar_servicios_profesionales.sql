-- Auditoría PREVIA, SOLO LECTURA — Oficios / Profesionales / Negocios.
--
-- Propósito:
--   Inventariar el catálogo y relaciones actuales ANTES de aplicar la Fase 1.
--   No modifica schema ni datos. Puede ejecutarse varias veces sin efecto.
--
-- Ejecutar manualmente por el propietario en Supabase SQL Editor.
-- No ejecutar desde agentes ni usar como migración de producción.

-- 1) Catálogo raíz por tipo actual. Las categorías hijas pueden heredar el
--    forType de su padre; por eso se reportan aparte.
SELECT
  COALESCE("forType", '(sin tipo)') AS provider_type,
  COUNT(*) AS root_categories
FROM "categories"
WHERE "parentId" IS NULL
GROUP BY "forType"
ORDER BY provider_type;

-- 2) Hijas sin padre, padres inactivos o tipo explícito inconsistente.
SELECT
  child."id" AS child_id,
  child."name" AS child_name,
  child."slug" AS child_slug,
  child."isActive" AS child_active,
  child."forType" AS child_type,
  parent."id" AS parent_id,
  parent."name" AS parent_name,
  parent."isActive" AS parent_active,
  parent."forType" AS parent_type
FROM "categories" AS child
LEFT JOIN "categories" AS parent ON parent."id" = child."parentId"
WHERE child."parentId" IS NOT NULL
  AND (
    parent."id" IS NULL
    OR parent."isActive" = FALSE
    OR (
      child."forType" IS NOT NULL
      AND parent."forType" IS NOT NULL
      AND child."forType" <> parent."forType"
    )
  )
ORDER BY parent_name NULLS FIRST, child_name;

-- 3) Proveedores con categorías cuyo tipo efectivo no coincide con su perfil.
--    No se corrige nada aquí. El resultado define el plan de saneamiento
--    manual y evita reasignaciones masivas accidentales.
SELECT
  provider."id" AS provider_id,
  provider."userId" AS user_id,
  provider."type"::text AS provider_type,
  provider."businessName",
  category."id" AS category_id,
  category."name" AS category_name,
  COALESCE(category."forType", parent."forType") AS effective_category_type
FROM "providers" AS provider
JOIN "provider_categories" AS provider_category
  ON provider_category."providerId" = provider."id"
JOIN "categories" AS category
  ON category."id" = provider_category."categoryId"
LEFT JOIN "categories" AS parent
  ON parent."id" = category."parentId"
WHERE COALESCE(category."forType", parent."forType") IS NOT NULL
  AND provider."type"::text <> COALESCE(category."forType", parent."forType")
ORDER BY provider."id", category."name";

-- 4) Cuentas que ya tienen más de un perfil individual. Debe devolver cero
--    filas antes de agregar PROFESIONAL. Se usa ::text para funcionar antes y
--    después de ampliar el enum ProviderType.
SELECT
  "userId" AS user_id,
  ARRAY_AGG("type"::text ORDER BY "type"::text) AS provider_types,
  COUNT(*) AS individual_profiles
FROM "providers"
WHERE "type"::text IN ('OFICIO', 'PROFESIONAL')
GROUP BY "userId"
HAVING COUNT(*) > 1
ORDER BY user_id;

-- 5) Inventario de relaciones que se preservarán al migrar. Sirve para
--    comprobar posteriormente que Provider.id, reputación y plan no cambiaron.
SELECT
  provider."id" AS provider_id,
  provider."userId" AS user_id,
  provider."type"::text AS provider_type,
  provider."businessName",
  provider."slug",
  provider."verificationStatus",
  provider."isVisible",
  subscription."plan"::text AS subscription_plan,
  subscription."status"::text AS subscription_status,
  (SELECT COUNT(*) FROM "provider_images" WHERE "providerId" = provider."id") AS images,
  (SELECT COUNT(*) FROM "reviews" WHERE "providerId" = provider."id") AS reviews,
  (SELECT COUNT(*) FROM "chat_rooms" WHERE "providerId" = provider."id") AS chat_rooms,
  (SELECT COUNT(*) FROM "favorites" WHERE "providerId" = provider."id") AS favorites,
  (SELECT COUNT(*) FROM "provider_coverage" WHERE "providerId" = provider."id") AS coverage_rows
FROM "providers" AS provider
LEFT JOIN "subscriptions" AS subscription
  ON subscription."providerId" = provider."id"
ORDER BY provider."id";
