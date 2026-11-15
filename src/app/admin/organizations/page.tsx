// The organization directory for admins, split into tabs (src/lib/admin-org-tabs.ts):
// Needs review (default), Live, Hidden. Hidden organizations never appear in
// the default tab. The tab and search are in the URL, so they survive reloads.
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import {
  DEFAULT_ORG_TAB,
  ORG_TAB_LABELS,
  ORG_TABS,
  orgSearchWhere,
  orgTabHref,
  orgTabWhere,
  parseOrgSearch,
  parseOrgTab,
} from "@/lib/admin-org-tabs";
import { prisma } from "@/lib/prisma";
import { Flash } from "../Flash";
import { OrgBadges, StatusLegend } from "../badges";
import { hideOrganization, showOrganization } from "./actions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const button =
  "inline-flex items-center justify-center gap-2 rounded-control border bg-card px-3 py-1.5 text-sm font-semibold text-fg hover:bg-inset";

const EMPTY: Record<(typeof ORG_TABS)[number], string> = {
  review: "Nothing waiting for review.",
  live: "No organizations are live yet.",
  hidden: "No hidden organizations.",
};

export default async function AdminOrganizationsPage({ searchParams }: Props) {
  await requireAdminPage();
  const params = await searchParams;
  const tab = parseOrgTab(params.tab);
  const q = parseOrgSearch(params.q);
  const search = orgSearchWhere(q);

  const [orgs, ...counts] = await Promise.all([
    prisma.organization.findMany({
      where: { AND: [orgTabWhere(tab), search] },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        ein: true,
        everyOrgId: true,
        isDisbursable: true,
        status: true,
        verifiedAt: true,
        categories: { select: { name: true }, orderBy: { name: "asc" } },
      },
    }),
    // Counts follow the search, so each tab shows how many matches it has.
    ...ORG_TABS.map((t) => prisma.organization.count({ where: { AND: [orgTabWhere(t), search] } })),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <Link href="/admin/organizations/import" className={button}>
          Import from Every.org
        </Link>
      </div>
      <Flash params={params} />

      <nav aria-label="Organization lists" className="flex flex-wrap gap-1 border-b">
        {ORG_TABS.map((t, i) => {
          const current = t === tab;
          return (
            <Link
              key={t}
              href={orgTabHref(t, q)}
              aria-current={current ? "page" : undefined}
              className={`-mb-px rounded-t-control border px-3 py-2 text-sm font-semibold ${
                current ? "border-b-card bg-card text-heading" : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {ORG_TAB_LABELS[t]} <span className="font-normal">({counts[i]})</span>
            </Link>
          );
        })}
      </nav>

      <form method="get" action="/admin/organizations" role="search" className="flex flex-wrap gap-2">
        {tab !== DEFAULT_ORG_TAB && <input type="hidden" name="tab" value={tab} />}
        <label htmlFor="org-search" className="sr-only">
          Search {ORG_TAB_LABELS[tab]} by name or EIN
        </label>
        <input
          id="org-search"
          type="search"
          name="q"
          defaultValue={q}
          maxLength={100}
          placeholder={`Search ${ORG_TAB_LABELS[tab]} by name or EIN`}
          className="w-full max-w-md rounded-control border bg-inset px-3 py-2 text-base text-fg"
        />
        <button className={button}>Search</button>
        {q && (
          <Link href={orgTabHref(tab)} className={`${button} border-transparent bg-transparent`}>
            Clear
          </Link>
        )}
      </form>

      <StatusLegend />
      <ul className="divide-y rounded-card border bg-card shadow-sm">
        {orgs.map((org) => (
          <li key={org.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
            <Link href={`/admin/organizations/${org.id}`} className="font-medium underline-offset-2 hover:underline">
              {org.name}
            </Link>
            <OrgBadges org={org} />
            <span className="text-sm text-muted">
              {org.ein ? `EIN ${org.ein}` : "no EIN"}
              {org.categories.length > 0 && ` · ${org.categories.map((c) => c.name).join(", ")}`}
            </span>
            <form action={org.status === "HIDDEN" ? showOrganization : hideOrganization} className="ml-auto">
              <input type="hidden" name="organizationId" value={org.id} />
              <input type="hidden" name="from" value="list" />
              <input type="hidden" name="tab" value={tab} />
              <input type="hidden" name="q" value={q} />
              <button className={button} aria-label={`${org.status === "HIDDEN" ? "Unhide" : "Hide"} ${org.name}`}>
                {org.status === "HIDDEN" ? "Unhide" : "Hide"}
              </button>
            </form>
          </li>
        ))}
        {orgs.length === 0 && (
          <li className="p-3 text-muted">
            {q ? `No matches for "${q}" in ${ORG_TAB_LABELS[tab]}.` : EMPTY[tab]}
            {tab === "review" && !q && counts.every((c) => c === 0) && " Import one from Every.org."}
          </li>
        )}
      </ul>
    </div>
  );
}
