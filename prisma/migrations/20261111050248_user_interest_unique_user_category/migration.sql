-- Each user may follow a category at most once.
--
-- Step 1: remove exact duplicate (userId, categoryId) rows so the unique index
-- can be created. For each pair, the oldest row (then lowest id) is kept. Only
-- redundant copies are deleted; no user loses a followed category.
DELETE FROM "UserInterest" AS dup
USING "UserInterest" AS keep
WHERE dup."userId" = keep."userId"
  AND dup."categoryId" = keep."categoryId"
  AND (dup."createdAt", dup."id") > (keep."createdAt", keep."id");

-- Step 2: enforce uniqueness. Additive: the previous deployment's code still
-- works (it inserts with skipDuplicates, i.e. ON CONFLICT DO NOTHING).
-- CreateIndex
CREATE UNIQUE INDEX "UserInterest_userId_categoryId_key" ON "UserInterest"("userId", "categoryId");
