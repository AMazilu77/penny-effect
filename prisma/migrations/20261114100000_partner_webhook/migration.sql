-- Milestone 3 PR 3: Every.org partner webhook (M3-PLAN §2, D-014 update).
-- Additive only: two new enum values, three nullable Donation columns and a
-- new PartnerEvent table. Existing rows are untouched; the previous
-- deployment never reads the new values (no row has them until the webhook,
-- which is behind the checkout flag, runs).
-- One transaction; IF NOT EXISTS so a retry can finish a half-applied run.
-- (Postgres 12+ allows ALTER TYPE ... ADD VALUE inside a transaction as long
-- as the new value isn't used in the same transaction; it isn't.)
BEGIN;

ALTER TYPE "DonationStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE "DonationStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';

ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "netAmountCents" INTEGER;
ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;

DO $$ BEGIN
  CREATE TYPE "PartnerEventKind" AS ENUM ('DONATION', 'REFUND', 'DISPUTE', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerEventStatus" AS ENUM ('APPLIED', 'DUPLICATE', 'REJECTED', 'IGNORED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PartnerEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'EVERYORG',
    "kind" "PartnerEventKind" NOT NULL,
    "status" "PartnerEventStatus" NOT NULL,
    "reason" TEXT,
    "chargeId" TEXT,
    "partnerDonationId" TEXT,
    "donationId" TEXT,
    "payload" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerEvent_provider_kind_chargeId_key" ON "PartnerEvent"("provider", "kind", "chargeId");
CREATE INDEX IF NOT EXISTS "PartnerEvent_status_receivedAt_idx" ON "PartnerEvent"("status", "receivedAt");
CREATE INDEX IF NOT EXISTS "PartnerEvent_donationId_idx" ON "PartnerEvent"("donationId");

COMMIT;
