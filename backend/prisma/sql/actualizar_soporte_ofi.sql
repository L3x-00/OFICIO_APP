-- Ofi: actualiza el fallback de soporte existente con canales oficiales.
-- APLICAR MANUALMENTE en Supabase SQL Editor DESPUÉS del deploy backend.
-- Idempotente: solo cambia la fila cuando el contenido o versión difiere.
-- No cambia schema, triggers ni funciones.

UPDATE ai_knowledge_entries
SET
  content = jsonb_build_object(
    'contacto',
    'Canales oficiales: WhatsApp +51 930 759 515, correo soporteofiapp@gmail.com y ventas/planes ronla.angarita31@gmail.com. Ofi muestra botones directos al detectar una solicitud de soporte.'
  ),
  version = GREATEST(version, 2),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE topic = 'soporte'
  AND (
    content IS DISTINCT FROM jsonb_build_object(
      'contacto',
      'Canales oficiales: WhatsApp +51 930 759 515, correo soporteofiapp@gmail.com y ventas/planes ronla.angarita31@gmail.com. Ofi muestra botones directos al detectar una solicitud de soporte.'
    )
    OR version < 2
  );
