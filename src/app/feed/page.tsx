// app/feed/page.tsx
// News from the causes the user follows. Only updates that link to a real
// source are shown (see lib/feed.ts); otherwise the page says so plainly.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { newsFeedWhere, safeExternalUrl } from "@/lib/feed";
import { Card, CardHeader } from "@/components/ui/Card";
import { MediaImage } from "@/components/ui/MediaImage";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { sourceSite } from "@/lib/news-image";
import { buttonSecondary } from "@/components/ui/buttons";

export const dynamic = "force-dynamic";

// Dates are shown in UTC so server and browser render the same text.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default async function FeedPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/signin?callbackUrl=/feed");

  const interests = await prisma.userInterest.findMany({
    where: { userId },
    select: { categoryId: true },
  });
  const followedCategoryIds = interests.map((i) => i.categoryId);

  const newsItems = await prisma.newsItem.findMany({
    where: newsFeedWhere(followedCategoryIds),
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

  const name = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-(--space-section)">
      <section className="space-y-1">
        <h1 className="text-3xl font-bold">Welcome back, {name}</h1>
        <p className="text-muted">
          Updates from the organizations behind the causes you follow, each linked to where it was published.
        </p>
      </section>

      {newsItems.length === 0 ? (
        <Card>
          <CardHeader title="No updates yet" />
          <p>
            We only show news that links to something the organization actually published, and none has
            been posted for {followedCategoryIds.length > 0 ? "your causes" : "any cause"} yet. Check back soon.
          </p>
          <Link href="/onboarding/interests" className={`${buttonSecondary} mt-4`}>
            {followedCategoryIds.length > 0 ? "Change causes" : "Choose causes"}
          </Link>
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
                    <span className="font-semibold text-fg">{item.organization.name}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={item.createdAt.toISOString()}>{dateFormat.format(item.createdAt)}</time>
                  </div>
                  <h2 className="text-xl font-semibold">{item.title}</h2>
                  {item.content && <p className="whitespace-pre-line text-fg">{item.content}</p>}
                  {href && (
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                      <span className="text-sm text-muted">Source: {source}</span>
                      <a href={href} target="_blank" rel="noopener noreferrer" className={buttonSecondary}>
                        Read the original
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
