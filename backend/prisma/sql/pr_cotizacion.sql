-- ============================================================================
-- Cotización — tabla quotation_requests
-- ----------------------------------------------------------------------------
-- ADITIVO e IDEMPOTENTE: solo crea la tabla + índices + FKs. No toca datos
-- existentes. Seguro para Supabase prod. Los features ya se asignaron antes.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "quotation_requests" (
  "id"             SERIAL NOT NULL,
  "providerId"     INTEGER NOT NULL,
  "userId"         INTEGER NOT NULL,
  "description"    TEXT NOT NULL,
  "photoUrl"       TEXT,
  "status"         TEXT NOT NULL DEFAULT 'PENDIENTE',
  "response"       TEXT,
  "estimatedPrice" DOUBLE PRECISION,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quotation_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "quotation_requests_providerId_status_idx"
  ON "quotation_requests"("providerId", "status");
CREATE INDEX IF NOT EXISTS "quotation_requests_userId_idx"
  ON "quotation_requests"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotation_requests_providerId_fkey') THEN
    ALTER TABLE "quotation_requests"
      ADD CONSTRAINT "quotation_requests_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "providers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotation_requests_userId_fkey') THEN
    ALTER TABLE "quotation_requests"
      ADD CONSTRAINT "quotation_requests_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
