// app/feed/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionCard } from "@/components/surface/SectionCard";

export default async function FeedPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/signin?callbackUrl=/feed");

  const name =
    session.user?.name?.split(" ")[0] ??
    session.user?.email?.split("@")[0] ??
    "Friend";

  // Fetch the user and their selected categories
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email ?? "" },
    include: {
      interests: { include: { category: true } },
    },
  });

  // Determine which categories to show
  const selectedCategories = user?.interests.map((i) => i.category.name) ?? [];
  const showAll = selectedCategories.length === 0;

  // Find matching organizations
  const orgs = await prisma.organization.findMany({
    where: showAll
      ? {}
      : {
          categories: {
            some: {
              name: { in: selectedCategories },
            },
          },
        },
    include: {
      newsItems: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  // Flatten organizations + their news into feed items
  const feedItems = orgs.flatMap((org: any) =>
    org.newsItems.map((news: any) => ({
      id: news.id,
      org: org.name,
      text: news.title,
      time: new Date(news.createdAt).toLocaleDateString(),
      actions: ["Donate", "Follow", "Share"],
    }))
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <section>
        <h1 className="text-3xl font-semibold">
          Welcome back, {name}! 👋
        </h1>
        <p className="opacity-70 mt-1">
          Here’s what’s happening across your causes today.
        </p>
      </section>

      <div className="grid gap-4">
        <SectionCard title="Personalized Feed">
          <p>
            Updates from organizations you care about — including calls to action, campaigns, and progress reports.
          </p>
        </SectionCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedItems.length === 0 ? (
            <SectionCard title="No Updates Yet">
              <p>
                Once you select your interests and nonprofits, updates will start appearing here.
              </p>
            </SectionCard>
          ) : (
            feedItems.map((item) => (
              <SectionCard
                key={item.id}
                title={`${item.org} · ${item.time}`}
              >
                <div className="space-y-2">
                  <p>{item.text}</p>
                  <div className="flex gap-2">
                    {item.actions.map((action: any) => (
                      <button
                        key={action}
                        className={`px-3 py-1.5 text-sm rounded-lg ${
                          action === "Donate"
                            ? "bg-emerald-600 hover:bg-emerald-500"
                            : "bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </SectionCard>
            ))
          )}
        </div>
      </div>

      <div className="text-center opacity-70 pt-6 text-sm">
        <p>More updates coming soon...</p>
      </div>
    </main>
  );
}
