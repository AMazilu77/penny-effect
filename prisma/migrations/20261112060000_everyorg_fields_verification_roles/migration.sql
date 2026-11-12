-- Milestone 2, schema ADD step (D-012, D-013). Purely additive: the previous
-- deployment keeps working while this runs (it never creates categories at
-- runtime, so the new required CauseCategory.slug can't break it).
--
-- REVISED after the first production attempt failed (2026-11-12): production
-- has legacy categories created by the pre-#14 onboarding code, named after
-- lowercase cause ids ("environment" next to the seeded "Environment"), so the
-- slug backfill produced duplicates and the unique index failed. Prisma 7 did
-- not roll the failed script back, leaving it half applied. This version:
--   * runs in one explicit transaction, so a failure leaves nothing behind;
--   * is idempotent (IF NOT EXISTS etc.), so it also completes a database
--     where the first attempt was half applied;
--   * gives duplicate slugs a unique suffix instead of failing.
-- Recovery on a database where the first attempt failed: mark it rolled back
-- (`prisma migrate resolve --rolled-back <this migration>`), then deploy.

BEGIN;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'HIDDEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: everyone starts as a regular user; the owner grants ADMIN by hand.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'USER';

-- AlterTable: Every.org identity and details, admin verification, visibility.
-- Existing organizations stay ACTIVE but are unverified (verifiedAt NULL), so
-- once the "users only see verified orgs" change lands they are hidden until
-- an admin links and verifies them.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "ein" TEXT,
ADD COLUMN IF NOT EXISTS "everyOrgId" TEXT,
ADD COLUMN IF NOT EXISTS "everyOrgSlug" TEXT,
ADD COLUMN IF NOT EXISTS "isDisbursable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "nteeCode" TEXT,
ADD COLUMN IF NOT EXISTS "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "verifiedById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_ein_key" ON "Organization"("ein");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_everyOrgId_key" ON "Organization"("everyOrgId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_everyOrgSlug_key" ON "Organization"("everyOrgSlug");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Organization" ADD CONSTRAINT "Organization_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CauseCategory.slug: add, backfill from the name ("Space & Science" ->
-- "space-science"), then require it.
ALTER TABLE "CauseCategory" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- When names collide ("Environment" and the legacy "environment"), the
-- seeded Title Case row keeps the plain slug (uppercase sorts first in the
-- "C" collation) and the others get "-<id>" appended, which is unique.
-- Nothing reads slugs yet, so recomputing them on a re-run is safe.
WITH base AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), ''),
      'category'
    ) AS "slug",
    "name"
  FROM "CauseCategory"
),
ranked AS (
  SELECT
    "id",
    "slug",
    row_number() OVER (PARTITION BY "slug" ORDER BY "name" COLLATE "C", "id") AS "n"
  FROM base
)
UPDATE "CauseCategory" AS c
SET "slug" = CASE WHEN r."n" = 1 THEN r."slug" ELSE r."slug" || '-' || c."id" END
FROM ranked AS r
WHERE c."id" = r."id";

ALTER TABLE "CauseCategory" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CauseCategory_slug_key" ON "CauseCategory"("slug");

-- Data: the curated "Highest Impact" category (D-013). Its members are added
-- by an admin once they are imported from Every.org and verified.
INSERT INTO "CauseCategory" ("id", "name", "slug", "description")
VALUES (
  gen_random_uuid()::text,
  'Highest Impact',
  'highest-impact',
  'Charities that GiveWell''s research finds do the most good per dollar.'
)
ON CONFLICT DO NOTHING;

COMMIT;
