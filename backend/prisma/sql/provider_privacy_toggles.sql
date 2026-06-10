-- Toggles de privacidad del proveedor (independientes del plan).
-- Idempotente y NO destructivo: default true → proveedores existentes intactos.
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "showPhone"         BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "showWhatsapp"      BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "showExactLocation" BOOLEAN NOT NULL DEFAULT true;
