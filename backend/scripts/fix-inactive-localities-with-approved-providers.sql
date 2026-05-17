-- Bug-fix puntual: reactivar localities con isActive=false que tienen
-- al menos un Provider con verificationStatus='APROBADO'.
--
-- CONTEXTO:
-- Antes de la migración 20260517130000, providers.service.ts cargaba
-- `localities WHERE isActive=true` y filtraba en JS — los providers
-- aprobados apuntando a una locality inactiva quedaban INVISIBLES en
-- todos los filtros de ubicación sin que el provider lo supiera.
--
-- Diagnóstico del usuario (query #4 de Parte 2): 2 providers
-- aprobados (IDs 27 y 4) apuntaban a una locality 'Junín' a nivel
-- departamento (sin prov/dist) con isActive=false.
--
-- ESTA QUERY ES IDEMPOTENTE: re-ejecutarla no causa daño. Reactiva
-- TODA locality que cumpla la condición — no solo el caso reportado,
-- para que el bug no vuelva a aparecer silenciosamente con otros
-- providers aprobados que también caigan en localities desactivadas.
--
-- EJECUTAR EN SUPABASE SQL EDITOR (no es migración Prisma — esto
-- corrige datos, no schema, así que no debería vivir en migrations/).

-- 1. Preview: qué se va a reactivar (correr primero para revisar)
SELECT
  l.id,
  l.department,
  l.province,
  l.district,
  l."isActive"     AS estado_antes,
  l.source,
  count(p.id)      AS providers_aprobados_que_quedan_visibles
FROM localities l
JOIN providers p ON p."localityId" = l.id
WHERE p."verificationStatus" = 'APROBADO'
  AND l."isActive" = false
GROUP BY l.id
ORDER BY providers_aprobados_que_quedan_visibles DESC;

-- 2. Aplicar el fix (descomentar y ejecutar después de revisar el preview)
-- UPDATE localities
-- SET "isActive" = true
-- WHERE id IN (
--   SELECT DISTINCT "localityId"
--   FROM providers
--   WHERE "verificationStatus" = 'APROBADO'
-- )
-- AND "isActive" = false
-- RETURNING id, department, province, district;

-- 3. Verificación post-fix (debe retornar 0 filas)
-- SELECT count(*) AS providers_aprobados_aun_invisibles
-- FROM providers p
-- JOIN localities l ON l.id = p."localityId"
-- WHERE p."verificationStatus" = 'APROBADO'
--   AND l."isActive" = false;
