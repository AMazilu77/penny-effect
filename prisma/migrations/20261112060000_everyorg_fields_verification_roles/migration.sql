-- Milestone 2, schema ADD step (D-012, D-013). Purely additive: the previous
-- deployment keeps working while this runs (it never creates categories at
-- runtime, so the new required CauseCategory.slug can't break it).

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'HIDDEN');

-- AlterTable: everyone starts as a regular user; the owner grants ADMIN by hand.
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- AlterTable: Every.org identity and details, admin verification, visibility.
-- Existing organizations stay ACTIVE but are unverified (verifiedAt NULL), so
-- once the "users only see verified orgs" change lands they are hidden until
-- an admin links and verifies them.
ALTER TABLE "Organization" ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "ein" TEXT,
ADD COLUMN     "everyOrgId" TEXT,
ADD COLUMN     "everyOrgSlug" TEXT,
ADD COLUMN     "isDisbursable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "nteeCode" TEXT,
ADD COLUMN     "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_ein_key" ON "Organization"("ein");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_everyOrgId_key" ON "Organization"("everyOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_everyOrgSlug_key" ON "Organization"("everyOrgSlug");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CauseCategory.slug: add nullable, backfill from the name
-- ("Space & Science" -> "space-science"), then require it.
ALTER TABLE "CauseCategory" ADD COLUMN "slug" TEXT;

UPDATE "CauseCategory"
SET "slug" = COALESCE(
  NULLIF(trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), ''),
  "id"
);

ALTER TABLE "CauseCategory" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CauseCategory_slug_key" ON "CauseCategory"("slug");

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
