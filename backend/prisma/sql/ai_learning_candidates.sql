-- Cerebro global interno de Ofi: candidatos agregados para revisión de KB.
-- No almacena texto de chats, usuarios, IPs ni historiales.
-- Idempotente. Aplicar manualmente en Supabase ANTES de desplegar código que escriba señales.

CREATE TABLE IF NOT EXISTS "ai_learning_candidates" (
  "id" SERIAL PRIMARY KEY,
  "topic" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "occurrences" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_learning_candidates_topic_key"
  ON "ai_learning_candidates" ("topic");

CREATE INDEX IF NOT EXISTS "ai_learning_candidates_status_occurrences_idx"
  ON "ai_learning_candidates" ("status", "occurrences");

CREATE INDEX IF NOT EXISTS "ai_learning_candidates_lastSeenAt_idx"
  ON "ai_learning_candidates" ("lastSeenAt");
