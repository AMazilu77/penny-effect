-- Charity Navigator rating per organization (D-016). Additive and nullable.
-- One transaction; IF NOT EXISTS (and a guarded CREATE TYPE) so a retry can
-- finish a half-applied run.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RatingSource') THEN
    CREATE TYPE "RatingSource" AS ENUM ('API', 'MANUAL');
  END IF;
END $$;

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "cnScore" INTEGER;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "cnStars" INTEGER;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "cnProfileUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "cnCheckedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "cnSource" "RatingSource";

COMMIT;
