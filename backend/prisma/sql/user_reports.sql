-- Reportes de comportamiento usuario→usuario (FASE 1.3). Idempotente.
-- Aplicar a PROD con el pooler de sesión (5432, ?sslmode=require) ANTES de desplegar.
DO $$ BEGIN
  CREATE TYPE "UserReportReason" AS ENUM ('SPAM','SCAM','HARASSMENT','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "UserReportStatus" AS ENUM ('PENDING','REVIEWED','DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "user_reports" (
  "id"             SERIAL PRIMARY KEY,
  "reporterId"     INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reportedUserId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reason"         "UserReportReason" NOT NULL,
  "description"    TEXT,
  "status"         "UserReportStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "user_reports_status_createdAt_idx" ON "user_reports" ("status","createdAt");
CREATE INDEX IF NOT EXISTS "user_reports_reportedUserId_idx" ON "user_reports" ("reportedUserId");
