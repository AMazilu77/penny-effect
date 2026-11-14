// Rules for what the news feed may show. Kept free of database calls so they
// can be unit-tested.
import type { Prisma } from "@/generated/prisma/client";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";

/**
 * Which news items a user's feed shows.
 *
 * - Only items with a `sourceUrl`: every update must link to where the
 *   organization actually published it. Items without one (such as the old
 *   seeded placeholder headlines) are never shown.
 * - Only items from organizations users can see (active, verified, see
 *   src/lib/organizations.ts).
 * - If the user follows causes, only items from organizations in those causes.
 *   If they follow none, items from all organizations.
 */
export function newsFeedWhere(followedCategoryIds: string[]): Prisma.NewsItemWhereInput {
  return {
    sourceUrl: { not: null },
    organization: {
      ...VISIBLE_ORGANIZATION_WHERE,
      ...(followedCategoryIds.length > 0 ? { categories: { some: { id: { in: followedCategoryIds } } } } : {}),
    },
  };
}

/** How much of a news summary a feed card shows before "Read more". */
export const FEED_PREVIEW_CHARS = 280;

/**
 * A short preview of a news summary for feed cards: the whole text if it's
 * short, otherwise cut at the last word (or paragraph) boundary before
 * `max` characters, with "…". `truncated` says whether "Read more" is needed.
 */
export function previewText(text: string, max = FEED_PREVIEW_CHARS): { preview: string; truncated: boolean } {
  const trimmed = text.trim();
  // A little slack, so "Read more" never hides just a few words.
  if (trimmed.length <= max + 40) return { preview: trimmed, truncated: false };
  const head = trimmed.slice(0, max);
  const paragraph = head.lastIndexOf("\n");
  const space = head.lastIndexOf(" ");
  const cut = paragraph > max * 0.6 ? paragraph : space > max * 0.6 ? space : max;
  return { preview: `${head.slice(0, cut).trimEnd().replace(/[.,;:!?-]+$/, "")}…`, truncated: true };
}

/** A valid /org/<slug> slug (Every.org's primary slug format), or null. */
export function orgSlug(value: string): string | null {
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,99}$/.test(slug) ? slug : null;
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
