-- CreateEnum
CREATE TYPE "LocalitySource" AS ENUM ('SEED', 'USER', 'ADMIN');

-- AlterTable
ALTER TABLE "localities"
  ADD COLUMN "source" "LocalitySource" NOT NULL DEFAULT 'SEED';

-- CreateIndex
CREATE INDEX "localities_source_idx" ON "localities"("source");

-- CreateIndex (unique)
-- Idempotencia a nivel de BD: una sola fila por combinación (dept, prov, dist).
-- En Postgres los NULL no se consideran iguales entre sí, por lo que múltiples
-- entries con `province IS NULL AND district IS NULL` pueden coexistir; eso es
-- aceptable para datos seed legacy. El endpoint de suggest siempre manda los 3.
CREATE UNIQUE INDEX "localities_dept_prov_dist_unique"
  ON "localities"("department", "province", "district");
