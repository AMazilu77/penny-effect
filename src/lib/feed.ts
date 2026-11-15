// Rules for what the news feed may show. Kept free of database calls so they
// can be unit-tested.
import type { Prisma } from "@/generated/prisma/client";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";

// ---- Feed views (Local plan L2): Following / My causes / All ----

export const FEED_VIEWS = ["following", "causes", "all"] as const;
export type FeedView = (typeof FEED_VIEWS)[number];

export const FEED_VIEW_LABELS: Record<FeedView, string> = {
  following: "Following",
  causes: "My causes",
  all: "All",
};

/**
 * The view from ?view=. Without one (or an unknown value): Following if the
 * user follows at least one organization, otherwise My causes.
 */
export function parseFeedView(value: unknown, followsAny: boolean): FeedView {
  if (typeof value === "string" && (FEED_VIEWS as readonly string[]).includes(value)) return value as FeedView;
  return followsAny ? "following" : "causes";
}

export function feedHref(view: FeedView): string {
  return `/feed?view=${view}`;
}

/**
 * Which news items a feed view shows. Every view shows only:
 * - items with a `sourceUrl` (every update links to where the organization
 *   actually published it; the old seeded headlines never show), and
 * - items from organizations users can see (active, verified; src/lib/organizations.ts).
 *
 * Following: organizations the user follows. My causes: organizations in the
 * user's causes. All: every visible organization. A view with nothing to
 * match (no follows, no causes) shows nothing, and the page says why.
 */
export function newsFeedWhere(
  view: FeedView,
  { followedOrgIds, categoryIds }: { followedOrgIds: string[]; categoryIds: string[] },
): Prisma.NewsItemWhereInput {
  const base = { sourceUrl: { not: null } } as const;
  switch (view) {
    case "following":
      return { ...base, organization: { ...VISIBLE_ORGANIZATION_WHERE, id: { in: followedOrgIds } } };
    case "causes":
      return { ...base, organization: { ...VISIBLE_ORGANIZATION_WHERE, categories: { some: { id: { in: categoryIds } } } } };
    case "all":
      return { ...base, organization: VISIBLE_ORGANIZATION_WHERE };
  }
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
