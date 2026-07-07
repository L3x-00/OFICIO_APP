-- ============================================================================
-- ALCANCE POR DISTRITOS — SQL para aplicar MANUALMENTE en Supabase (prod).
-- Fecha: 2026-07-07 · Rama: feat/alcance-distritos
--
-- 100% IDEMPOTENTE y ADITIVO: no modifica ni borra datos existentes.
-- Seguro de re-ejecutar. Ejecutar completo en el SQL Editor de Supabase.
--
-- Contiene:
--   PASO 1 — Tabla provider_coverage (distritos adicionales por proveedor).
--   PASO 2 — Catálogo oficial completo de Junín (inserta solo los faltantes).
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- PASO 1 · Tabla provider_coverage
--
-- Distritos ADICIONALES donde el proveedor es visible. El distrito registrado
-- (providers."localityId") siempre es visible y NO se guarda aquí. Los extras
-- solo aplican con plan de pago (el gate está en la query del backend, no en
-- BD) — al vencer/cancelar el plan la selección queda inerte pero se conserva.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS provider_coverage (
    id           SERIAL PRIMARY KEY,
    "providerId" INTEGER NOT NULL,
    "localityId" INTEGER NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT provider_coverage_providerId_fkey
        FOREIGN KEY ("providerId") REFERENCES providers(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT provider_coverage_localityId_fkey
        FOREIGN KEY ("localityId") REFERENCES localities(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_coverage_providerId_localityId_key"
    ON provider_coverage ("providerId", "localityId");

CREATE INDEX IF NOT EXISTS "provider_coverage_localityId_idx"
    ON provider_coverage ("localityId");


-- ────────────────────────────────────────────────────────────────────────────
-- PASO 2 · Catálogo oficial completo de Junín (124 distritos, 9 provincias)
--
-- Inserta SOLO los distritos que falten (match accent/case-insensitive vía
-- translate — no toca filas existentes). source = 'ADMIN' → el móvil los
-- recibe por GET /localities/extras aunque el usuario no actualice la app.
--
-- El ORDEN de los VALUES importa: dentro de cada provincia los distritos
-- urbanos van primero — el default del "Alcance" toma vecinos por orden de id.
-- ────────────────────────────────────────────────────────────────────────────

WITH nuevos (province, district) AS (
  VALUES
    -- Huancayo (28)
    ('Huancayo','Huancayo'), ('Huancayo','El Tambo'), ('Huancayo','Chilca'),
    ('Huancayo','Pilcomayo'), ('Huancayo','Sapallanga'), ('Huancayo','Huancán'),
    ('Huancayo','Huayucachi'), ('Huancayo','Sicaya'),
    ('Huancayo','San Agustín de Cajas'), ('Huancayo','San Jerónimo de Tunán'),
    ('Huancayo','Hualhuas'), ('Huancayo','Saño'), ('Huancayo','Quilcas'),
    ('Huancayo','Quichuay'), ('Huancayo','Ingenio'), ('Huancayo','Pucará'),
    ('Huancayo','Viques'), ('Huancayo','Huacrapuquio'), ('Huancayo','Cullhuas'),
    ('Huancayo','Chupuro'), ('Huancayo','Colca'), ('Huancayo','Chicche'),
    ('Huancayo','Chongos Alto'), ('Huancayo','Chacapampa'),
    ('Huancayo','Carhuacallanga'), ('Huancayo','Huasicancha'),
    ('Huancayo','Pariahuanca'), ('Huancayo','Santo Domingo de Acobamba'),
    -- Jauja (34)
    ('Jauja','Jauja'), ('Jauja','Yauyos'), ('Jauja','Sausa'), ('Jauja','Acolla'),
    ('Jauja','Apata'), ('Jauja','Ataura'), ('Jauja','Canchayllo'),
    ('Jauja','Curicaca'), ('Jauja','El Mantaro'), ('Jauja','Huamalí'),
    ('Jauja','Huaripampa'), ('Jauja','Huertas'), ('Jauja','Janjaillo'),
    ('Jauja','Julcán'), ('Jauja','Leonor Ordóñez'), ('Jauja','Llocllapampa'),
    ('Jauja','Marco'), ('Jauja','Masma'), ('Jauja','Masma Chicche'),
    ('Jauja','Molinos'), ('Jauja','Monobamba'), ('Jauja','Muqui'),
    ('Jauja','Muquiyauyo'), ('Jauja','Paca'), ('Jauja','Paccha'),
    ('Jauja','Pancán'), ('Jauja','Parco'), ('Jauja','Pomacancha'),
    ('Jauja','Ricrán'), ('Jauja','San Lorenzo'), ('Jauja','San Pedro de Chunán'),
    ('Jauja','Sincos'), ('Jauja','Tunan Marca'), ('Jauja','Yauli'),
    -- Concepción (15)
    ('Concepción','Concepción'), ('Concepción','Matahuasi'),
    ('Concepción','Santa Rosa de Ocopa'), ('Concepción','Aco'),
    ('Concepción','Andamarca'), ('Concepción','Chambará'),
    ('Concepción','Cochas'), ('Concepción','Comas'),
    ('Concepción','Heroínas Toledo'), ('Concepción','Manzanares'),
    ('Concepción','Mariscal Castilla'), ('Concepción','Mito'),
    ('Concepción','Nueve de Julio'), ('Concepción','Orcotuna'),
    ('Concepción','San José de Quero'),
    -- Chupaca (9)
    ('Chupaca','Chupaca'), ('Chupaca','Yanacancha'), ('Chupaca','Ahuac'),
    ('Chupaca','Chongos Bajo'), ('Chupaca','Huáchac'),
    ('Chupaca','Huamancaca Chico'), ('Chupaca','San Juan de Iscos'),
    ('Chupaca','San Juan de Jarpa'), ('Chupaca','Tres de Diciembre'),
    -- Tarma (9)
    ('Tarma','Tarma'), ('Tarma','Acobamba'), ('Tarma','Huaricolca'),
    ('Tarma','Huasahuasi'), ('Tarma','La Unión'), ('Tarma','Palca'),
    ('Tarma','Palcamayo'), ('Tarma','San Pedro de Cajas'), ('Tarma','Tapo'),
    -- Chanchamayo (6 oficiales; 'La Merced' ya existe como fila legacy y
    -- se conserva — hay proveedores registrados en ella)
    ('Chanchamayo','Chanchamayo'), ('Chanchamayo','San Ramón'),
    ('Chanchamayo','Pichanaqui'), ('Chanchamayo','Perené'),
    ('Chanchamayo','San Luis de Shuaro'), ('Chanchamayo','Vitoc'),
    -- Satipo (9)
    ('Satipo','Satipo'), ('Satipo','Mazamari'), ('Satipo','Pangoa'),
    ('Satipo','Río Negro'), ('Satipo','Coviriali'), ('Satipo','Llaylla'),
    ('Satipo','Pampa Hermosa'), ('Satipo','Río Tambo'),
    ('Satipo','Vizcatán del Ene'),
    -- Yauli (10)
    ('Yauli','La Oroya'), ('Yauli','Santa Rosa de Sacco'), ('Yauli','Morococha'),
    ('Yauli','Yauli'), ('Yauli','Chacapalpa'), ('Yauli','Huay-Huay'),
    ('Yauli','Marcapomacocha'), ('Yauli','Paccha'),
    ('Yauli','Santa Bárbara de Carhuacayán'), ('Yauli','Suitucancha'),
    -- Junín (4)
    ('Junín','Junín'), ('Junín','Carhuamayo'), ('Junín','Ondores'),
    ('Junín','Ulcumayo')
)
INSERT INTO localities (name, department, province, district, country, "isActive", source)
SELECT n.district, 'Junín', n.province, n.district, 'Perú', true, 'ADMIN'
FROM nuevos n
WHERE NOT EXISTS (
  SELECT 1 FROM localities l
  WHERE translate(lower(l.department), 'áéíóúüñ', 'aeiouun') = 'junin'
    AND translate(lower(coalesce(l.province, '')), 'áéíóúüñ', 'aeiouun')
        = translate(lower(n.province), 'áéíóúüñ', 'aeiouun')
    AND translate(lower(coalesce(l.district, '')), 'áéíóúüñ', 'aeiouun')
        = translate(lower(n.district), 'áéíóúüñ', 'aeiouun')
);


-- ────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (solo lectura — opcional, correr después de aplicar):
--
--   SELECT count(*) FROM localities
--    WHERE department = 'Junín' AND district IS NOT NULL;   -- esperado: ≥124
--
--   SELECT to_regclass('public.provider_coverage');          -- no debe ser NULL
-- ────────────────────────────────────────────────────────────────────────────
