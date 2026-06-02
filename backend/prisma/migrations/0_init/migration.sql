-- ════════════════════════════════════════════════════════════════════
-- 0_init — REBASELINE DEFINITIVO (A4)
-- Esquema completo generado desde schema.prisma (prisma migrate diff)
-- + objetos que Prisma NO genera y que el estado real de producción tiene:
-- extensiones, columnas GENERATED (PostGIS geog / FTS tsvector / _norm),
-- índice único funcional (unaccent), materialized view y triggers.
--
-- NOTA: `prisma migrate diff --exit-code` contra schema.prisma reporta
-- "drift" cosmético porque el schema usa aproximaciones Unsupported/plain
-- para las columnas GENERATED y no puede expresar el índice funcional ni la
-- materialized view. Es esperado: este baseline es FIEL a producción.
-- ════════════════════════════════════════════════════════════════════

-- ── Extensiones (Prisma no las emite) ──────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ── Wrapper IMMUTABLE de unaccent (requerido por columnas/índices de localities) ──
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
RETURN public.unaccent($1);

-- ════════════════════════════════════════════════════════════════════
-- ESQUEMA BASE (prisma migrate diff --from-empty --to-schema)
-- ════════════════════════════════════════════════════════════════════
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USUARIO', 'PROVEEDOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('DISPONIBLE', 'OCUPADO', 'CON_DEMORA');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('GRATIS', 'ESTANDAR', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVA', 'VENCIDA', 'CANCELADA', 'GRACIA');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('OFICIO', 'NEGOCIO');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('OPEN', 'CLOSED', 'EXPIRED', 'CANCELLED', 'AWARDED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "YapePaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TrustStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LocalitySource" AS ENUM ('SEED', 'USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PlanRequestStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('INFORMACION_FALSA', 'COMPORTAMIENTO', 'FRAUDE', 'FOTO_INAPROPIADA', 'NO_PRESTO', 'OTRO');

-- CreateEnum
CREATE TYPE "AnalyticEvent" AS ENUM ('whatsapp_click', 'call_click', 'view', 'profile_view', 'favorite_add');

-- CreateEnum
CREATE TYPE "VerificationDocType" AS ENUM ('dni', 'antecedentes', 'certificado');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('yape', 'bcp_deposito', 'mercadopago');

-- CreateEnum
CREATE TYPE "OfferReportReason" AS ENUM ('SPAM', 'PRECIO_FALSO', 'CONTENIDO_INAPROPIADO', 'OTRO');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USUARIO',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "department" TEXT,
    "province" TEXT,
    "district" TEXT,
    "firebaseUid" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "fcmToken" TEXT,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "hasUsedTrial" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "lastIp" TEXT,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Perú',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "district" TEXT,
    "province" TEXT,
    "source" "LocalitySource" NOT NULL DEFAULT 'SEED',
    "department_norm" TEXT,
    "province_norm" TEXT,
    "district_norm" TEXT,

    CONSTRAINT "localities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "iconUrl" TEXT,
    "parentId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "forType" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_categories" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "provider_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "ProviderType" NOT NULL DEFAULT 'OFICIO',
    "businessName" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "scheduleJson" JSONB,
    "availability" "AvailabilityStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDIENTE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "hasCleanRecord" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "localityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dni" TEXT,
    "hasDelivery" BOOLEAN NOT NULL DEFAULT false,
    "hasHomeService" BOOLEAN NOT NULL DEFAULT false,
    "isTrusted" BOOLEAN NOT NULL DEFAULT false,
    "nombreComercial" TEXT,
    "planPriority" INTEGER NOT NULL DEFAULT 4,
    "plenaCoordinacion" BOOLEAN NOT NULL DEFAULT false,
    "razonSocial" TEXT,
    "ruc" TEXT,
    "totalRecommendations" INTEGER NOT NULL DEFAULT 0,
    "trustStatus" "TrustStatus" NOT NULL DEFAULT 'NONE',
    "facebook" TEXT,
    "instagram" TEXT,
    "linkedin" TEXT,
    "telegram" TEXT,
    "tiktok" TEXT,
    "twitterX" TEXT,
    "website" TEXT,
    "whatsappBiz" TEXT,
    "slug" TEXT,
    "slugEditedAt" TIMESTAMP(3),
    "location_geog" geography,
    "search_tsv" tsvector,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_images" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'GRATIS',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'GRACIA',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "graceMonths" INTEGER NOT NULL DEFAULT 2,
    "priceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_audit_log" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "oldStatus" "SubscriptionStatus" NOT NULL,
    "newStatus" "SubscriptionStatus" NOT NULL,
    "oldPlan" "SubscriptionPlan" NOT NULL,
    "newPlan" "SubscriptionPlan" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" INTEGER,

    CONSTRAINT "subscription_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_requests" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "PlanRequestStatus" NOT NULL DEFAULT 'PENDIENTE',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "photoUrl" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "verificationMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_replies" (
    "id" SERIAL NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_docs" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "docType" "VerificationDocType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDIENTE',
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "verification_docs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_analytics" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "eventType" "AnalyticEvent" NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetProfileType" TEXT,
    "targetUserId" INTEGER,
    "title" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_reports" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_issues" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_validation_requests" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "status" "TrustStatus" NOT NULL DEFAULT 'PENDING',
    "dniNumber" TEXT,
    "dniFirstName" TEXT,
    "dniLastName" TEXT,
    "dniAddress" TEXT,
    "dniPhotoFrontUrl" TEXT,
    "dniPhotoBackUrl" TEXT,
    "selfieWithDniUrl" TEXT,
    "rucNumber" TEXT,
    "businessAddress" TEXT,
    "businessPhotoUrl" TEXT,
    "ownerDniPhotoUrl" TEXT,
    "rejectionReason" TEXT,
    "reviewedByAdminId" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessPhoto2Url" TEXT,

    CONSTRAINT "trust_validation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrl" TEXT,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "desiredDate" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "department" TEXT,
    "province" TEXT,
    "district" TEXT,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'OPEN',
    "maxOffers" INTEGER NOT NULL DEFAULT 5,
    "notifyRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "location_geog" geography,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" SERIAL NOT NULL,
    "serviceRequestId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "arrivedAt" TIMESTAMP(3),
    "arrivedLat" DOUBLE PRECISION,
    "arrivedLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yape_payments" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "voucherUrl" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "note" TEXT,
    "status" "YapePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedByAdminId" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yape_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_penalties" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "noPickCount" INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "totalInvites" INTEGER NOT NULL DEFAULT 0,
    "successfulInvites" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" SERIAL NOT NULL,
    "inviterId" INTEGER NOT NULL,
    "invitedUserId" INTEGER NOT NULL,
    "invitedProviderId" INTEGER,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "coinsAwarded" INTEGER NOT NULL DEFAULT 0,
    "invitedCoinsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_rewards" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coinsCost" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_redemptions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "rewardId" INTEGER,
    "plan" "SubscriptionPlan",
    "coinsSpent" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" SERIAL NOT NULL,
    "chatRoomId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_posts" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_post_categories" (
    "id" SERIAL NOT NULL,
    "offerPostId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "offer_post_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_reports" (
    "id" SERIAL NOT NULL,
    "offerPostId" INTEGER NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "reason" "OfferReportReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "offer_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_knowledge_entries" (
    "id" SERIAL NOT NULL,
    "topic" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_knowledge_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "responseTimeMs" INTEGER,
    "tokensUsed" INTEGER,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "moderationPass" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_firebaseUid_key" ON "users"("firebaseUid");

-- CreateIndex
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");

-- CreateIndex
CREATE INDEX "users_department_province_idx" ON "users"("department", "province");

-- CreateIndex
CREATE INDEX "otp_codes_userId_idx" ON "otp_codes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "localities_department_province_district_idx" ON "localities"("department", "province", "district");

-- CreateIndex
CREATE INDEX "localities_source_idx" ON "localities"("source");

-- CreateIndex
CREATE INDEX "localities_norm_active_idx" ON "localities"("department_norm", "province_norm", "district_norm") WHERE ("isActive" = true);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "provider_categories_providerId_idx" ON "provider_categories"("providerId");

-- CreateIndex
CREATE INDEX "provider_categories_categoryId_idx" ON "provider_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_categories_providerId_categoryId_key" ON "provider_categories"("providerId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "providers_slug_key" ON "providers"("slug");

-- CreateIndex
CREATE INDEX "providers_isVisible_verificationStatus_idx" ON "providers"("isVisible", "verificationStatus");

-- CreateIndex
CREATE INDEX "providers_isVisible_verificationStatus_averageRating_idx" ON "providers"("isVisible", "verificationStatus", "averageRating");

-- CreateIndex
CREATE INDEX "providers_isVisible_verificationStatus_localityId_idx" ON "providers"("isVisible", "verificationStatus", "localityId");

-- CreateIndex
CREATE INDEX "providers_type_idx" ON "providers"("type");

-- CreateIndex
CREATE INDEX "providers_localityId_idx" ON "providers"("localityId");

-- CreateIndex
CREATE INDEX "providers_businessname_trgm" ON "providers" USING GIN ("businessName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "providers_description_trgm" ON "providers" USING GIN ("description" gin_trgm_ops) WHERE (description IS NOT NULL);

-- CreateIndex
CREATE INDEX "providers_location_geog_gist" ON "providers" USING GIST ("location_geog") WHERE (location_geog IS NOT NULL);

-- CreateIndex
CREATE INDEX "providers_search_tsv_gin" ON "providers" USING GIN ("search_tsv");

-- CreateIndex
CREATE UNIQUE INDEX "providers_userId_type_key" ON "providers"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_providerId_key" ON "subscriptions"("providerId");

-- CreateIndex
CREATE INDEX "subscription_audit_log_subscriptionId_changedAt_idx" ON "subscription_audit_log"("subscriptionId", "changedAt");

-- CreateIndex
CREATE INDEX "plan_requests_providerId_idx" ON "plan_requests"("providerId");

-- CreateIndex
CREATE INDEX "plan_requests_status_idx" ON "plan_requests"("status");

-- CreateIndex
CREATE INDEX "plan_requests_providerId_status_idx" ON "plan_requests"("providerId", "status");

-- CreateIndex
CREATE INDEX "reviews_providerId_isVisible_idx" ON "reviews"("providerId", "isVisible");

-- CreateIndex
CREATE INDEX "review_replies_reviewId_idx" ON "review_replies"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_providerId_key" ON "favorites"("userId", "providerId");

-- CreateIndex
CREATE INDEX "provider_analytics_providerId_eventType_idx" ON "provider_analytics"("providerId", "eventType");

-- CreateIndex
CREATE INDEX "provider_analytics_providerId_eventType_createdAt_idx" ON "provider_analytics"("providerId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "provider_analytics_createdAt_idx" ON "provider_analytics"("createdAt");

-- CreateIndex
CREATE INDEX "admin_notifications_providerId_isRead_idx" ON "admin_notifications"("providerId", "isRead");

-- CreateIndex
CREATE INDEX "admin_notifications_targetUserId_idx" ON "admin_notifications"("targetUserId");

-- CreateIndex
CREATE INDEX "recommendations_providerId_idx" ON "recommendations"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_userId_providerId_key" ON "recommendations"("userId", "providerId");

-- CreateIndex
CREATE INDEX "provider_reports_providerId_idx" ON "provider_reports"("providerId");

-- CreateIndex
CREATE INDEX "provider_reports_isReviewed_idx" ON "provider_reports"("isReviewed");

-- CreateIndex
CREATE UNIQUE INDEX "provider_reports_userId_providerId_key" ON "provider_reports"("userId", "providerId");

-- CreateIndex
CREATE INDEX "platform_issues_isReviewed_idx" ON "platform_issues"("isReviewed");

-- CreateIndex
CREATE INDEX "trust_validation_requests_status_idx" ON "trust_validation_requests"("status");

-- CreateIndex
CREATE INDEX "trust_validation_requests_providerId_idx" ON "trust_validation_requests"("providerId");

-- CreateIndex
CREATE INDEX "service_requests_userId_idx" ON "service_requests"("userId");

-- CreateIndex
CREATE INDEX "service_requests_userId_status_idx" ON "service_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "service_requests_status_idx" ON "service_requests"("status");

-- CreateIndex
CREATE INDEX "service_requests_categoryId_idx" ON "service_requests"("categoryId");

-- CreateIndex
CREATE INDEX "service_requests_status_categoryId_expiresAt_idx" ON "service_requests"("status", "categoryId", "expiresAt");

-- CreateIndex
CREATE INDEX "service_requests_status_expiresAt_idx" ON "service_requests"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "service_requests_location_geog_gist" ON "service_requests" USING GIST ("location_geog") WHERE (location_geog IS NOT NULL);

-- CreateIndex
CREATE INDEX "offers_serviceRequestId_idx" ON "offers"("serviceRequestId");

-- CreateIndex
CREATE INDEX "offers_providerId_idx" ON "offers"("providerId");

-- CreateIndex
CREATE INDEX "offers_serviceRequestId_status_idx" ON "offers"("serviceRequestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "offers_serviceRequestId_providerId_key" ON "offers"("serviceRequestId", "providerId");

-- CreateIndex
CREATE INDEX "yape_payments_providerId_idx" ON "yape_payments"("providerId");

-- CreateIndex
CREATE INDEX "yape_payments_status_idx" ON "yape_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_penalties_userId_key" ON "user_penalties"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_userId_key" ON "referral_codes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referral_codes_code_idx" ON "referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_invitedUserId_key" ON "referrals"("invitedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_invitedProviderId_key" ON "referrals"("invitedProviderId");

-- CreateIndex
CREATE INDEX "referrals_inviterId_idx" ON "referrals"("inviterId");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "referral_rewards_isActive_idx" ON "referral_rewards"("isActive");

-- CreateIndex
CREATE INDEX "referral_rewards_providerId_idx" ON "referral_rewards"("providerId");

-- CreateIndex
CREATE INDEX "coin_redemptions_userId_idx" ON "coin_redemptions"("userId");

-- CreateIndex
CREATE INDEX "coin_redemptions_status_idx" ON "coin_redemptions"("status");

-- CreateIndex
CREATE INDEX "chat_rooms_clientId_providerId_idx" ON "chat_rooms"("clientId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_clientId_providerId_key" ON "chat_rooms"("clientId", "providerId");

-- CreateIndex
CREATE INDEX "chat_messages_chatRoomId_createdAt_idx" ON "chat_messages"("chatRoomId", "createdAt");

-- CreateIndex
CREATE INDEX "offer_posts_providerId_isActive_idx" ON "offer_posts"("providerId", "isActive");

-- CreateIndex
CREATE INDEX "offer_posts_isActive_expiresAt_idx" ON "offer_posts"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "offer_post_categories_offerPostId_idx" ON "offer_post_categories"("offerPostId");

-- CreateIndex
CREATE INDEX "offer_post_categories_categoryId_idx" ON "offer_post_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "offer_post_categories_offerPostId_categoryId_key" ON "offer_post_categories"("offerPostId", "categoryId");

-- CreateIndex
CREATE INDEX "offer_reports_offerPostId_idx" ON "offer_reports"("offerPostId");

-- CreateIndex
CREATE INDEX "offer_reports_isResolved_idx" ON "offer_reports"("isResolved");

-- CreateIndex
CREATE UNIQUE INDEX "offer_reports_offerPostId_reporterId_key" ON "offer_reports"("offerPostId", "reporterId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_knowledge_entries_topic_key" ON "ai_knowledge_entries"("topic");

-- CreateIndex
CREATE INDEX "ai_knowledge_entries_isActive_idx" ON "ai_knowledge_entries"("isActive");

-- CreateIndex
CREATE INDEX "ai_conversations_userId_idx" ON "ai_conversations"("userId");

-- CreateIndex
CREATE INDEX "ai_conversations_createdAt_idx" ON "ai_conversations"("createdAt");

-- CreateIndex
CREATE INDEX "ai_messages_conversationId_createdAt_idx" ON "ai_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_messages_createdAt_idx" ON "ai_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_categories" ADD CONSTRAINT "provider_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_categories" ADD CONSTRAINT "provider_categories_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "localities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_images" ADD CONSTRAINT "provider_images_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_audit_log" ADD CONSTRAINT "subscription_audit_log_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_requests" ADD CONSTRAINT "plan_requests_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_docs" ADD CONSTRAINT "verification_docs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_analytics" ADD CONSTRAINT "provider_analytics_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_reports" ADD CONSTRAINT "provider_reports_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_reports" ADD CONSTRAINT "provider_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_issues" ADD CONSTRAINT "platform_issues_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_validation_requests" ADD CONSTRAINT "trust_validation_requests_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yape_payments" ADD CONSTRAINT "yape_payments_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_penalties" ADD CONSTRAINT "user_penalties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_invitedProviderId_fkey" FOREIGN KEY ("invitedProviderId") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_redemptions" ADD CONSTRAINT "coin_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "referral_rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_redemptions" ADD CONSTRAINT "coin_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_posts" ADD CONSTRAINT "offer_posts_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_post_categories" ADD CONSTRAINT "offer_post_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_post_categories" ADD CONSTRAINT "offer_post_categories_offerPostId_fkey" FOREIGN KEY ("offerPostId") REFERENCES "offer_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_reports" ADD CONSTRAINT "offer_reports_offerPostId_fkey" FOREIGN KEY ("offerPostId") REFERENCES "offer_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_reports" ADD CONSTRAINT "offer_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ════════════════════════════════════════════════════════════════════
-- POST-BASELINE — objetos no representables en schema.prisma
-- ════════════════════════════════════════════════════════════════════

-- ── Columnas GENERATED STORED (Prisma las emite planas; las recreamos) ──
-- providers.location_geog (PostGIS) + search_tsv (FTS)
ALTER TABLE "providers" DROP COLUMN "location_geog";
ALTER TABLE "providers" DROP COLUMN "search_tsv";
ALTER TABLE "providers"
  ADD COLUMN location_geog geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN latitude IS NOT NULL AND longitude IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      ELSE NULL
    END
  ) STORED;
CREATE INDEX "providers_location_geog_gist"
  ON "providers" USING GIST (location_geog)
  WHERE location_geog IS NOT NULL;
ALTER TABLE "providers"
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce("businessName", '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(description, '')),    'B')
  ) STORED;
CREATE INDEX "providers_search_tsv_gin"
  ON "providers" USING GIN (search_tsv);

-- service_requests.location_geog (PostGIS)
ALTER TABLE "service_requests" DROP COLUMN "location_geog";
ALTER TABLE "service_requests"
  ADD COLUMN location_geog geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN latitude IS NOT NULL AND longitude IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      ELSE NULL
    END
  ) STORED;
CREATE INDEX "service_requests_location_geog_gist"
  ON "service_requests" USING GIST (location_geog)
  WHERE location_geog IS NOT NULL;

-- localities._norm (usan immutable_unaccent)
ALTER TABLE "localities" DROP COLUMN "department_norm";
ALTER TABLE "localities" DROP COLUMN "province_norm";
ALTER TABLE "localities" DROP COLUMN "district_norm";
ALTER TABLE "localities"
  ADD COLUMN "department_norm" text
    GENERATED ALWAYS AS (lower(public.immutable_unaccent("department"))) STORED,
  ADD COLUMN "province_norm" text
    GENERATED ALWAYS AS (lower(public.immutable_unaccent(coalesce("province", '')))) STORED,
  ADD COLUMN "district_norm" text
    GENERATED ALWAYS AS (lower(public.immutable_unaccent(coalesce("district", '')))) STORED;
CREATE INDEX "localities_norm_active_idx"
  ON "localities" ("department_norm", "province_norm", "district_norm")
  WHERE "isActive" = true;

-- ── Índice único funcional: dedup de localidades insensible a mayúsculas/acentos ──
DROP INDEX IF EXISTS "localities_dept_prov_dist_unique";
CREATE UNIQUE INDEX "localities_dept_prov_dist_unaccent_unique"
  ON "localities" (
    lower(public.immutable_unaccent("department")),
    lower(public.immutable_unaccent(coalesce("province", ''))),
    lower(public.immutable_unaccent(coalesce("district", '')))
  );

-- ════════════════════════════════════════════════════════════════════
-- Materialized view admin_dashboard_stats + refresh
-- ════════════════════════════════════════════════════════════════════
CREATE MATERIALIZED VIEW admin_dashboard_stats AS
WITH provider_stats AS (
  SELECT
    count(*)                                                       AS total,
    count(*) FILTER (WHERE "verificationStatus" = 'PENDIENTE')     AS pending,
    count(*) FILTER (WHERE "verificationStatus" = 'APROBADO')      AS approved,
    count(*) FILTER (WHERE "verificationStatus" = 'RECHAZADO')     AS rejected,
    count(*) FILTER (WHERE "verificationStatus" = 'APROBADO'
                     AND type = 'OFICIO')                          AS approved_oficio,
    count(*) FILTER (WHERE "verificationStatus" = 'APROBADO'
                     AND type = 'NEGOCIO')                         AS approved_negocio
  FROM providers
),
yape_stats AS (
  SELECT
    count(*)                                          AS total,
    count(*) FILTER (WHERE status = 'PENDING')        AS pending,
    count(*) FILTER (WHERE status = 'APPROVED')       AS approved,
    count(*) FILTER (WHERE status = 'REJECTED')       AS rejected,
    COALESCE(SUM(amount) FILTER (WHERE status = 'APPROVED'), 0) AS approved_amount
  FROM yape_payments
),
request_stats AS (
  SELECT
    count(*)                                          AS total,
    count(*) FILTER (WHERE status = 'OPEN')           AS open,
    count(*) FILTER (WHERE status = 'CLOSED')         AS closed,
    count(*) FILTER (WHERE status = 'AWARDED')        AS awarded,
    count(*) FILTER (WHERE status = 'EXPIRED')        AS expired,
    count(*) FILTER (WHERE status = 'CANCELLED')      AS cancelled
  FROM service_requests
),
top_cats AS (
  SELECT json_agg(row_to_json(t)) AS cats
  FROM (
    SELECT c.id, c.name, c.slug, count(pc."providerId") AS provider_count
    FROM categories c
    JOIN provider_categories pc ON pc."categoryId" = c.id
    JOIN providers p ON p.id = pc."providerId"
                    AND p."verificationStatus" = 'APROBADO'
    GROUP BY c.id, c.name, c.slug
    ORDER BY provider_count DESC
    LIMIT 10
  ) t
)
SELECT
  (SELECT count(*) FROM users)                       AS total_users,
  (SELECT count(*) FROM users WHERE "isActive")      AS active_users,
  (SELECT count(*) FROM reviews WHERE "isVisible")   AS total_reviews,
  (SELECT COALESCE(SUM(coins), 0) FROM users)        AS coins_in_circulation,
  ps.total          AS providers_total,
  ps.pending        AS providers_pending,
  ps.approved       AS providers_approved,
  ps.rejected       AS providers_rejected,
  ps.approved_oficio,
  ps.approved_negocio,
  ys.total          AS yape_total,
  ys.pending        AS yape_pending,
  ys.approved       AS yape_approved,
  ys.rejected       AS yape_rejected,
  ys.approved_amount AS yape_approved_amount,
  rs.total          AS requests_total,
  rs.open           AS requests_open,
  rs.closed         AS requests_closed,
  rs.awarded        AS requests_awarded,
  rs.expired        AS requests_expired,
  rs.cancelled      AS requests_cancelled,
  tc.cats           AS top_categories,
  now()             AS refreshed_at
FROM provider_stats ps, yape_stats ys, request_stats rs, top_cats tc;

CREATE UNIQUE INDEX admin_dashboard_stats_pk
  ON admin_dashboard_stats ((1));

CREATE OR REPLACE FUNCTION refresh_admin_dashboard_stats()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_dashboard_stats;
END $$;

-- ════════════════════════════════════════════════════════════════════
-- Funciones + triggers de negocio
-- ════════════════════════════════════════════════════════════════════

-- Recálculo de rating/reviews/recomendaciones de un provider
CREATE OR REPLACE FUNCTION recompute_provider_stats(p_provider_id int)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_avg  numeric;
  v_revs int;
  v_recs int;
BEGIN
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
    INTO v_avg, v_revs
  FROM reviews
  WHERE "providerId" = p_provider_id AND "isVisible" = true;

  SELECT COUNT(*)
    INTO v_recs
  FROM recommendations
  WHERE "providerId" = p_provider_id;

  UPDATE providers
  SET "averageRating"        = ROUND(v_avg::numeric, 2),
      "totalReviews"         = v_revs,
      "totalRecommendations" = v_recs
  WHERE id = p_provider_id;
END $$;

CREATE OR REPLACE FUNCTION trg_reviews_recompute()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM recompute_provider_stats(NEW."providerId");
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM recompute_provider_stats(OLD."providerId");
  ELSE
    IF NEW."providerId" IS DISTINCT FROM OLD."providerId" THEN
      PERFORM recompute_provider_stats(OLD."providerId");
    END IF;
    PERFORM recompute_provider_stats(NEW."providerId");
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS reviews_recompute_trg ON reviews;
CREATE TRIGGER reviews_recompute_trg
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trg_reviews_recompute();

CREATE OR REPLACE FUNCTION trg_recommendations_recompute()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM recompute_provider_stats(NEW."providerId");
  ELSE
    PERFORM recompute_provider_stats(OLD."providerId");
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS recommendations_recompute_trg ON recommendations;
CREATE TRIGGER recommendations_recompute_trg
  AFTER INSERT OR DELETE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION trg_recommendations_recompute();

-- Auditoría de cambios de status/plan en subscriptions
CREATE OR REPLACE FUNCTION trg_subscriptions_audit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_user_id int;
BEGIN
  IF NEW.status = OLD.status AND NEW.plan = OLD.plan THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_user_id := current_setting('app.current_user_id', true)::int;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  INSERT INTO subscription_audit_log
    ("subscriptionId", "oldStatus", "newStatus", "oldPlan", "newPlan", "changedBy")
  VALUES
    (OLD.id, OLD.status, NEW.status, OLD.plan, NEW.plan, v_user_id);

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS subscriptions_audit_trg ON subscriptions;
CREATE TRIGGER subscriptions_audit_trg
  AFTER UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION trg_subscriptions_audit();

-- updated_at automático (defensa contra mutaciones bypass-Prisma)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END $$;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'providers',
    'users',
    'service_requests',
    'offers',
    'plan_requests',
    'yape_payments',
    'trust_validation_requests',
    'referral_rewards',
    'user_penalties',
    'subscriptions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at_trg ON %I', tbl);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at_trg
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_modified_column()',
      tbl
    );
  END LOOP;
END $$;

-- Pago de monedas al APROBAR un referral
CREATE OR REPLACE FUNCTION trg_referral_approved_award()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'APPROVED'
     AND (OLD.status IS NULL OR OLD.status <> 'APPROVED')
  THEN
    IF NEW."coinsAwarded" > 0 THEN
      UPDATE users
      SET coins = coins + NEW."coinsAwarded"
      WHERE id = NEW."inviterId";
    END IF;

    IF NEW."invitedCoinsAwarded" > 0 THEN
      UPDATE users
      SET coins = coins + NEW."invitedCoinsAwarded"
      WHERE id = NEW."invitedUserId";
    END IF;

    IF NEW."approvedAt" IS NULL THEN
      NEW."approvedAt" := CURRENT_TIMESTAMP;
    END IF;

    UPDATE referral_codes
    SET "successfulInvites" = "successfulInvites" + 1
    WHERE "userId" = NEW."inviterId";
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS referral_approved_award_trg ON referrals;
CREATE TRIGGER referral_approved_award_trg
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION trg_referral_approved_award();

-- Normalización de campos de localities (trim espacios)
CREATE OR REPLACE FUNCTION trim_locality_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."department" := regexp_replace(trim(NEW."department"), '\s+', ' ', 'g');
  IF NEW."province" IS NOT NULL THEN
    NEW."province" := regexp_replace(trim(NEW."province"), '\s+', ' ', 'g');
  END IF;
  IF NEW."district" IS NOT NULL THEN
    NEW."district" := regexp_replace(trim(NEW."district"), '\s+', ' ', 'g');
  END IF;
  IF NEW."name" IS NOT NULL THEN
    NEW."name" := regexp_replace(trim(NEW."name"), '\s+', ' ', 'g');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trim_locality_fields_trg ON "localities";
CREATE TRIGGER trim_locality_fields_trg
  BEFORE INSERT OR UPDATE ON "localities"
  FOR EACH ROW EXECUTE FUNCTION trim_locality_fields();
