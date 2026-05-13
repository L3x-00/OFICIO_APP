-- Migration: add_provider_categories_and_offer_posts
-- Replaces Provider.categoryId (single) with ProviderCategory join table (many-to-many)
-- Adds OfferPost, OfferPostCategory, OfferReport models

-- Step 1: Create ProviderCategory join table
CREATE TABLE "provider_categories" (
    "id"         SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    CONSTRAINT "provider_categories_pkey" PRIMARY KEY ("id")
);

-- Step 2: Migrate existing categoryId data into join table
INSERT INTO "provider_categories" ("providerId", "categoryId")
SELECT "id", "categoryId"
FROM "providers"
WHERE "categoryId" IS NOT NULL;

-- Step 3: Drop old categoryId column and its index
DROP INDEX IF EXISTS "providers_categoryId_idx";
ALTER TABLE "providers" DROP COLUMN IF EXISTS "categoryId";

-- Step 4: Add constraints and indexes on provider_categories
CREATE UNIQUE INDEX "provider_categories_providerId_categoryId_key" ON "provider_categories"("providerId", "categoryId");
CREATE INDEX "provider_categories_providerId_idx" ON "provider_categories"("providerId");
CREATE INDEX "provider_categories_categoryId_idx" ON "provider_categories"("categoryId");

ALTER TABLE "provider_categories" ADD CONSTRAINT "provider_categories_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_categories" ADD CONSTRAINT "provider_categories_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Create OfferPost table
CREATE TABLE "offer_posts" (
    "id"          SERIAL NOT NULL,
    "providerId"  INTEGER NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price"       DOUBLE PRECISION,
    "photoUrl"    TEXT,
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "offer_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "offer_posts_providerId_isActive_idx" ON "offer_posts"("providerId", "isActive");
CREATE INDEX "offer_posts_isActive_expiresAt_idx" ON "offer_posts"("isActive", "expiresAt");

ALTER TABLE "offer_posts" ADD CONSTRAINT "offer_posts_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Create OfferPostCategory join table
CREATE TABLE "offer_post_categories" (
    "id"          SERIAL NOT NULL,
    "offerPostId" INTEGER NOT NULL,
    "categoryId"  INTEGER NOT NULL,
    CONSTRAINT "offer_post_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "offer_post_categories_offerPostId_categoryId_key" ON "offer_post_categories"("offerPostId", "categoryId");
CREATE INDEX "offer_post_categories_offerPostId_idx" ON "offer_post_categories"("offerPostId");
CREATE INDEX "offer_post_categories_categoryId_idx" ON "offer_post_categories"("categoryId");

ALTER TABLE "offer_post_categories" ADD CONSTRAINT "offer_post_categories_offerPostId_fkey"
    FOREIGN KEY ("offerPostId") REFERENCES "offer_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offer_post_categories" ADD CONSTRAINT "offer_post_categories_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Create OfferReport table
CREATE TABLE "offer_reports" (
    "id"          SERIAL NOT NULL,
    "offerPostId" INTEGER NOT NULL,
    "reporterId"  INTEGER NOT NULL,
    "reason"      TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isResolved"  BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "offer_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "offer_reports_offerPostId_reporterId_key" ON "offer_reports"("offerPostId", "reporterId");
CREATE INDEX "offer_reports_offerPostId_idx" ON "offer_reports"("offerPostId");
CREATE INDEX "offer_reports_isResolved_idx" ON "offer_reports"("isResolved");

ALTER TABLE "offer_reports" ADD CONSTRAINT "offer_reports_offerPostId_fkey"
    FOREIGN KEY ("offerPostId") REFERENCES "offer_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offer_reports" ADD CONSTRAINT "offer_reports_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
