-- Milestone 3.5 (account deletion): when a user deletes their account, their
-- donations stay for accounting but are anonymized. `Donation.userId` becomes
-- nullable and is set to NULL when the user row is deleted (it was ON DELETE
-- RESTRICT, which made deleting a donor impossible). `userDeletedAt` records
-- when that happened.
--
-- Safe while the previous deployment is still live: no data changes, no
-- column is renamed or retyped, and only code from this release ever deletes
-- a user (so NULL donors appear only after it's deployed). Existing rows
-- already satisfy the foreign key, so re-adding it can't fail on data.
-- In a transaction with IF [NOT] EXISTS, so a retry can finish a
-- half-applied database (Prisma 7 doesn't roll back a failed migration).
BEGIN;

ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "userDeletedAt" TIMESTAMP(3);
ALTER TABLE "Donation" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Donation" DROP CONSTRAINT IF EXISTS "Donation_userId_fkey";
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
