-- FASE 1 / PASO 2 DE 2
-- Ejecutar solamente después de que el archivo 01 haya terminado y su
-- transacción se haya confirmado. Aditivo e idempotente: no mueve ni borra
-- proveedores, fotos, reseñas, pagos, chats, cobertura ni categorías activas.

DO $$
BEGIN
  CREATE TYPE "ProfessionalMigrationStatus"
    AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "professional_profiles" (
  "id" SERIAL PRIMARY KEY,
  "providerId" INTEGER NOT NULL,
  "specialty" TEXT NOT NULL,
  "institution" TEXT,
  "yearsExperience" INTEGER,
  "professionalTitle" TEXT,
  "registrationNumber" TEXT,
  "registrationIssuer" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "professional_profiles_providerId_key"
  ON "professional_profiles" ("providerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'professional_profiles_providerId_fkey'
  ) THEN
    ALTER TABLE "professional_profiles"
      ADD CONSTRAINT "professional_profiles_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "providers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "professional_migration_requests" (
  "id" SERIAL PRIMARY KEY,
  "providerId" INTEGER NOT NULL,
  "status" "ProfessionalMigrationStatus" NOT NULL DEFAULT 'PENDING',
  "specialty" TEXT NOT NULL,
  "institution" TEXT,
  "yearsExperience" INTEGER,
  "professionalTitle" TEXT,
  "registrationNumber" TEXT,
  "registrationIssuer" TEXT,
  "requestedCategories" JSONB NOT NULL,
  "previousCategories" JSONB NOT NULL,
  "rejectionReason" TEXT,
  "reviewedByAdminId" INTEGER,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "professional_migration_requests_providerId_idx"
  ON "professional_migration_requests" ("providerId");

CREATE INDEX IF NOT EXISTS "professional_migration_requests_status_createdAt_idx"
  ON "professional_migration_requests" ("status", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "professional_migration_requests_one_pending_provider_key"
  ON "professional_migration_requests" ("providerId")
  WHERE "status" = 'PENDING'::"ProfessionalMigrationStatus";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'professional_migration_requests_providerId_fkey'
  ) THEN
    ALTER TABLE "professional_migration_requests"
      ADD CONSTRAINT "professional_migration_requests_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "providers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "verification_docs"
  ADD COLUMN IF NOT EXISTS "professionalMigrationRequestId" INTEGER;

CREATE INDEX IF NOT EXISTS "verification_docs_professionalMigrationRequestId_idx"
  ON "verification_docs" ("professionalMigrationRequestId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'verification_docs_professionalMigrationRequestId_fkey'
  ) THEN
    ALTER TABLE "verification_docs"
      ADD CONSTRAINT "verification_docs_professionalMigrationRequestId_fkey"
      FOREIGN KEY ("professionalMigrationRequestId")
      REFERENCES "professional_migration_requests"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "providers_one_individual_provider_per_user_key"
  ON "providers" ("userId")
  WHERE "type" IN ('OFICIO', 'PROFESIONAL');
