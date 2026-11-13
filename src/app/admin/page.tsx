// Admin overview: what the role is, the principles admins follow, how the
// site works, and what's waiting. Written for volunteer admins who aren't
// technical. Layouts and pages render in parallel in the App Router, so
// this page checks the role itself too instead of relying on the layout.
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { textLink } from "@/components/ui/buttons";
import { requireAdminPage } from "@/lib/admin";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

function Stat({ label, value, href, note }: { label: string; value: number; href: string; note: string }) {
  return (
    <Link href={href} className="block rounded-control border bg-inset p-4 hover:border-primary">
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className="text-2xl font-bold text-heading">{value}</div>
      <div className="mt-1 text-sm text-muted">{note}</div>
    </Link>
  );
}

/** The start of the "recent news" window. A request-time value, computed outside rendering. */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function AdminPage() {
  await requireAdminPage();

  const monthAgo = daysAgo(30);
  const [live, waiting, hidden, recentNews] = await Promise.all([
    prisma.organization.count({ where: VISIBLE_ORGANIZATION_WHERE }),
    prisma.organization.count({ where: { status: "ACTIVE", verifiedAt: null } }),
    prisma.organization.count({ where: { status: "HIDDEN" } }),
    prisma.newsItem.count({ where: { sourceUrl: { not: null }, createdAt: { gte: monthAgo } } }),
  ]);

  return (
    <div className="space-y-(--space-section)">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Your role as an admin</h1>
        <p className="text-muted">
          Donors trust that every organization and every update on this site is real. Admins are how we keep that promise.
        </p>
      </header>

      <section aria-label="Directory at a glance" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Live for donors" value={live} href="/admin/organizations" note="Verified and receiving gifts" />
        <Stat label="Waiting for review" value={waiting} href="/admin/organizations" note="Imported, not verified yet" />
        <Stat label="Hidden" value={hidden} href="/admin/organizations" note="Removed from the site, history kept" />
        <Stat label="News, last 30 days" value={recentNews} href="/admin/news" note="Updates with a source link" />
      </section>

      <div className="grid gap-(--space-section) lg:grid-cols-2">
        <Card>
          <CardHeader title="What you do" />
          <ul className="list-disc space-y-2 ps-5">
            <li>
              <strong className="text-heading">Verify nonprofits.</strong> Check that each organization is a real, registered
              US charity in good standing before donors can see it.{" "}
              <Link href="/admin/organizations" className={textLink}>
                Review organizations
              </Link>
            </li>
            <li>
              <strong className="text-heading">Post real, sourced news.</strong> Share what an organization itself published,
              with a link to where it was published.{" "}
              <Link href="/admin/news" className={textLink}>
                Post an update
              </Link>
            </li>
            <li>
              <strong className="text-heading">Hide organizations with problems.</strong> If something looks wrong (status
              revoked, name doesn&apos;t match, a complaint), hide it first and ask. Hiding never deletes anything.
            </li>
          </ul>
        </Card>

        <Card>
          <CardHeader title="Principles" />
          <ul className="list-disc space-y-2 ps-5">
            <li>
              <strong className="text-heading">Never invent content.</strong> No made-up numbers, quotes, stories or
              placeholder organizations.
            </li>
            <li>
              <strong className="text-heading">Every claim needs a source.</strong> If you can&apos;t link to where it came
              from, don&apos;t post it.
            </li>
            <li>
              <strong className="text-heading">Declare conflicts of interest.</strong> If you work for, volunteer with or
              have a personal tie to an organization, leave its review to another admin.
            </li>
            <li>
              <strong className="text-heading">When in doubt, hide it and ask.</strong> A hidden organization can always be
              shown again; a wrong one can mislead donors.
            </li>
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="How this site works" />
        <div className="space-y-3">
          <p>
            <strong className="text-heading">We never hold money.</strong> Gifts are processed by our donation partner,
            Every.org: it takes the payment, sends the donor&apos;s tax receipt and pays the charity. Until that
            connection is live, gifts are recorded and clearly marked &ldquo;recorded, not yet paid&rdquo;.
          </p>
          <p>
            <strong className="text-heading">Our job is the directory and honest records.</strong> Organizations come from
            Every.org&apos;s nonprofit data; an admin decides which ones donors see. Donors only see an organization that
            is verified, active, has a US tax ID (EIN) and that Every.org can send gifts to.
          </p>
          <p>
            <strong className="text-heading">Details refresh weekly</strong> from Every.org. If an organization&apos;s EIN
            changes, its verification is removed automatically so an admin looks again.
          </p>
        </div>
      </Card>
    </div>
  );
}
