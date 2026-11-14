// app/dashboard/page.tsx
// Every number here comes from the signed-in user's own rows. No sample data.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { donationStatusLabel, summarizeDonations } from "@/lib/dashboard";
import { Card, CardHeader } from "@/components/ui/Card";
import { buttonPrimary, buttonSecondary } from "@/components/ui/buttons";
import DonationForm from "@/components/DonationForm";

export const dynamic = "force-dynamic";

// Dates are shown in UTC so server and browser render the same text.
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function MetricTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card level="inset" as="div">
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold text-heading">{value}</div>
      {note && <div className="mt-1 text-sm text-muted">{note}</div>}
    </Card>
  );
}

function EmptyState({ title, actionHref, actionText }: { title: string; actionHref?: string; actionText?: string }) {
  return (
    <Card level="inset" as="div">
      <p>{title}</p>
      {actionHref && actionText && (
        <Link href={actionHref} className={`${buttonPrimary} mt-3`}>
          {actionText}
        </Link>
      )}
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
  // Every.org sends donors here when they leave checkout without paying.
  const params = await searchParams;
  const checkoutCancelled = params.checkout === "cancelled";
  // From an organization page's "Give" button: preselect it in the form (the form checks it's visible).
  const giveTo = typeof params.give === "string" && /^[a-z0-9]{1,40}$/i.test(params.give) ? params.give : undefined;
  const firstName = session.user.name?.split(" ")[0] ?? session.user.email?.split("@")[0] ?? "Friend";

  return (
    <div className="space-y-(--space-section)">
      {/* Header / identity */}
      <Card className="relative overflow-hidden">
        <span aria-hidden className="lorenz-mark pointer-events-none absolute -right-6 -top-10 h-56 w-52 opacity-15" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Welcome, {firstName}</h1>
            <p className="text-muted">Small gifts, honestly counted.</p>
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <Link href="/discover" className={buttonPrimary}>
              Discover causes
            </Link>
            <Link href="/onboarding/interests" className={buttonSecondary}>
              Change causes
            </Link>
          </div>
        </div>
      </Card>

      {checkoutCancelled && (
        <p role="status" className="rounded-control border border-warn bg-warn-soft p-3 text-sm text-warn">
          You left Every.org without paying. Your gift is still listed as &ldquo;recorded, not yet paid&rdquo;; nothing was
          charged.
        </p>
      )}

      {/* Impact overview: real numbers only */}
      <Card>
        <CardHeader title="Your giving" description="Only gifts our donation partner confirms count as given." />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          <MetricTile label="Causes followed" value={String(causesFollowed)} />
        </div>
      </Card>

      <div className="grid items-start gap-(--space-section) lg:grid-cols-2">
        {/* Recent gifts */}
        <Card>
          <CardHeader title="Recent gifts" />
          {recentDonations.length === 0 ? (
            <EmptyState
              title={
                causesFollowed === 0
                  ? "No gifts yet. Start by choosing the causes you care about."
                  : "No gifts recorded yet. Use the form to record your first one."
              }
              actionHref={causesFollowed === 0 ? "/onboarding/interests" : undefined}
              actionText={causesFollowed === 0 ? "Choose causes" : undefined}
            />
          ) : (
            <ul className="divide-y rounded-control border bg-inset">
              {recentDonations.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
                  <span>
                    <span className="font-semibold text-heading">{formatCents(d.amountCents, d.currency)}</span> to{" "}
                    {d.organization.name}
                    <span className="ms-2 inline-flex rounded-full border px-2 py-0.5 text-sm text-muted">
                      {donationStatusLabel(d.status)}
                    </span>
                  </span>
                  <time dateTime={d.createdAt.toISOString()} className="text-sm text-muted">
                    {dateFormat.format(d.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card id="give" className="scroll-mt-24">
          <CardHeader title="Record a donation" description="Nothing is charged yet: this records your intention." />
          <DonationForm initialOrganizationId={giveTo} />
        </Card>
      </div>
    </div>
  );
}
