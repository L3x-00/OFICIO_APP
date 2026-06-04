-- Memoria persistente de "Ofi" — tablas idempotentes (aplicar con
-- `prisma db execute --file`), patrón usado en este proyecto por la BD
-- histórica construida con db push (sin _prisma_migrations consistente).
--
-- Seguras de re-ejecutar: CREATE ... IF NOT EXISTS. NO destructivas.

-- ── Memoria del CLIENTE (1 fila por usuario) ──────────────────
CREATE TABLE IF NOT EXISTS "ai_user_memories" (
  "id"                SERIAL       PRIMARY KEY,
  "userId"            INTEGER      NOT NULL,
  "searchCategories"  TEXT[]       NOT NULL DEFAULT '{}',
  "recentProviderIds" INTEGER[]    NOT NULL DEFAULT '{}',
  "lastIntent"        TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_user_memories_userId_key"
  ON "ai_user_memories" ("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_user_memories_userId_fkey'
  ) THEN
    ALTER TABLE "ai_user_memories"
      ADD CONSTRAINT "ai_user_memories_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Memoria del PROVEEDOR (1 fila por proveedor) ──────────────
CREATE TABLE IF NOT EXISTS "ai_provider_memories" (
  "id"              SERIAL       PRIMARY KEY,
  "providerId"      INTEGER      NOT NULL,
  "mainCategories"  TEXT[]       NOT NULL DEFAULT '{}',
  "metricsSnapshot" JSONB,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_provider_memories_providerId_key"
  ON "ai_provider_memories" ("providerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_provider_memories_providerId_fkey'
  ) THEN
    ALTER TABLE "ai_provider_memories"
      ADD CONSTRAINT "ai_provider_memories_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "providers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
