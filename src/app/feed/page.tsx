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
import { OrgLogo } from "@/components/ui/OrgLogo";
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
      createdAt: true,
      organization: { select: { name: true, logoUrl: true, coverImageUrl: true } },
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
        <div className="grid grid-cols-1 gap-(--space-section) md:grid-cols-2">
          {newsItems.map((item) => {
            const href = safeExternalUrl(item.sourceUrl);
            const source = href ? new URL(href).hostname.replace(/^www\./, "") : null;
            // The org's Every.org cover image, or the brand placeholder. (Per-item news images come in a later PR.)
            const image = safeExternalUrl(item.organization.coverImageUrl);
            return (
              <Card key={item.id} as="article" className="flex flex-col overflow-hidden p-0">
                <div className="relative aspect-[16/9] border-b bg-inset">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote image; served through our media route in the news-images PR
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span aria-hidden className="lorenz-mark absolute inset-6 opacity-30" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-(--space-card)">
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <OrgLogo src={safeExternalUrl(item.organization.logoUrl)} className="h-7 w-7" />
                    <span className="font-semibold text-fg">{item.organization.name}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={item.createdAt.toISOString()}>{dateFormat.format(item.createdAt)}</time>
                  </div>
                  <h2 className="text-xl font-semibold">{item.title}</h2>
                  {item.content && <p className="text-fg">{item.content}</p>}
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
