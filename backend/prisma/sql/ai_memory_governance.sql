-- Ofi: consentimiento y vencimiento de memoria personal.
-- APLICAR MANUALMENTE en Supabase SQL Editor ANTES del deploy backend.
-- Idempotente. Memorias existentes quedan desactivadas por privacidad.

ALTER TABLE "ai_user_memories"
  ADD COLUMN IF NOT EXISTS "consentGranted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ai_user_memories_expiresAt_idx"
  ON "ai_user_memories" ("expiresAt");
