-- Money as integer cents, REMOVE step part 2 of 2 (D-004): drop the legacy
-- dollar float. Merge only after part 1 (20261112080000) is live: from then
-- on no deployment writes or reads "amount" (every donation query selects
-- explicit columns), so dropping it can't affect the previous deployment.
-- Destructive: the values are redundant with "amountCents" (part 1 made
-- every row have cents), so no information is lost.

BEGIN;
ALTER TABLE "Donation" DROP COLUMN "amount";
COMMIT;
