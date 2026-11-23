-- Milestone 3.5 (profile page): a short plain-text bio and the
-- "show my name in collective totals" choice, default anonymous.
-- Add-only: the previous deployment never reads these columns.
-- In a transaction with IF NOT EXISTS, so a failed or retried deploy can't
-- leave it half applied (Prisma 7 doesn't roll back a failed migration).
BEGIN;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "showNameInTotals" BOOLEAN NOT NULL DEFAULT false;

COMMIT;
