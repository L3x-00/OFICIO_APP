-- PR Grupo D #6a — deep-link de notificaciones persistidas.
-- Aditivo + idempotente: agrega la columna `metadata` (JSONB nullable) a
-- admin_notifications para que la notif guardada lleve chatRoomId/messageId/etc
-- y al tocarla desde el historial abra el destino correcto.
-- Seguro de re-ejecutar. Aplicar en Supabase ANTES de desplegar el backend.

ALTER TABLE admin_notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB;
