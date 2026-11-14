-- Rate limiting (D-018): fixed-window counters in Postgres.
-- Additive only: one new table. The previous deployment never touches it.
-- One transaction; IF NOT EXISTS so a retry can finish a half-applied run.
BEGIN;

CREATE TABLE IF NOT EXISTS "RateLimitHit" (
    "bucket" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("bucket", "keyHash", "windowStart")
);

CREATE INDEX IF NOT EXISTS "RateLimitHit_expiresAt_idx" ON "RateLimitHit"("expiresAt");

COMMIT;
