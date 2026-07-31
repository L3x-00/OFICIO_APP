-- FASE 2 / PASO 5 DE 5 — Catálogo inicial de Servicios profesionales.
--
-- Orden: ejecutar manualmente en Supabase DESPUÉS de profesionales_01 y 02.
-- Los controles de pago 03/04 son independientes de este catálogo. El valor
-- PROFESIONAL debe existir primero en ProviderType; este catálogo es necesario
-- antes de habilitar registros o migraciones profesionales en UI.
--
-- Seguridad e idempotencia:
-- - Solo INSERT. No reclasifica, actualiza ni borra categorías existentes.
-- - Usa slugs reservados pro-* y ON CONFLICT DO NOTHING para poder re-ejecutarse.
-- - Si un slug reservado ya pertenece a otro tipo o árbol, se detiene antes de
--   mutar datos: resolver ese conflicto manualmente evita mezclar catálogos.

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
      'Falta ProviderType.PROFESIONAL. Ejecutar profesionales_01_provider_type.sql y confirmar su transacción antes de este archivo.';
  END IF;

  IF EXISTS (
    WITH expected("slug", "parentSlug") AS (
      VALUES
        ('pro-ingenieria', NULL::TEXT),
        ('pro-tecnologia', NULL::TEXT),
        ('pro-legal', NULL::TEXT),
        ('pro-salud', NULL::TEXT),
        ('pro-educacion', NULL::TEXT),
        ('pro-ingenieria-civil', 'pro-ingenieria'),
        ('pro-arquitectura', 'pro-ingenieria'),
        ('pro-ingenieria-electrica', 'pro-ingenieria'),
        ('pro-tecnico-electricista', 'pro-ingenieria'),
        ('pro-ingenieria-mecanica', 'pro-ingenieria'),
        ('pro-topografia', 'pro-ingenieria'),
        ('pro-seguridad-salud-trabajo', 'pro-ingenieria'),
        ('pro-ingenieria-sistemas', 'pro-tecnologia'),
        ('pro-desarrollo-software', 'pro-tecnologia'),
        ('pro-diseno-grafico', 'pro-tecnologia'),
        ('pro-diseno-ux-ui', 'pro-tecnologia'),
        ('pro-marketing-digital', 'pro-tecnologia'),
        ('pro-ciberseguridad-redes', 'pro-tecnologia'),
        ('pro-abogacia', 'pro-legal'),
        ('pro-contabilidad', 'pro-legal'),
        ('pro-asesoria-tributaria', 'pro-legal'),
        ('pro-administracion-empresas', 'pro-legal'),
        ('pro-consultoria-empresarial', 'pro-legal'),
        ('pro-medicina', 'pro-salud'),
        ('pro-psicologia', 'pro-salud'),
        ('pro-nutricion', 'pro-salud'),
        ('pro-fisioterapia', 'pro-salud'),
        ('pro-odontologia', 'pro-salud'),
        ('pro-docencia-especializada', 'pro-educacion'),
        ('pro-idiomas-traduccion', 'pro-educacion'),
        ('pro-capacitacion-formacion', 'pro-educacion'),
        ('pro-orientacion-vocacional', 'pro-educacion')
    )
    SELECT 1
    FROM expected
    JOIN "categories" AS category ON category."slug" = expected."slug"
    LEFT JOIN "categories" AS parent ON parent."slug" = expected."parentSlug"
    WHERE category."forType" IS DISTINCT FROM 'PROFESIONAL'
      OR category."isActive" IS DISTINCT FROM TRUE
      OR (
        expected."parentSlug" IS NULL
        AND category."parentId" IS NOT NULL
      )
      OR (
        expected."parentSlug" IS NOT NULL
        AND category."parentId" IS DISTINCT FROM parent."id"
      )
  ) THEN
    RAISE EXCEPTION
      'Conflicto en slugs reservados pro-*. No se modificó categories; revisar el catálogo existente antes de continuar.';
  END IF;
END $$;

