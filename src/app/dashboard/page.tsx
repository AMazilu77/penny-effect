// app/dashboard/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SectionCard } from "@/components/surface/SectionCard";
import DonationForm from "@/components/DonationForm";

type Metric = { key: string; value: string };
type Activity = { id: string; text: string; date: string };

const metrics: Metric[] = [
  { key: "Impact score", value: "1,284" },
  { key: "Total given", value: "$742.50" },
  { key: "Monthly streak", value: "4 months" },
  { key: "Causes followed", value: "12" },
];

const recentActivity: Activity[] = [
  { id: "1", text: "Donated $10 to Loggerhead Turtles", date: "Aug 28" },
  { id: "2", text: "Followed Coral Restoration Foundation", date: "Aug 26" },
  { id: "3", text: "Shared “Beach Cleanup” campaign", date: "Aug 24" },
];

function MetricTile({ m }: { m: Metric }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="text-xs opacity-60">{m.key}</div>
      <div className="text-lg font-semibold">{m.value}</div>
    </div>
  );
}

function EmptyState({
  title,
  actionHref,
  actionText,
}: {
  title: string;
  actionHref?: string;
  actionText?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 opacity-80">
      <p>{title}</p>
      {actionHref && actionText && (
        <Link
          href={actionHref}
          className="mt-3 inline-flex rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          {actionText}
        </Link>
      )}
    </div>
  );
}

// ✅ Full server-side session check
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // redirect if user is NOT logged in
  if (!session) redirect("/signin?callbackUrl=/dashboard");

  const firstName =
    session.user?.name?.split(" ")[0] ??
    session.user?.email?.split("@")[0] ??
    "Friend";

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Header / identity */}
      <section className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Welcome, {firstName} 👋</h1>
        <div className="ms-auto flex items-center gap-2">
          <Link
            href="/discover"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            Discover causes
          </Link>
          <Link
            href="/settings"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            Edit profile
          </Link>
        </div>
      </section>

      {/* Impact overview */}
      <SectionCard title="Impact overview">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <MetricTile key={m.key} m={m} />
          ))}
        </div>
      </SectionCard>

      {/* Two-up: activity + receipts */}
      <div className="grid md:grid-cols-2 gap-4">
        <SectionCard title="Recent activity">
          {recentActivity.length === 0 ? (
            <EmptyState
              title="No activity yet. Follow 3 causes to kickstart your feed."
              actionHref="/discover"
              actionText="Find causes"
            />
          ) : (
            <ul className="space-y-2 list-disc list-inside opacity-80">
              {recentActivity.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3">
                  <span>{a.text}</span>
                  <time className="text-xs opacity-60">{a.date}</time>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Receipts">
          <p className="opacity-80">
            Export-ready receipts for tax season will appear here.
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/receipts"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
            >
              View all
            </Link>
            <button
              type="button"
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm font-medium"
            >
              Export CSV
            </button>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Make a donation">
        <DonationForm />
      </SectionCard>
    </main>
  );
}
