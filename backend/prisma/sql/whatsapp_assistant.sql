-- ═══════════════════════════════════════════════════════════════════
-- WhatsApp ↔ OpenWA (F1) — tablas de estado mínimo (idempotente)
-- ═══════════════════════════════════════════════════════════════════
-- Espejo SQL de los modelos Prisma `WhatsappInboundMessage` y
-- `WhatsappContactPreference` (backend/prisma/schema.prisma).
--
-- La integración está APAGADA por defecto (WHATSAPP_ASSISTANT_ENABLED=false):
-- con el flag apagado el webhook responde 204 y NO toca estas tablas. Aplicar
-- este SQL ANTES de encender el flag (protocolo /sql-prod).
--
-- APLICAR MANUALMENTE en Supabase SQL Editor. Re-aplicarlo es seguro: todo es
-- IF NOT EXISTS / DO-guarded. Ningún agente ejecuta esto contra prod.
--
-- Privacidad: NO se guarda texto ni teléfono. El teléfono/JID del contacto y el
-- id de mensaje se guardan SOLO como HMAC. Algunos ids de WhatsApp contienen el
-- JID/teléfono; `messageIdHash` conserva la deduplicación sin persistirlos.
--
-- Orden de aplicación:
--   1. Enum "WhatsappInboundStatus"
--   2. Tabla whatsapp_inbound_message (+ unique + index)
--   3. Tabla whatsapp_contact_preference (+ unique)
-- ═══════════════════════════════════════════════════════════════════

-- 1. Enum de estado del inbound.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WhatsappInboundStatus') THEN
    CREATE TYPE "WhatsappInboundStatus" AS ENUM (
      'RECEIVED',
      'SEND_STARTED',
      'SENT',
      'SUPPRESSED',
      'FAILED'
    );
  END IF;
END $$;

-- 2. Registro idempotente de webhooks message.received procesados.
CREATE TABLE IF NOT EXISTS "whatsapp_inbound_message" (
    "id"          SERIAL NOT NULL,
    "sessionId"   TEXT NOT NULL,
    "messageIdHash" TEXT NOT NULL,
    "status"      "WhatsappInboundStatus" NOT NULL DEFAULT 'RECEIVED',
    "errorCode"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "whatsapp_inbound_message_pkey" PRIMARY KEY ("id")
);

-- Unicidad (sessionId, messageIdHash) → semántica at-most-once: un segundo delivery
-- del mismo mensaje choca aquí y el backend NO reenvía.
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_inbound_message_sessionId_messageIdHash_key"
    ON "whatsapp_inbound_message" ("sessionId", "messageIdHash");

CREATE INDEX IF NOT EXISTS "whatsapp_inbound_message_status_idx"
    ON "whatsapp_inbound_message" ("status");

-- 3. Preferencia por contacto (opt-out / pausa por derivación a humano).
--    El contacto se identifica SOLO por HMAC (contactHash), nunca por teléfono.
CREATE TABLE IF NOT EXISTS "whatsapp_contact_preference" (
    "id"              SERIAL NOT NULL,
    "sessionId"       TEXT NOT NULL,
    "contactHash"     TEXT NOT NULL,
    "optedOutAt"      TIMESTAMP(3),
    "humanHandoverAt" TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_contact_preference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_contact_preference_sessionId_contactHash_key"
    ON "whatsapp_contact_preference" ("sessionId", "contactHash");
