// Rules for what the news feed may show. Kept free of database calls so they
// can be unit-tested.
import type { Prisma } from "@/generated/prisma/client";

/**
 * Which news items a user's feed shows.
 *
 * - Only items with a `sourceUrl`: every update must link to where the
 *   organization actually published it. Items without one (such as the old
 *   seeded placeholder headlines) are never shown.
 * - If the user follows causes, only items from organizations in those causes.
 *   If they follow none, items from all organizations.
 */
export function newsFeedWhere(followedCategoryIds: string[]): Prisma.NewsItemWhereInput {
  const where: Prisma.NewsItemWhereInput = { sourceUrl: { not: null } };
  if (followedCategoryIds.length > 0) {
    where.organization = { categories: { some: { id: { in: followedCategoryIds } } } };
  }
  return where;
}

/**
 * Returns the URL if it is a well-formed http(s) link, otherwise null, so a
 * bad or `javascript:` value can never end up in an `href`.
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
