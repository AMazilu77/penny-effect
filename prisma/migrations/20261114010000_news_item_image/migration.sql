-- UI pass PR 6: an optional image per news item (URL + alt text).
-- Additive and nullable: existing news keeps no image and the feed falls
-- back to the organization's cover image, then a placeholder.
--
-- One transaction; IF NOT EXISTS so a retry can finish a half-applied run.
BEGIN;

ALTER TABLE "NewsItem" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "NewsItem" ADD COLUMN IF NOT EXISTS "imageAlt" TEXT;

COMMIT;
