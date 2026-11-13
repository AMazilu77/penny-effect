// app/dashboard/page.tsx
// Every number here comes from the signed-in user's own rows. No sample data.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { donationStatusLabel, summarizeDonations } from "@/lib/dashboard";
import { SectionCard } from "@/components/surface/SectionCard";
import DonationForm from "@/components/DonationForm";

export const dynamic = "force-dynamic";

// Dates are shown in UTC so server and browser render the same text.
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function MetricTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="text-xs opacity-60">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {note && <div className="mt-1 text-xs opacity-60">{note}</div>}
    </div>
  );
}

function EmptyState({ title, actionHref, actionText }: { title: string; actionHref?: string; actionText?: string }) {
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

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");

  const [statusGroups, causesFollowed, recentDonations] = await Promise.all([
    prisma.donation.groupBy({
      by: ["status"],
      where: { userId },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.userInterest.count({ where: { userId } }),
    prisma.donation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        createdAt: true,
        organization: { select: { name: true } },
      },
    }),
  ]);

  const summary = summarizeDonations(statusGroups);
  const firstName = session.user.name?.split(" ")[0] ?? session.user.email?.split("@")[0] ?? "Friend";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
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
            href="/onboarding/interests"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            Change causes
          </Link>
        </div>
      </section>

      {/* Impact overview: real numbers only */}
      <SectionCard title="Your giving">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricTile
            label="Given (paid)"
            value={formatCents(summary.givenCents)}
            note={
              summary.givenCount === 0
                ? "Payments start once our donation partner is connected."
                : `${summary.givenCount} paid ${summary.givenCount === 1 ? "gift" : "gifts"}`
            }
          />
          <MetricTile
            label="Recorded, not yet paid"
            value={formatCents(summary.pendingCents)}
            note={`${summary.pendingCount} ${summary.pendingCount === 1 ? "gift" : "gifts"} · no money has moved`}
          />
          <MetricTile
            label="Causes followed"
            value={String(causesFollowed)}
          />
        </div>
      </SectionCard>

      {/* Recent gifts */}
      <SectionCard title="Recent gifts">
        {recentDonations.length === 0 ? (
          <EmptyState
            title={
              causesFollowed === 0
                ? "No gifts yet. Start by choosing the causes you care about."
                : "No gifts recorded yet. Use the form below to record your first one."
            }
            actionHref={causesFollowed === 0 ? "/onboarding/interests" : undefined}
            actionText={causesFollowed === 0 ? "Choose causes" : undefined}
          />
        ) : (
          <ul className="space-y-2">
            {recentDonations.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span>
                  {formatCents(d.amountCents, d.currency)} to {d.organization.name}
                  <span className="ms-2 text-xs opacity-60">{donationStatusLabel(d.status)}</span>
                </span>
                <time dateTime={d.createdAt.toISOString()} className="text-xs opacity-60">
                  {dateFormat.format(d.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Record a donation">
        <DonationForm />
      </SectionCard>
    </div>
  );
}
