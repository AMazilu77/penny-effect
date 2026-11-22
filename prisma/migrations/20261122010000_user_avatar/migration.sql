-- Milestone 3.5 (profile page): uploaded profile pictures, one small WebP
-- per user. New table only: the previous deployment never reads it.
-- In a transaction with IF NOT EXISTS, so a retry can finish a half-applied
-- database (Prisma 7 doesn't roll back a failed migration).
BEGIN;

CREATE TABLE IF NOT EXISTS "UserAvatar" (
    "userId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAvatar_pkey" PRIMARY KEY ("userId")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserAvatar_userId_fkey') THEN
    ALTER TABLE "UserAvatar" ADD CONSTRAINT "UserAvatar_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
