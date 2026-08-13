-- ═════════════════════════════════════════════════════════════════════════════
-- WhatsApp ↔ Servi (F3) — vínculo de cuenta por código efímero (idempotente)
-- ═════════════════════════════════════════════════════════════════════════════
-- Espejo de `WhatsappLinkChallenge` y `WhatsappLinkedContact` en
-- `backend/prisma/schema.prisma`.
--
-- APLICAR MANUALMENTE en Supabase SQL Editor ANTES de habilitar F3. Repetir es
-- seguro: solo CREATE ... IF NOT EXISTS. Ningún agente ejecuta este SQL contra
-- producción. F1 (`whatsapp_assistant.sql`) debe estar aplicado primero.
--
-- Privacidad: no almacena códigos, mensajes, teléfonos ni JID. `codeHash` y
-- `contactHash` son HMAC locales. El backend resuelve rol/perfil desde `users`
-- en cada mensaje; este vínculo no guarda ni confía en roles.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "whatsapp_link_challenge" (
    "id"        SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "codeHash"  TEXT NOT NULL,
    "userId"    INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_link_challenge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "whatsapp_link_challenge_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_link_challenge_sessionId_codeHash_key"
  ON "whatsapp_link_challenge" ("sessionId", "codeHash");

CREATE INDEX IF NOT EXISTS "whatsapp_link_challenge_sessionId_userId_expiresAt_idx"
  ON "whatsapp_link_challenge" ("sessionId", "userId", "expiresAt");

CREATE TABLE IF NOT EXISTS "whatsapp_linked_contact" (
    "id"          SERIAL NOT NULL,
    "sessionId"   TEXT NOT NULL,
    "contactHash" TEXT NOT NULL,
    "userId"      INTEGER NOT NULL,
    "linkedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_linked_contact_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "whatsapp_linked_contact_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Un contacto no puede apuntar a dos cuentas. Un usuario tiene un contacto
-- actual por sesión: al vincular un número nuevo, el backend reemplaza el suyo
-- de forma atómica; nunca toca el vínculo de otra cuenta.
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_linked_contact_sessionId_contactHash_key"
  ON "whatsapp_linked_contact" ("sessionId", "contactHash");

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_linked_contact_sessionId_userId_key"
  ON "whatsapp_linked_contact" ("sessionId", "userId");

CREATE INDEX IF NOT EXISTS "whatsapp_linked_contact_userId_idx"
  ON "whatsapp_linked_contact" ("userId");
