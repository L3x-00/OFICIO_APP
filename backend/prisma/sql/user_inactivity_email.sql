-- Marca para el cron de inactividad "Te extrañamos" (FASE 1.5). Idempotente.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "inactivityEmailSentAt" TIMESTAMP(3);
