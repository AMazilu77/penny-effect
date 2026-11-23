// app/feed/page.tsx
// News in three views (Local plan L2): Following (organizations the user
// follows), My causes, and All. A tab picked by hand is in the URL (?view=)
// and remembered in a cookie; without one, the feed opens on a tab that has
// updates (chooseFeedView in lib/feed.ts), so it's never empty on arrival.
// Only updates that link to a real source are shown.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  FEED_VIEW_COOKIE,
  FEED_VIEW_LABELS,
  FEED_VIEWS,
  chooseFeedView,
  feedHref,
  newsFeedWhere,
  previewText,
  safeExternalUrl,
  type FeedView,
} from "@/lib/feed";
import { FeedTabs } from "@/components/feed/FeedTabs";
import { FollowButton, FollowNotice } from "@/components/FollowButton";
import { ReadMore } from "@/components/feed/ReadMore";
import { Card, CardHeader } from "@/components/ui/Card";
import { MediaImage } from "@/components/ui/MediaImage";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { sourceSite } from "@/lib/news-image";
import { buttonPrimary, buttonSecondary } from "@/components/ui/buttons";

export const dynamic = "force-dynamic";

// Dates are shown in UTC so server and browser render the same text.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

type EmptyAction = { href: string; label: string };

const DISCOVER: EmptyAction = { href: "/discover", label: "Find organizations to follow" };

/** What an empty view says (why it's empty), and where it points: always to Discover. */
function emptyState(view: FeedView, counts: { follows: number; causes: number }): { text: string; actions: EmptyAction[] } {
  const seeAll: EmptyAction = { href: feedHref("all"), label: "See all updates" };
  switch (view) {
    case "following":
      return counts.follows === 0
        ? { text: "You don't follow any organizations yet. Follow one and its updates will appear here.", actions: [DISCOVER, seeAll] }
        : {
            text: "The organizations you follow haven't posted an update yet. We only show news that links to something an organization actually published. Follow more organizations to see more here.",
            actions: [DISCOVER, seeAll],
          };
    case "causes":
      return counts.causes === 0
        ? {
            text: "You haven't chosen any causes yet. Choose some, or follow organizations directly.",
            actions: [{ href: "/profile#causes-heading", label: "Choose causes" }, DISCOVER],
          }
        : {
            text: "No organization in your causes has posted an update yet. We only show news that links to something an organization actually published.",
            actions: [DISCOVER, seeAll],
          };
    case "all":
      return {
        text: "No organization has posted an update yet. We only show news that links to something an organization actually published. Follow organizations now and their updates will appear here.",
        actions: [DISCOVER],
      };
  }
}

