-- FASE 1 / PASO 1 DE 2
-- Ejecutar SOLO este archivo en Supabase.
-- No envolver con BEGIN/COMMIT ni pegar junto al archivo 02. PostgreSQL no
-- permite usar un valor de enum agregado dentro de la misma transacción.
--
-- No modifica filas existentes.

ALTER TYPE "ProviderType" ADD VALUE IF NOT EXISTS 'PROFESIONAL';
