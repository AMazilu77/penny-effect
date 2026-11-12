-- Money as integer cents, REMOVE step part 1 of 2 (D-004; add step was
-- 20261111050752). After this, the app no longer writes or reads the legacy
-- dollar float "amount"; part 2 (a later migration) drops the column.
--
-- Safe while the previous deployment is live: it already writes both
-- "amountCents" and "amount", so requiring the first and relaxing the second
-- doesn't affect it.
--
-- One transaction: if anything fails, nothing changes.

BEGIN;

-- 1. Backfill cents for rows written by old code without them, with the same
--    exact rule as the add step (numeric cast, so 1.13 -> 113).
UPDATE "Donation"
SET "amountCents" = ROUND("amount"::numeric * 100)::integer
WHERE "amountCents" IS NULL
  AND "amount" >= 0
  AND "amount" <= 21474836.47;

-- 2. Anything still without cents has an impossible legacy amount (negative,
--    NaN, or too large). Stop rather than guess or delete: the owner decides.
--    (Checked with a read-only production query before merging.)
DO $$
DECLARE remaining integer;
BEGIN
  SELECT count(*) INTO remaining FROM "Donation" WHERE "amountCents" IS NULL;
  IF remaining > 0 THEN
    RAISE EXCEPTION '% donation(s) have an impossible legacy amount and no amountCents; resolve them before this migration', remaining;
  END IF;
END $$;

-- 3. Cents become required; the legacy float becomes optional (no longer written).
ALTER TABLE "Donation" ALTER COLUMN "amountCents" SET NOT NULL;
ALTER TABLE "Donation" ALTER COLUMN "amount" DROP NOT NULL;

COMMIT;
