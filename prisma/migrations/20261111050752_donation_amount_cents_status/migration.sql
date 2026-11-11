-- Money as integer cents, plus status / currency / partner reference (D-004).
-- ADD step of an add-then-remove change: everything here is additive, so the
-- previous deployment (which only knows "amount") keeps working while and
-- after this runs. A follow-up migration makes "amountCents" required and
-- drops the legacy "amount" float.

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "amountCents" INTEGER,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "status" "DonationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Donation_externalId_key" ON "Donation"("externalId");

-- Backfill cents from the legacy dollar float. Casting to numeric first makes
-- the multiplication exact (1.13 -> 113, not 112). Rows with impossible legacy
-- values (negative, NaN, or too large for an integer) are left NULL on
-- purpose so a bad old row can't fail the production deploy; the follow-up
-- migration deals with them explicitly. All existing donations stay PENDING:
-- no payment was ever taken for them.
UPDATE "Donation"
SET "amountCents" = ROUND("amount"::numeric * 100)::integer
WHERE "amountCents" IS NULL
  AND "amount" >= 0
  AND "amount" <= 21474836.47;
