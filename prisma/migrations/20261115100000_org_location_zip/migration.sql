-- Organization ZIP from Every.org's address (city/state columns already exist).
-- Additive only: one nullable column. The previous deployment never reads it.
-- One transaction; IF NOT EXISTS so a retry can finish a half-applied run.
-- No backfill here: the next weekly refresh (or an admin "Refresh from
-- Every.org") fills city, state and ZIP for linked organizations.
BEGIN;

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "locationZip" TEXT;

COMMIT;
