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

/** A view name if `value` is one (from ?view= or the cookie), otherwise null. */
export function parseFeedView(value: unknown): FeedView | null {
  return typeof value === "string" && (FEED_VIEWS as readonly string[]).includes(value) ? (value as FeedView) : null;
}

/**
 * Cookie that remembers the tab the user last picked by hand. Set in the
 * browser when a tab is clicked (src/components/feed/FeedTabs.tsx); it holds
 * only a view name, nothing personal.
 */
export const FEED_VIEW_COOKIE = "pe_feed_view";
export const FEED_VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type FeedChoice = {
  view: FeedView;
  /** The remembered tab that was empty, so the page can say why it shows All instead. */
  fellBackFrom: FeedView | null;
};

/**
 * Which tab the feed opens on. A new user who follows nothing must never land
 * on an empty feed:
 *
 * 1. A tab in the URL (?view=, from clicking a tab or a link) is shown as
 *    asked, even if empty; the page then says why and links to Discover.
 * 2. Otherwise the tab the user last picked, if it has items; if it's empty,
 *    All.
 * 3. Otherwise Following if the user follows an organization and it has
 *    items, else My causes if they chose causes and it has items, else All.
 *
 * `hasItems` says whether each tab would show at least one update.
 */
export function chooseFeedView({
  requested,
  remembered,
  hasItems,
  followsAny,
  causesAny,
}: {
  requested: unknown;
  remembered: unknown;
  hasItems: Readonly<Record<FeedView, boolean>>;
  followsAny: boolean;
  causesAny: boolean;
}): FeedChoice {
  const asked = parseFeedView(requested);
  if (asked) return { view: asked, fellBackFrom: null };

  const picked = parseFeedView(remembered);
  if (picked) {
    return hasItems[picked] || picked === "all" ? { view: picked, fellBackFrom: null } : { view: "all", fellBackFrom: picked };
  }

  if (followsAny && hasItems.following) return { view: "following", fellBackFrom: null };
  if (causesAny && hasItems.causes) return { view: "causes", fellBackFrom: null };
  return { view: "all", fellBackFrom: null };
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
