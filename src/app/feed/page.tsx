// app/feed/page.tsx
// News from the causes the user follows. Only updates that link to a real
// source are shown (see lib/feed.ts); otherwise the page says so plainly.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { newsFeedWhere, safeExternalUrl } from "@/lib/feed";
import { SectionCard } from "@/components/surface/SectionCard";

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
      organization: { select: { name: true } },
    },
  });

  const name = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <section>
        <h1 className="text-3xl font-semibold">Welcome back, {name}!</h1>
        <p className="opacity-70 mt-1">
          Updates from the organizations behind the causes you follow, each linked to where it was published.
        </p>
      </section>

      {newsItems.length === 0 ? (
        <SectionCard title="No updates yet">
          <p>
            We only show news that links to something the organization actually published, and none has
            been posted for {followedCategoryIds.length > 0 ? "your causes" : "any cause"} yet. Check back soon.
          </p>
          <Link
            href="/onboarding/interests"
            className="mt-3 inline-flex rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            {followedCategoryIds.length > 0 ? "Change causes" : "Choose causes"}
          </Link>
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {newsItems.map((item) => {
            const href = safeExternalUrl(item.sourceUrl);
            return (
              <SectionCard key={item.id} title={item.organization.name}>
                <div className="space-y-2">
                  <p className="font-medium">{item.title}</p>
                  {item.content && <p className="opacity-80">{item.content}</p>}
                  <div className="flex items-center justify-between gap-2 text-xs opacity-70">
                    <span>{dateFormat.format(item.createdAt)}</span>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20"
                      >
                        Read the original
                      </a>
                    )}
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