-- Sectores raíz. El tipo separa Servicios profesionales de Oficios y Negocios;
-- no se agrega una tercera profundidad porque la UI actual maneja padre + hija.
INSERT INTO "categories" ("name", "slug", "forType")
VALUES
  ('Ingeniería, Arquitectura y Construcción', 'pro-ingenieria', 'PROFESIONAL'),
  ('Tecnología, Diseño y Marketing', 'pro-tecnologia', 'PROFESIONAL'),
  ('Legal, Finanzas y Consultoría', 'pro-legal', 'PROFESIONAL'),
  ('Salud y Bienestar Profesional', 'pro-salud', 'PROFESIONAL'),
  ('Educación y Desarrollo Profesional', 'pro-educacion', 'PROFESIONAL')
ON CONFLICT ("slug") DO NOTHING;

-- Especialidades profesionales. Todas llevan forType explícito para que no
-- dependan de herencia y nunca se mezclen con categorías OFICIO homónimas.
WITH expected("name", "slug", "parentSlug") AS (
  VALUES
    ('Ingeniería Civil', 'pro-ingenieria-civil', 'pro-ingenieria'),
    ('Arquitectura', 'pro-arquitectura', 'pro-ingenieria'),
    ('Ingeniería Eléctrica', 'pro-ingenieria-electrica', 'pro-ingenieria'),
    ('Técnico Electricista Certificado', 'pro-tecnico-electricista', 'pro-ingenieria'),
    ('Ingeniería Mecánica', 'pro-ingenieria-mecanica', 'pro-ingenieria'),
    ('Topografía y Geomática', 'pro-topografia', 'pro-ingenieria'),
    ('Seguridad y Salud en el Trabajo', 'pro-seguridad-salud-trabajo', 'pro-ingenieria'),
    ('Ingeniería de Sistemas', 'pro-ingenieria-sistemas', 'pro-tecnologia'),
    ('Desarrollo de Software', 'pro-desarrollo-software', 'pro-tecnologia'),
    ('Diseño Gráfico', 'pro-diseno-grafico', 'pro-tecnologia'),
    ('Diseño UX/UI', 'pro-diseno-ux-ui', 'pro-tecnologia'),
    ('Marketing Digital', 'pro-marketing-digital', 'pro-tecnologia'),
    ('Ciberseguridad y Redes', 'pro-ciberseguridad-redes', 'pro-tecnologia'),
    ('Abogacía', 'pro-abogacia', 'pro-legal'),
    ('Contabilidad', 'pro-contabilidad', 'pro-legal'),
    ('Asesoría Tributaria', 'pro-asesoria-tributaria', 'pro-legal'),
    ('Administración de Empresas', 'pro-administracion-empresas', 'pro-legal'),
    ('Consultoría Empresarial', 'pro-consultoria-empresarial', 'pro-legal'),
    ('Medicina', 'pro-medicina', 'pro-salud'),
    ('Psicología', 'pro-psicologia', 'pro-salud'),
    ('Nutrición', 'pro-nutricion', 'pro-salud'),
    ('Fisioterapia', 'pro-fisioterapia', 'pro-salud'),
    ('Odontología', 'pro-odontologia', 'pro-salud'),
    ('Docencia Especializada', 'pro-docencia-especializada', 'pro-educacion'),
    ('Idiomas y Traducción', 'pro-idiomas-traduccion', 'pro-educacion'),
    ('Capacitación y Formación', 'pro-capacitacion-formacion', 'pro-educacion'),
    ('Orientación Vocacional', 'pro-orientacion-vocacional', 'pro-educacion')
)
INSERT INTO "categories" ("name", "slug", "parentId", "forType")
SELECT expected."name", expected."slug", parent."id", 'PROFESIONAL'
FROM expected
JOIN "categories" AS parent ON parent."slug" = expected."parentSlug"
WHERE parent."parentId" IS NULL
  AND parent."forType" = 'PROFESIONAL'
  AND parent."isActive" = TRUE
ON CONFLICT ("slug") DO NOTHING;

-- Verificación manual esperada: 5 sectores raíz y 27 especialidades activas.
SELECT
  parent."name" AS sector,
  parent."slug" AS sector_slug,
  COUNT(child."id") AS active_specialties
FROM "categories" AS parent
LEFT JOIN "categories" AS child
  ON child."parentId" = parent."id"
  AND child."isActive" = TRUE
WHERE parent."slug" IN (
  'pro-ingenieria',
  'pro-tecnologia',
  'pro-legal',
  'pro-salud',
  'pro-educacion'
)
GROUP BY parent."id", parent."name", parent."slug"
ORDER BY parent."slug";
