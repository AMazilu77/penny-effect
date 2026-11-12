-- Merge the legacy lowercase categories into the real ones (owner decision
-- 2026-11-12). Data only; no schema change.
--
-- Before #14, onboarding created a category on the fly for each cause id it
-- received, so production has rows such as "environment" next to the seeded
-- "Environment". They show up as near-duplicates in onboarding. For each
-- legacy row that has a real counterpart, this:
--   1. makes its followers follow the real category (keeping the date they
--      first followed; users who already follow it are left as they are),
--   2. moves any organization links and subcauses to the real category,
--   3. deletes the legacy row.
-- Legacy rows without a counterpart in the mapping are left untouched.
-- One transaction: if anything still references a legacy row, the foreign
-- keys make the final DELETE fail and nothing changes. Safe to re-run.

BEGIN;

-- Legacy names are the old onboarding cause ids (git history of
-- src/app/onboarding before #14); canonical rows are found by slug.
CREATE TEMP TABLE "legacy_category_map" ON COMMIT DROP AS
SELECT l."id" AS "legacyId", c."id" AS "canonicalId"
FROM (
  VALUES
    ('animal', 'animal-welfare'),
    ('education', 'education'),
    ('environment', 'environment'),
    ('humanitarian', 'humanitarian-aid'),
    ('medical', 'medical-research'),
    ('mental_health', 'mental-health'),
    ('political', 'political-reform'),
    ('space', 'space-science')
) AS m("legacyName", "canonicalSlug")
JOIN "CauseCategory" l ON l."name" = m."legacyName"
JOIN "CauseCategory" c ON c."slug" = m."canonicalSlug"
WHERE l."id" <> c."id";

-- 1. Followers
INSERT INTO "UserInterest" ("id", "userId", "categoryId", "subcauseId", "createdAt")
SELECT gen_random_uuid()::text, ui."userId", m."canonicalId", NULL, min(ui."createdAt")
FROM "UserInterest" ui
JOIN "legacy_category_map" m ON ui."categoryId" = m."legacyId"
GROUP BY ui."userId", m."canonicalId"
ON CONFLICT ("userId", "categoryId") DO NOTHING;

DELETE FROM "UserInterest" ui
USING "legacy_category_map" m
WHERE ui."categoryId" = m."legacyId";

-- 2. Organization links ("A" = category, "B" = organization) and subcauses
INSERT INTO "_OrgCategories" ("A", "B")
SELECT DISTINCT m."canonicalId", oc."B"
FROM "_OrgCategories" oc
JOIN "legacy_category_map" m ON oc."A" = m."legacyId"
ON CONFLICT DO NOTHING;

DELETE FROM "_OrgCategories" oc
USING "legacy_category_map" m
WHERE oc."A" = m."legacyId";

UPDATE "SubCause" s
SET "categoryId" = m."canonicalId"
FROM "legacy_category_map" m
WHERE s."categoryId" = m."legacyId";

-- 3. The legacy rows themselves
DELETE FROM "CauseCategory" c
USING "legacy_category_map" m
WHERE c."id" = m."legacyId";

COMMIT;
