-- UI pass PR 5: a note with each verification (what the admin checked).
-- Additive and nullable: organizations verified before this keep NULL
-- ("verified before notes existed"). Production had 25 organizations,
-- 2 verified, no existing column (owner's read-only query, 2026-11-13).
--
-- One transaction; IF NOT EXISTS so a retry can finish a half-applied run.
BEGIN;

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "verificationNote" TEXT;

COMMIT;
