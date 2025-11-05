import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionCard } from "@/components/surface/SectionCard";

export default async function FeedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/signin?callbackUrl=/feed");

  // 🔹 Fetch the user and their selected categories
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      interests: {
        include: { category: true },
      },
    },
  });

  if (!user) redirect("/signin");

  // 🔹 Gather the category names they follow
  const followedCategories = user.interests.map((i) => i.category.name);

  console.log("🧭 User follows:", followedCategories);

  // 🔹 If no interests, show all orgs (default behavior)
  const newsItems = await prisma.newsItem.findMany({
    where:
      followedCategories.length > 0
        ? {
            organization: {
              categories: {
                some: {
                  name: { in: followedCategories },
                },
              },
            },
          }
        : undefined,
    include: {
      organization: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const name =
    user.name?.split(" ")[0] ??
    session.user.email?.split("@")[0] ??
    "Friend";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <section>
        <h1 className="text-3xl font-semibold">Welcome back, {name}! 👋</h1>
        <p className="opacity-70 mt-1">
          Here’s what’s happening across your causes today.
        </p>
      </section>

      <div className="grid gap-4">
        {newsItems.length === 0 ? (
          <SectionCard title="No updates yet">
            <p>
              You haven’t followed any causes yet — or there are no new posts.
              Try selecting a few more causes to personalize your feed.
            </p>
          </SectionCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {newsItems.map((item) => (
              <SectionCard
                key={item.id}
                title={`${item.organization.name}`}
              >
                <div className="space-y-2">
                  <p>{item.title}</p>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500">
                      Follow
                    </button>
                    <a
                      href={item.organization.website || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20"
                    >
                      Learn More
                    </a>
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </div>

      <div className="text-center opacity-70 pt-6 text-sm">
        <p>More updates coming soon...</p>
      </div>
    </main>
  );
}
