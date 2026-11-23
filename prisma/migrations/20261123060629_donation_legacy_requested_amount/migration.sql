-- Milestone 3 (real giving with Every.org). Additive only: safe while the
-- previous deployment is still serving (it doesn't know these columns).
-- One transaction, and IF NOT EXISTS, so a failed or retried run can't leave
-- the database half migrated (Prisma 7 doesn't roll back on its own).
BEGIN;

-- 1. Legacy rows. Every donation recorded before this migration is from
--    before real payments: checkout has never been enabled on production,
--    so none of them was ever paid. Production had 19 such rows when this was
--    written (owner's count). They stay in history, labelled, but no total
--    counts them, whatever their status (src/lib/gift-state.ts).
ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "legacy" BOOLEAN NOT NULL DEFAULT false;

-- A row that went through Every.org checkout (checkoutToken) or was matched
-- to an Every.org charge (externalId) is not legacy; on production there are
-- none. Rows inserted later, by either deployment, keep the default false.
UPDATE "Donation"
SET "legacy" = true
WHERE "legacy" = false
  AND "checkoutToken" IS NULL
  AND "externalId" IS NULL;

-- 2. The amount the donor chose on our site, frozen when checkout starts.
--    Every.org may confirm a different amount (the donor can change it on
--    their page); "amountCents" then holds what Every.org reported.
ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "requestedAmountCents" INTEGER;

COMMIT;
