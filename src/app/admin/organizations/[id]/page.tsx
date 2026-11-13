// One organization: Every.org link, verification, visibility, categories.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { verifyBlocker, ERRORS } from "@/lib/admin-orgs";
import { safeExternalUrl } from "@/lib/feed";
import { prisma } from "@/lib/prisma";
import { Flash } from "../../Flash";
import { OrgBadges } from "../../badges";
import {
  hideOrganization,
  linkOrganization,
  saveCategories,
  showOrganization,
  unverifyOrganization,
  verifyOrganization,
} from "../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const button =
  "inline-flex items-center justify-center gap-2 rounded-control border bg-card px-3 py-1.5 text-sm font-semibold text-fg hover:bg-inset disabled:cursor-not-allowed disabled:border-dashed disabled:bg-inset disabled:text-muted";
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-card border bg-card p-(--space-card) shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminOrganizationPage({ params, searchParams }: Props) {
  await requireAdminPage();
  const [{ id }, flash] = await Promise.all([params, searchParams]);

  const [org, categories] = await Promise.all([
    prisma.organization.findUnique({
      where: { id },
      include: {
        categories: { select: { id: true } },
        verifiedBy: { select: { name: true, email: true } },
        _count: { select: { donations: true, newsItems: true } },
      },
    }),
    prisma.causeCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
  ]);
  if (!org) notFound();

  const blocker = verifyBlocker(org);
  const selected = new Set(org.categories.map((c) => c.id));
  const website = safeExternalUrl(org.website);
  const hidden = <input type="hidden" name="organizationId" value={org.id} />;

  return (
    <div className="space-y-4">
      <Link href="/admin/organizations" className="text-sm text-link underline">
        ← All organizations
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <OrgBadges org={org} />
      </div>
      <Flash params={flash} />

      <Section title="Details">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">EIN</dt>
          <dd>{org.ein ?? "—"}</dd>
          <dt className="text-muted">Every.org</dt>
          <dd>
            {org.everyOrgSlug ? (
              <a href={`https://www.every.org/${encodeURIComponent(org.everyOrgSlug)}`} target="_blank" rel="noopener noreferrer" className="text-link underline">
                {org.everyOrgSlug}
              </a>
            ) : (
              "not linked"
            )}
          </dd>
          <dt className="text-muted">Accepts donations</dt>
          <dd>{org.everyOrgId ? (org.isDisbursable ? "yes (Every.org)" : "no (Every.org)") : "unknown"}</dd>
          <dt className="text-muted">Website</dt>
          <dd className="break-all">
            {website ? (
              <a href={website} target="_blank" rel="noopener noreferrer" className="text-link underline">
                {website}
              </a>
            ) : (
              "—"
            )}
          </dd>
          <dt className="text-muted">Last refreshed</dt>
          <dd>{org.lastSyncedAt ? `${dateTime.format(org.lastSyncedAt)} UTC` : "never"}</dd>
          <dt className="text-muted">History</dt>
          <dd>
            {org._count.donations} donations, {org._count.newsItems} news items
          </dd>
        </dl>
        {org.description && <p className="text-sm text-fg">{org.description}</p>}
      </Section>

      <Section title={org.everyOrgId ? "Refresh or re-link Every.org record" : "Link to Every.org"}>
        <p className="text-sm text-muted">
          Enter an Every.org slug (e.g. againstmalaria) or a 9-digit EIN. This copies EIN, website, description, logo and
          donation status from Every.org; the name here stays as it is. Linking to a different EIN clears verification.
        </p>
        <form action={linkOrganization} className="flex flex-wrap gap-2">
          {hidden}
          <input
            name="everyOrgRef"
            required
            defaultValue={org.everyOrgSlug ?? ""}
            className="w-full max-w-xs rounded-control border bg-inset px-3 py-2 text-fg"
          />
          <button className={button}>{org.everyOrgId ? "Refresh from Every.org" : "Link"}</button>
        </form>
      </Section>

      <Section title="Verification">
        {org.verifiedAt ? (
          <>
            <p className="text-sm">
              Verified {dateTime.format(org.verifiedAt)} UTC
              {org.verifiedBy && ` by ${org.verifiedBy.name ?? org.verifiedBy.email ?? "an admin"}`}.
            </p>
            <form action={unverifyOrganization}>
              {hidden}
              <button className={button}>Remove verification</button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              Verify only after checking this is the right registered nonprofit. Users see an organization only when it
              is verified, active, has an EIN and accepts donations through Every.org.
            </p>
            {blocker && <p className="text-sm text-warn">{ERRORS[blocker]}</p>}
            <form action={verifyOrganization}>
              {hidden}
              <button className={button} disabled={blocker !== null}>
                Verify
              </button>
            </form>
          </>
        )}
      </Section>

      <Section title="Visibility">
        <p className="text-sm text-muted">
          {org.status === "HIDDEN"
            ? "Hidden: users never see it. Donation history is kept."
            : "Active. Hiding never deletes anything; donation history stays intact."}
        </p>
        <form action={org.status === "HIDDEN" ? showOrganization : hideOrganization}>
          {hidden}
          <button className={button}>{org.status === "HIDDEN" ? "Make active" : "Hide"}</button>
        </form>
      </Section>

      <Section title="Categories">
        <form action={saveCategories} className="space-y-3">
          {hidden}
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={selected.has(c.id)} />
                {c.name}
                {c.slug === "highest-impact" && (
                  <span className="text-sm text-muted">(curated: GiveWell&apos;s impact-per-dollar research, D-013)</span>
                )}
              </label>
            ))}
          </div>
          <button className={button}>Save categories</button>
        </form>
      </Section>
    </div>
  );
}
