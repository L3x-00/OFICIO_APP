-- AlterEnum: add PROFESSIONAL and BUSINESS variants
ALTER TYPE "ProviderType" ADD VALUE 'PROFESSIONAL';
ALTER TYPE "ProviderType" ADD VALUE 'BUSINESS';

-- DropIndex: remove old single-provider-per-user constraint
DROP INDEX "providers_userId_key";

-- AlterTable: add dni and providerType columns
ALTER TABLE "providers"
  ADD COLUMN "dni" TEXT,
  ADD COLUMN "providerType" "ProviderType" NOT NULL DEFAULT 'PROFESSIONAL';

-- CreateIndex: one OFICIO + one NEGOCIO per user
CREATE UNIQUE INDEX "providers_userId_type_key" ON "providers"("userId", "type");
