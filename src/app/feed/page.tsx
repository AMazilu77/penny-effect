// app/feed/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SectionCard } from "@/components/surface/SectionCard";

export default async function FeedPage() {
  const session = await getServerSession(authOptions);

  // Redirect unauthenticated users to sign in
  if (!session) redirect("/signin?callbackUrl=/feed");

  const name =
    session.user?.name?.split(" ")[0] ??
    session.user?.email?.split("@")[0] ??
    "Friend";

  // Simulated feed data (later we’ll fetch this dynamically)
  const feedItems = [
    {
      id: 1,
      org: "Loggerhead Turtles",
      time: "2h",
      text: "Beach hatchlings released last night. Volunteers needed for Friday sunrise patrol.",
      actions: ["Donate", "Follow", "Share"],
    },
    {
      id: 2,
      org: "Coral Restoration Foundation",
      time: "1d",
      text: "New nursery frames installed. See our latest impact map.",
      actions: ["Donate", "Follow"],
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <section>
        <h1 className="text-3xl font-semibold">
          Welcome back, {name}! 👋
        </h1>
        <p className="opacity-70 mt-1">
          Here’s what’s happening across your causes today.
        </p>
      </section>

      {/* Feed container */}
      <div className="grid gap-4">
        <SectionCard title="Personalized Feed">
          <p>
            Updates from followed organizations, calls to action, and community activity will
            appear here.
          </p>
        </SectionCard>

        {/* Feed posts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedItems.map((item) => (
            <SectionCard
              key={item.id}
              title={`${item.org} · ${item.time}`}
            >
              <div className="space-y-2">
                <p>{item.text}</p>
                <div className="flex gap-2">
                  {item.actions.map((action) => (
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
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="text-center opacity-70 pt-6 text-sm">
        <p>More updates coming soon...</p>
      </div>
    </main>
  );
}
