-- WhatsApp ↔ Servi (F4) — handover humano y DLQ sin replay
--
-- APLICAR MANUALMENTE en Supabase SQL Editor antes de habilitar
-- WHATSAPP_ASSISTANT_OPERATIONS_ENABLED=true. Repetir es seguro. Este archivo
-- no se ejecuta por agentes, CI, Prisma ni scripts de despliegue.
--
-- Privacidad: no añade texto, teléfono, JID, chatId ni payload. Los handovers
-- solo conservan hashes HMAC ya existentes y el panel ni siquiera los expone.
-- La DLQ es de reconocimiento, no de reintento: at-most-once prohíbe reenviar.

ALTER TABLE "whatsapp_inbound_message"
  ADD COLUMN IF NOT EXISTS "dlqAcknowledgedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dlqAcknowledgedByUserId" INTEGER;

CREATE INDEX IF NOT EXISTS "whatsapp_inbound_message_status_dlqAcknowledgedAt_idx"
  ON "whatsapp_inbound_message" ("status", "dlqAcknowledgedAt");

DO $$
BEGIN
  CREATE TYPE "WhatsappHandoverStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "whatsapp_handover" (
  "id"                   SERIAL NOT NULL,
  "sessionId"            TEXT NOT NULL,
  "contactHash"          TEXT NOT NULL,
  "status"               "WhatsappHandoverStatus" NOT NULL DEFAULT 'OPEN',
  "requestedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt"       TIMESTAMP(3),
  "acknowledgedByUserId" INTEGER,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_handover_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_handover_sessionId_contactHash_key"
  ON "whatsapp_handover" ("sessionId", "contactHash");

CREATE INDEX IF NOT EXISTS "whatsapp_handover_status_requestedAt_idx"
  ON "whatsapp_handover" ("status", "requestedAt");
