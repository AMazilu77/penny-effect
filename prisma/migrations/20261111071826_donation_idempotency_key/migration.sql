-- Idempotency key for recording donations (prevents double-click duplicates).
-- Additive: a nullable column plus a unique index. Existing rows and the
-- previous deployment's inserts get NULL, and Postgres treats NULLs as
-- distinct, so they never conflict.

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Donation_userId_idempotencyKey_key" ON "Donation"("userId", "idempotencyKey");
