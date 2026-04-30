-- ─────────────────────────────────────────────────────────────
-- SISTEMA DE REFERIDOS Y MONEDAS
-- ─────────────────────────────────────────────────────────────

-- 1. Enums
CREATE TYPE "ReferralStatus"   AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- 2. Saldo de monedas en cada usuario
ALTER TABLE "users" ADD COLUMN "coins" INTEGER NOT NULL DEFAULT 0;

-- 3. Códigos de referido (1 por usuario)
CREATE TABLE "referral_codes" (
    "id"                SERIAL          NOT NULL,
    "userId"            INTEGER         NOT NULL,
    "code"              TEXT            NOT NULL,
    "totalInvites"      INTEGER         NOT NULL DEFAULT 0,
    "successfulInvites" INTEGER         NOT NULL DEFAULT 0,
    "createdAt"         TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "referral_codes_userId_key" ON "referral_codes"("userId");
CREATE UNIQUE INDEX "referral_codes_code_key"   ON "referral_codes"("code");
CREATE        INDEX "referral_codes_code_idx"   ON "referral_codes"("code");
ALTER TABLE "referral_codes"
  ADD CONSTRAINT "referral_codes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Relación inviter → invitado
CREATE TABLE "referrals" (
    "id"                  SERIAL                  NOT NULL,
    "inviterId"           INTEGER                 NOT NULL,
    "invitedUserId"       INTEGER                 NOT NULL,
    "invitedProviderId"   INTEGER,
    "status"              "ReferralStatus"        NOT NULL DEFAULT 'PENDING',
    "coinsAwarded"        INTEGER                 NOT NULL DEFAULT 0,
    "invitedCoinsAwarded" INTEGER                 NOT NULL DEFAULT 0,
    "createdAt"           TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt"          TIMESTAMP(3),
    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "referrals_invitedUserId_key"     ON "referrals"("invitedUserId");
CREATE UNIQUE INDEX "referrals_invitedProviderId_key" ON "referrals"("invitedProviderId");
CREATE        INDEX "referrals_inviterId_idx"         ON "referrals"("inviterId");
CREATE        INDEX "referrals_status_idx"            ON "referrals"("status");
ALTER TABLE "referrals"
  ADD CONSTRAINT "referrals_inviterId_fkey"
  FOREIGN KEY ("inviterId")     REFERENCES "users"("id")     ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "referrals_invitedUserId_fkey"
  FOREIGN KEY ("invitedUserId") REFERENCES "users"("id")     ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "referrals_invitedProviderId_fkey"
  FOREIGN KEY ("invitedProviderId") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Recompensas (servicios canjeables ofrecidos por proveedores, definidas por el admin)
CREATE TABLE "referral_rewards" (
    "id"          SERIAL        NOT NULL,
    "providerId"  INTEGER       NOT NULL,
    "title"       TEXT          NOT NULL,
    "description" TEXT          NOT NULL,
    "coinsCost"   INTEGER       NOT NULL,
    "isActive"    BOOLEAN       NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "referral_rewards_isActive_idx"   ON "referral_rewards"("isActive");
CREATE INDEX "referral_rewards_providerId_idx" ON "referral_rewards"("providerId");
ALTER TABLE "referral_rewards"
  ADD CONSTRAINT "referral_rewards_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Canjes de monedas (planes o recompensas)
CREATE TABLE "coin_redemptions" (
    "id"          SERIAL              NOT NULL,
    "userId"      INTEGER             NOT NULL,
    "rewardId"    INTEGER,
    "plan"        TEXT,
    "coinsSpent"  INTEGER             NOT NULL,
    "status"      "RedemptionStatus"  NOT NULL DEFAULT 'PENDING',
    "createdAt"   TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coin_redemptions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "coin_redemptions_userId_idx" ON "coin_redemptions"("userId");
CREATE INDEX "coin_redemptions_status_idx" ON "coin_redemptions"("status");
ALTER TABLE "coin_redemptions"
  ADD CONSTRAINT "coin_redemptions_userId_fkey"
  FOREIGN KEY ("userId")   REFERENCES "users"("id")             ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "coin_redemptions_rewardId_fkey"
  FOREIGN KEY ("rewardId") REFERENCES "referral_rewards"("id")  ON DELETE SET NULL ON UPDATE CASCADE;
