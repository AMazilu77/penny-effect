-- Follow organizations (Local plan L1, D-019).
-- Additive only: one new table. The previous deployment never touches it.
-- One transaction; IF NOT EXISTS / guarded constraints so a retry can finish
-- a half-applied run.
BEGIN;

CREATE TABLE IF NOT EXISTS "OrganizationFollow" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationFollow_pkey" PRIMARY KEY ("userId", "organizationId")
);

CREATE INDEX IF NOT EXISTS "OrganizationFollow_organizationId_idx" ON "OrganizationFollow"("organizationId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationFollow_userId_fkey') THEN
    ALTER TABLE "OrganizationFollow" ADD CONSTRAINT "OrganizationFollow_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationFollow_organizationId_fkey') THEN
    ALTER TABLE "OrganizationFollow" ADD CONSTRAINT "OrganizationFollow_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