export default async function FeedPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/signin?callbackUrl=/feed");
  const params = await searchParams;

  const [interests, follows] = await Promise.all([
    prisma.userInterest.findMany({ where: { userId }, select: { categoryId: true } }),
    prisma.organizationFollow.findMany({ where: { userId }, select: { organizationId: true } }),
  ]);
  const categoryIds = interests.map((i) => i.categoryId);
  const followedOrgIds = follows.map((f) => f.organizationId);
  const followed = new Set(followedOrgIds);
  const ids = { followedOrgIds, categoryIds };

  // Which tabs have at least one update (one tiny query each).
  const firstItems = await Promise.all(
    FEED_VIEWS.map((v) => prisma.newsItem.findFirst({ where: newsFeedWhere(v, ids), select: { id: true } })),
  );
  const hasItems = Object.fromEntries(FEED_VIEWS.map((v, i) => [v, firstItems[i] !== null])) as Record<FeedView, boolean>;
  const { view, fellBackFrom } = chooseFeedView({
    requested: params.view,
    remembered: (await cookies()).get(FEED_VIEW_COOKIE)?.value,
    hasItems,
    followsAny: followedOrgIds.length > 0,
    causesAny: categoryIds.length > 0,
  });
  const returnTo = feedHref(view);

  const newsItems = await prisma.newsItem.findMany({
    where: newsFeedWhere(view, ids),
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      content: true,
      sourceUrl: true,
      imageUrl: true,
      imageAlt: true,
      createdAt: true,
      organization: { select: { id: true, name: true, logoUrl: true, coverImageUrl: true, everyOrgSlug: true } },
    },
  });
  const empty = emptyState(view, { follows: followedOrgIds.length, causes: categoryIds.length });

  const name = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-(--space-section)">
      <section className="space-y-1">
        <h1 className="text-3xl font-bold">Welcome back, {name}</h1>
        <p className="text-muted">Updates from organizations, each linked to where it was published.</p>
      </section>

      <FollowNotice value={params.notice} />

      <FeedTabs tabs={FEED_VIEWS.map((v) => ({ view: v, label: FEED_VIEW_LABELS[v], href: feedHref(v) }))} current={view} />

      {fellBackFrom && newsItems.length > 0 && (
        <p className="text-sm text-muted" role="status">
          Nothing under {FEED_VIEW_LABELS[fellBackFrom]} yet, so you&apos;re seeing all updates.
        </p>
      )}

      {newsItems.length === 0 ? (
        <Card>
          <CardHeader title="No updates yet" />
          <p>{empty.text}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {empty.actions.map((a, i) => (
              <Link key={a.href} href={a.href} className={i === 0 ? buttonPrimary : buttonSecondary}>
                {a.label}
              </Link>
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-(--space-section) md:grid-cols-2">
          {newsItems.map((item) => {
            const href = safeExternalUrl(item.sourceUrl);
            const source = href ? sourceSite(href) : null;
            // The item's own image, else the org's Every.org cover image, else the brand placeholder.
            const org = item.organization;
            const image = item.imageUrl
              ? { src: `/media/news/${item.id}`, alt: item.imageAlt ?? "", credit: source, creditHref: href }
              : org.coverImageUrl
                ? {
                    src: `/media/org/${org.id}/cover`,
                    alt: "",
                    credit: "Every.org",
                    creditHref: org.everyOrgSlug ? `https://www.every.org/${encodeURIComponent(org.everyOrgSlug)}` : null,
                  }
                : null;
            return (
              <Card key={item.id} as="article" className="flex flex-col overflow-hidden p-0">
                <figure className="border-b">
                  <div className="relative aspect-[16/9] overflow-hidden bg-inset">
                    <MediaImage src={image?.src ?? null} alt={image?.alt ?? ""} sizes="(min-width: 768px) 560px, 100vw" />
                  </div>
                  {image?.credit && (
                    <figcaption className="px-(--space-card) py-2 text-sm text-muted">
                      Image:{" "}
                      {image.creditHref ? (
                        <a href={image.creditHref} target="_blank" rel="noopener noreferrer" className="underline">
                          {image.credit}
                        </a>
                      ) : (
                        image.credit
                      )}
                    </figcaption>
                  )}
                </figure>
                <div className="flex flex-1 flex-col gap-3 p-(--space-card)">
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <OrgLogo orgId={org.id} hasLogo={Boolean(org.logoUrl)} size={28} />
                    {org.everyOrgSlug ? (
                      <Link href={`/org/${encodeURIComponent(org.everyOrgSlug)}`} className="font-semibold text-fg hover:underline">
                        {org.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-fg">{org.name}</span>
                    )}
                    <span aria-hidden>·</span>
                    <time dateTime={item.createdAt.toISOString()}>{dateFormat.format(item.createdAt)}</time>
                  </div>
                  <h2 className="text-xl font-semibold">{item.title}</h2>
                  {item.content &&
                    (() => {
                      // Short cards: long summaries start as a preview and expand in place.
                      const { preview, truncated } = previewText(item.content);
                      return truncated ? (
                        <ReadMore preview={preview} full={item.content} />
                      ) : (
                        <p className="whitespace-pre-line text-fg">{item.content}</p>
                      );
                    })()}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                    {href && <span className="text-sm text-muted">Source: {source}</span>}
                    <div className="flex flex-wrap gap-2">
                      <FollowButton
                        organizationId={org.id}
                        organizationName={org.name}
                        following={followed.has(org.id)}
                        signedIn
                        returnTo={returnTo}
                      />
                      {href && (
                        <a href={href} target="_blank" rel="noopener noreferrer" className={buttonSecondary}>
                          Read the original
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
