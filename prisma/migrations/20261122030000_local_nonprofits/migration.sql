-- Local nonprofits (D-028): where an organization is and who it serves,
-- volunteering, named regions made of counties, and the user's "My area".
--
-- Add-only: new nullable or defaulted columns and new tables, so the
-- deployment still live while this runs (which never reads them) keeps
-- working. One transaction, and IF NOT EXISTS / guarded blocks, so a retry
-- can finish a half-applied database.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceArea') THEN
    CREATE TYPE "ServiceArea" AS ENUM ('LOCAL', 'REGIONAL', 'STATEWIDE', 'NATIONAL');
  END IF;
END $$;

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "locationCounty" TEXT,
  ADD COLUMN IF NOT EXISTS "locationManual" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "serviceArea" "ServiceArea",
  ADD COLUMN IF NOT EXISTS "acceptsVolunteers" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "volunteerUrl" TEXT;

CREATE TABLE IF NOT EXISTS "Region" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Region_slug_key" ON "Region"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Region_name_key" ON "Region"("name");

CREATE TABLE IF NOT EXISTS "RegionCounty" (
    "regionId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    CONSTRAINT "RegionCounty_pkey" PRIMARY KEY ("regionId", "state", "county")
);

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "areaRegionId" TEXT,
  ADD COLUMN IF NOT EXISTS "areaCity" TEXT,
  ADD COLUMN IF NOT EXISTS "areaState" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RegionCounty_regionId_fkey') THEN
    ALTER TABLE "RegionCounty" ADD CONSTRAINT "RegionCounty_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_areaRegionId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_areaRegionId_fkey"
      FOREIGN KEY ("areaRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  -- My area is a region, or a city with its state, or nothing; never both.
  -- (Prisma doesn't model CHECK constraints; this one is enforced by Postgres only.)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_area_one_kind') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_area_one_kind" CHECK (
      ("areaRegionId" IS NULL OR "areaCity" IS NULL)
      AND (("areaCity" IS NULL) = ("areaState" IS NULL))
    );
  END IF;
END $$;

-- The first regions, as data (admins add more at /admin/regions). Skipped
-- if they already exist, so a retry or an admin's earlier edit is kept.
INSERT INTO "Region" ("id", "slug", "name", "updatedAt") VALUES
  ('region_palm_beach_county', 'palm-beach-county', 'Palm Beach County', CURRENT_TIMESTAMP),
  ('region_broward_county', 'broward-county', 'Broward County', CURRENT_TIMESTAMP),
  ('region_miami_dade_county', 'miami-dade-county', 'Miami-Dade County', CURRENT_TIMESTAMP),
  ('region_south_florida', 'south-florida', 'South Florida', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "RegionCounty" ("regionId", "state", "county")
SELECT r."id", v."state", v."county"
FROM (VALUES
  ('palm-beach-county', 'FL', 'Palm Beach'),
  ('broward-county', 'FL', 'Broward'),
  ('miami-dade-county', 'FL', 'Miami-Dade'),
  ('south-florida', 'FL', 'Palm Beach'),
  ('south-florida', 'FL', 'Broward'),
  ('south-florida', 'FL', 'Miami-Dade')
) AS v("slug", "state", "county")
JOIN "Region" r ON r."slug" = v."slug"
ON CONFLICT DO NOTHING;

COMMIT;
