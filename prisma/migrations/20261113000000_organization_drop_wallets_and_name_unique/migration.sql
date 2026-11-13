-- Milestone 2 remove step, part 2 (plan PR 9).
-- Drops the unused crypto wallet columns (D-000: no wallets) and the unique
-- constraint on Organization.name (the EIN is the identity).
--
-- Safe while the previous deployment is live ONLY if it already has the
-- global Prisma `omit` for the wallet columns (remove step, part 1), so it
-- never asks for them. Dropping a unique index breaks no query.
--
-- One transaction: Prisma does not roll back a half-applied migration.
-- IF EXISTS: a retry after a partial manual fix still completes.
BEGIN;

DROP INDEX IF EXISTS "Organization_name_key";

ALTER TABLE "Organization"
  DROP COLUMN IF EXISTS "cryptoWalletBTC",
  DROP COLUMN IF EXISTS "cryptoWalletETH";

COMMIT;
