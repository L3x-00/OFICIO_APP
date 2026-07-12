-- Reduccion de superficie 2026-07 (fase 2): referidos ocultos.
-- APLICAR MANUALMENTE en Supabase SQL Editor y confirmar antes del merge.
-- Idempotente. Reactivar = ejecutar este UPDATE con isActive = true.
-- No cambia schema, triggers ni funciones.

-- Ofi: el seeder solo corre con tabla vacia; desactivar la fila existente
-- en produccion evita respuestas sobre referidos y monedas.
UPDATE ai_knowledge_entries
SET "isActive" = false
WHERE topic = 'referidos_y_monedas';
