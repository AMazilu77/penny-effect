// Discover: browse and search the verified directory (Milestone 2).
// Category chips come from the database and link to ?category=<slug>, so a
// filtered view can be shared. Only organizations users may see are listed
// (src/lib/organizations.ts).
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { CharityNavigatorBadge } from "@/components/CharityNavigatorBadge";
import { CN_EXPLAINER } from "@/lib/charity-navigator/rating";
import { HIGHEST_IMPACT_RULE, HIGHEST_IMPACT_SLUG, highestImpactLabel } from "@/lib/highest-impact";
import { buttonPrimary, chip, textLink } from "@/components/ui/buttons";
import { countByCategory, filterDirectory, parseDiscoverParams } from "@/lib/directory";
import { safeExternalUrl } from "@/lib/feed";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function discoverHref(category: string | null, q: string): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/discover?${query}` : "/discover";
}

/** The request's time, for the "rating may be out of date" check (read outside rendering). */
function requestTime(): Date {
  return new Date();
}

export default async function DiscoverPage({ searchParams }: Props) {
  const { category, q } = parseDiscoverParams(await searchParams);
  const now = requestTime();

  const [categories, orgRows] = await Promise.all([
    prisma.causeCategory.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, description: true } }),
    prisma.organization.findMany({
      where: VISIBLE_ORGANIZATION_WHERE,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        website: true,
        everyOrgSlug: true,
        logoUrl: true,
        ein: true,
        cnScore: true,
        cnStars: true,
        cnProfileUrl: true,
        cnCheckedAt: true,
        cnSource: true,
        categories: { select: { slug: true, name: true }, orderBy: { name: "asc" } },
      },
    }),
  ]);

  const orgs = orgRows.map((o) => ({ ...o, categorySlugs: o.categories.map((c) => c.slug) }));
  const counts = countByCategory(orgs);
  // Chips: categories that have at least one organization (plus the selected one).
  const chips = categories.filter((c) => (counts.get(c.slug) ?? 0) > 0 || c.slug === category);
  const selected = categories.find((c) => c.slug === category) ?? null;
  const results = filterDirectory(orgs, { category: selected ? selected.slug : null, q });

  return (
    <div className="space-y-(--space-section)">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Discover</h1>
        <p className="text-muted">Verified nonprofits you can support, by cause.</p>
      </header>

      <Card className="space-y-4">
        <form action="/discover" method="get" role="search" className="flex flex-wrap gap-2">
          {selected && <input type="hidden" name="category" value={selected.slug} />}
          <input
            name="q"
            defaultValue={q}
            aria-label="Search organizations"
            placeholder="Search by name or mission"
            maxLength={100}
            className="min-w-0 flex-1 rounded-control border bg-inset px-3 py-2 text-base text-fg sm:max-w-md"
          />
          <button className={buttonPrimary}>Search</button>
        </form>

        <nav aria-label="Causes" className="flex flex-wrap gap-2">
          <Link href={discoverHref(null, q)} className={chip(!selected)} aria-current={!selected ? "page" : undefined}>
            All ({orgs.length})
          </Link>
          {chips.map((c) => (
            <Link
              key={c.slug}
              href={discoverHref(c.slug, q)}
              className={chip(selected?.slug === c.slug)}
              aria-current={selected?.slug === c.slug ? "page" : undefined}
            >
              {c.name} ({counts.get(c.slug) ?? 0})
            </Link>
          ))}
        </nav>

        {selected?.description && <p className="text-muted">{selected.description}</p>}
        {selected?.slug === HIGHEST_IMPACT_SLUG && (
          <p className="text-sm">
            <span className="font-semibold text-heading">Who&apos;s included:</span> {HIGHEST_IMPACT_RULE}
          </p>
        )}
        {category && !selected && <p className="text-muted">That cause doesn&apos;t exist. Showing all causes.</p>}
      </Card>

      {orgs.length === 0 ? (
        <Card>
          <p>No organizations yet. We only list nonprofits we have verified; check back soon.</p>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <p>
            Nothing matches{q && <> &ldquo;{q}&rdquo;</>}
            {selected && <> in {selected.name}</>}.{" "}
            <Link href="/discover" className={textLink}>
              Show everything
            </Link>
          </p>
        </Card>
      ) : (
        <ul className="grid gap-(--space-section) sm:grid-cols-2">
          {results.map((org) => {
            const website = safeExternalUrl(org.website);
            const impactLabel = highestImpactLabel(org);
            return (
              <Card key={org.id} as="li" className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <OrgLogo orgId={org.id} hasLogo={Boolean(org.logoUrl)} size={44} />
                  <div>
                    <h2 className="text-lg font-semibold">
                      {org.everyOrgSlug ? (
                        <Link href={`/org/${encodeURIComponent(org.everyOrgSlug)}`} className="hover:underline">
                          {org.name}
                        </Link>
                      ) : (
                        org.name
                      )}
                    </h2>
                    {impactLabel && <p className="text-sm font-medium text-muted">{impactLabel}</p>}
                  </div>
                </div>
                {org.description && <p className="text-fg">{org.description}</p>}
                <CharityNavigatorBadge rating={org} now={now} />
                <div className="flex flex-wrap gap-2">
                  {org.categories.map((c) => (
                    <Link key={c.slug} href={discoverHref(c.slug, "")} className="rounded-full border bg-inset px-3 py-1 text-sm text-fg hover:bg-accent-soft">
                      {c.name}
                    </Link>
                  ))}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-3 border-t pt-3">
                  {org.everyOrgSlug && (
                    <a
                      href={`https://www.every.org/${encodeURIComponent(org.everyOrgSlug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonPrimary}
                    >
                      View on Every.org
                    </a>
                  )}
                  {website && (
                    <a href={website} target="_blank" rel="noopener noreferrer" className={textLink}>
                      Website
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </ul>
      )}

      {results.some((o) => o.cnScore !== null) && (
        <p className="text-sm text-muted">
          Ratings from{" "}
          <a href="https://www.charitynavigator.org/" target="_blank" rel="noopener" className="underline">
            Charity Navigator
          </a>
          , shown as published. {CN_EXPLAINER}
        </p>
      )}
    </div>
  );
}
