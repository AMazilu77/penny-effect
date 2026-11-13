-- Milestone 3 groundwork: Every.org Donate Link checkout (M3-PLAN PR 1-2).
-- Additive and nullable; existing donations keep NULL. The unique index
-- allows many NULLs in Postgres.
-- One transaction; IF NOT EXISTS so a retry can finish a half-applied run.
BEGIN;

ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "checkoutToken" TEXT;
ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "checkoutEin" TEXT;
ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "checkoutSlug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Donation_checkoutToken_key" ON "Donation"("checkoutToken");

COMMIT;
