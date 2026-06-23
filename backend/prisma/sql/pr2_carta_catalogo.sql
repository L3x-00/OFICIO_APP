-- ============================================================================
-- PR2 — Carta Digital (menu_items) + Catálogo de Productos (catalog_products)
-- ----------------------------------------------------------------------------
-- ADITIVO e IDEMPOTENTE: solo crea tablas/índices/FKs nuevos. No toca datos
-- existentes. Seguro para Supabase prod. Los features ya se asignaron en PR1.
-- ============================================================================

-- 1) Carta Digital -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "menu_items" (
  "id"          SERIAL NOT NULL,
  "providerId"  INTEGER NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "price"       DOUBLE PRECISION NOT NULL,
  "offerPrice"  DOUBLE PRECISION,
  "category"    TEXT,
  "photoUrl"    TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "isFeatured"  BOOLEAN NOT NULL DEFAULT false,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "menu_items_providerId_idx" ON "menu_items"("providerId");

-- 2) Catálogo de Productos ---------------------------------------------------
CREATE TABLE IF NOT EXISTS "catalog_products" (
  "id"          SERIAL NOT NULL,
  "providerId"  INTEGER NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "price"       DOUBLE PRECISION NOT NULL,
  "offerPrice"  DOUBLE PRECISION,
  "stock"       INTEGER,
  "category"    TEXT,
  "photoUrl"    TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "catalog_products_providerId_idx" ON "catalog_products"("providerId");

-- 3) FKs (idempotentes vía DO block) -----------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'menu_items_providerId_fkey') THEN
    ALTER TABLE "menu_items"
      ADD CONSTRAINT "menu_items_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "providers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'catalog_products_providerId_fkey') THEN
    ALTER TABLE "catalog_products"
      ADD CONSTRAINT "catalog_products_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "providers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
