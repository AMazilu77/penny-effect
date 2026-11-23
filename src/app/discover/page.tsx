// Discover: browse and search the verified directory (Milestone 2), by
// cause, an area the user picks (a region made of counties, or a state,
// optionally narrowed to a city; D-028), and "takes volunteers". Everything
// is in the URL (?category=&q=&area=&city=&volunteer=1), so a filtered view
// can be shared, and the filters are a plain GET form that works without
// JavaScript. National organizations are listed in their own section so
// local ones aren't buried. Only organizations users may see are listed
// (src/lib/organizations.ts). Nothing here guesses where the visitor is.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { FollowButton, FollowNotice } from "@/components/FollowButton";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { CharityNavigatorBadge } from "@/components/CharityNavigatorBadge";
import { CN_EXPLAINER, type CnRating } from "@/lib/charity-navigator/rating";
import { HIGHEST_IMPACT_RULE, HIGHEST_IMPACT_SLUG, highestImpactLabel } from "@/lib/highest-impact";
import { buttonPrimary, buttonSecondary, chip, textLink } from "@/components/ui/buttons";
import { areaOptions, cityOptions, countByCategory, discoverSections, parseDiscoverParams, resolveArea, type DirectoryOrg } from "@/lib/directory";
import { stateName } from "@/lib/everyorg/address";
import { SERVICE_AREA_LABELS, areaLabel, areaParamValue, myAreaFromFilter, placeLine, type Area } from "@/lib/area";
import { loadMyArea, loadRegions } from "@/lib/area-store";
import { saveAreaFromDiscover } from "@/app/actions/area";
import { safeExternalUrl } from "@/lib/feed";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const selectClass = "w-full rounded-control border bg-inset px-3 py-2 text-base text-fg";
const badge = "inline-flex rounded-full border bg-inset px-2 py-0.5 text-sm text-fg";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

type Filters = { category: string | null; q: string; area: Area | null; volunteer: boolean };

function discoverHref({ category, q, area, volunteer }: Filters): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  if (area) {
    params.set("area", areaParamValue(area));
    if (area.city) params.set("city", area.city);
  }
  if (volunteer) params.set("volunteer", "1");
  const query = params.toString();
  return query ? `/discover?${query}` : "/discover";
}

/** Same area (for "is this already my area?"): same region or state, same city ignoring case. */
function sameArea(a: Area | null, b: Area | null): boolean {
  if (!a || !b || a.kind !== b.kind || (a.city ?? "").toLowerCase() !== (b.city ?? "").toLowerCase()) return false;
  return a.kind === "region" ? b.kind === "region" && a.region.slug === b.region.slug : b.kind === "state" && a.state === b.state;
}

/** The request's time, for the "rating may be out of date" check (read outside rendering). */
function requestTime(): Date {
  return new Date();
}

type ListedOrg = DirectoryOrg &
  CnRating & {
    website: string | null;
    everyOrgSlug: string | null;
    logoUrl: string | null;
    ein: string | null;
    volunteerUrl: string | null;
    categories: { slug: string; name: string }[];
  };

function OrgCard({
  org,
  now,
  following,
  signedIn,
  returnTo,
}: {
  org: ListedOrg;
  now: Date;
  following: boolean;
  signedIn: boolean;
  returnTo: string;
}) {
  const website = safeExternalUrl(org.website);
  const volunteerUrl = org.acceptsVolunteers ? safeExternalUrl(org.volunteerUrl) : null;
  const impactLabel = highestImpactLabel(org);
  const place = placeLine(org);
  return (
    <Card as="li" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <OrgLogo orgId={org.id} hasLogo={Boolean(org.logoUrl)} size={44} />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">
            {org.everyOrgSlug ? (
              <Link href={`/org/${encodeURIComponent(org.everyOrgSlug)}`} className="hover:underline">
                {org.name}
              </Link>
            ) : (
              org.name
            )}
          </h3>
          {impactLabel && <p className="text-sm font-medium text-muted">{impactLabel}</p>}
          {place && <p className="text-sm text-muted">{place}</p>}
        </div>
      </div>
      {(org.serviceArea || org.acceptsVolunteers) && (
        <p className="flex flex-wrap gap-2">
          {org.serviceArea && <span className={badge}>{SERVICE_AREA_LABELS[org.serviceArea]}</span>}
          {org.acceptsVolunteers && <span className={badge}>Volunteers welcome</span>}
        </p>
      )}
      {org.description && <p className="text-fg">{org.description}</p>}
      <CharityNavigatorBadge rating={org} now={now} />
      <div className="flex flex-wrap gap-2">
        {org.categories.map((c) => (
          <Link
            key={c.slug}
            href={discoverHref({ category: c.slug, q: "", area: null, volunteer: false })}
            className="rounded-full border bg-inset px-3 py-1 text-sm text-fg hover:bg-accent-soft"
          >
            {c.name}
          </Link>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-3 border-t pt-3">
        <FollowButton organizationId={org.id} organizationName={org.name} following={following} signedIn={signedIn} returnTo={returnTo} />
        {org.everyOrgSlug && (
          <a href={`https://www.every.org/${encodeURIComponent(org.everyOrgSlug)}`} target="_blank" rel="noopener noreferrer" className={buttonPrimary}>
            View on Every.org
          </a>
        )}
        {volunteerUrl && (
          <a href={volunteerUrl} target="_blank" rel="noopener noreferrer" className={buttonSecondary}>
            Volunteer
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
}

export default async function DiscoverPage({ searchParams }: Props) {
  const params = await searchParams;
  const parsed = parseDiscoverParams(params);
  const { q, volunteer } = parsed;
  const now = requestTime();
  // Discover is public; signed-in visitors also see Follow buttons and My area.
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const [categories, regions, orgRows, follows, mine] = await Promise.all([
    prisma.causeCategory.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, description: true } }),
    loadRegions(),
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
        locationCity: true,
        locationState: true,
        locationCounty: true,
        serviceArea: true,
        acceptsVolunteers: true,
        volunteerUrl: true,
        cnScore: true,
        cnStars: true,
        cnProfileUrl: true,
        cnCheckedAt: true,
        cnSource: true,
        categories: { select: { slug: true, name: true }, orderBy: { name: "asc" } },
      },
    }),
    userId ? prisma.organizationFollow.findMany({ where: { userId }, select: { organizationId: true } }) : [],
    userId ? loadMyArea(userId) : null,
  ]);
  const followed = new Set(follows.map((f) => f.organizationId));
  const orgs: ListedOrg[] = orgRows.map((o) => ({ ...o, categorySlugs: o.categories.map((c) => c.slug) }));

  const area = resolveArea(parsed.area, parsed.city, regions);
  const options = areaOptions(orgs, regions);
  const cities = area ? cityOptions(orgs, area) : [];
  // A city with no organizations yet (e.g. from My area) still shows as chosen.
  if (area?.city && !cities.some((c) => c.value.toLowerCase() === area.city?.toLowerCase())) {
    cities.push({ value: area.city, label: area.city, count: 0 });
  }
  const areaName = area ? areaLabel(area, stateName) : null;

  // Cause chips count the main list, ignoring the search: with an area, the
  // organizations serving it (national ones are in their own, folded
  // section); without, everything listed. A cause with only national
  // organizations here still gets a chip, showing (0) local ones.
  const inScope = discoverSections(orgs, { category: null, q: "", volunteer, area });
  const listed = area ? inScope.serving : [...inScope.serving, ...inScope.national];
  const counts = countByCategory(listed);
  const nationalCounts = countByCategory(inScope.national);
  const chips = categories.filter((c) => (counts.get(c.slug) ?? 0) > 0 || (nationalCounts.get(c.slug) ?? 0) > 0 || c.slug === parsed.category);
  const selected = categories.find((c) => c.slug === parsed.category) ?? null;
  const filters: Filters = { category: selected?.slug ?? null, q, area, volunteer };
  const { serving, national } = discoverSections(orgs, { ...filters });
  const returnTo = discoverHref(filters);
  const saveable = userId && !sameArea(area, mine) ? myAreaFromFilter(area) : null;

  const card = (org: ListedOrg) => (
    <OrgCard key={org.id} org={org} now={now} following={followed.has(org.id)} signedIn={userId !== null} returnTo={returnTo} />
  );
  const nothingMatches = (
    <Card>
      <p>
        Nothing matches{q && <> &ldquo;{q}&rdquo;</>}
        {selected && <> in {selected.name}</>}
        {areaName && <> serving {areaName}</>}
        {volunteer && <> that takes volunteers</>}.{" "}
        {area && (
          <>
            Small local nonprofits are added as admins verify them.{" "}
          </>
        )}
        <Link href="/discover" className={textLink}>
          Show everything
        </Link>
      </p>
    </Card>
  );

  return (
    <div className="space-y-(--space-section)">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Discover</h1>
        <p className="text-muted">Verified nonprofits you can support or volunteer with, by cause and place.</p>
      </header>

      <FollowNotice value={params.notice} />

      <Card className="space-y-4">
        <form action="/discover" method="get" role="search" className="flex flex-wrap items-end gap-2">
          {selected && <input type="hidden" name="category" value={selected.slug} />}
          <input
            name="q"
            defaultValue={q}
            aria-label="Search organizations"
            placeholder="Search by name or mission"
            maxLength={100}
            className="min-w-0 flex-1 basis-56 rounded-control border bg-inset px-3 py-2 text-base text-fg sm:max-w-md"
          />
          <label className="flex min-w-0 grow basis-48 flex-col gap-1 text-sm font-medium text-muted sm:grow-0 sm:basis-56">
            Area
            <select name="area" defaultValue={area ? areaParamValue(area) : ""} className={selectClass}>
              <option value="">Anywhere</option>
              {options.regions.length > 0 && (
                <optgroup label="Regions">
                  {options.regions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} ({r.count})
                    </option>
                  ))}
                </optgroup>
              )}
              {options.states.length > 0 && (
                <optgroup label="States">
                  {options.states.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label} ({st.count})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          {/* Cities appear once an area is chosen (press Search after picking an area if JavaScript is off). */}
          {area && cities.length > 0 && (
            <label className="flex min-w-0 grow basis-48 flex-col gap-1 text-sm font-medium text-muted sm:grow-0 sm:basis-56">
              City
              <select name="city" defaultValue={area.city ?? ""} className={selectClass}>
                <option value="">Any city</option>
                {cities.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label} ({c.count})
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex min-h-11 items-center gap-2 rounded-control border bg-inset px-3 py-2 text-base text-fg">
            <input type="checkbox" name="volunteer" value="1" defaultChecked={volunteer} className="h-5 w-5" />
            Volunteer opportunities
          </label>
          <button className={buttonPrimary}>Search</button>
        </form>

        {(areaName || (mine && !area)) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            {areaName ? (
              <>
                <span>
                  Showing organizations serving <span className="font-semibold text-heading">{areaName}</span>.
                </span>
                <Link href={discoverHref({ ...filters, area: null })} className={textLink}>
                  Any location
                </Link>
                {saveable && (
                  <form action={saveAreaFromDiscover}>
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input type="hidden" name="kind" value={saveable.kind} />
                    {saveable.kind === "region" && <input type="hidden" name="regionSlug" value={saveable.regionSlug} />}
                    {saveable.kind === "city" && (
                      <>
                        <input type="hidden" name="state" value={saveable.state} />
                        <input type="hidden" name="city" value={saveable.city} />
                      </>
                    )}
                    <button className={`${buttonSecondary} min-h-9 px-3 py-1 text-sm`}>Save as my area</button>
                  </form>
                )}
              </>
            ) : (
              mine && (
                <Link href={discoverHref({ ...filters, area: mine })} className={textLink}>
                  Use my area ({areaLabel(mine, stateName)})
                </Link>
              )
            )}
          </div>
        )}

        <nav aria-label="Causes" className="flex flex-wrap gap-2">
          <Link href={discoverHref({ ...filters, category: null })} className={chip(!selected)} aria-current={!selected ? "page" : undefined}>
            All ({listed.length})
          </Link>
          {chips.map((c) => (
            <Link
              key={c.slug}
              href={discoverHref({ ...filters, category: c.slug })}
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
            <span className="font-semibold text-heading">Who&apos;s included:</span> {HIGHEST_IMPACT_RULE}{" "}
            <Link href="/why-give" className={textLink}>
              Why these charities?
            </Link>
          </p>
        )}
        {parsed.category && !selected && <p className="text-muted">That cause doesn&apos;t exist. Showing all causes.</p>}
        {parsed.area && !area && <p className="text-muted">That area doesn&apos;t exist. Showing everywhere.</p>}
      </Card>

      {orgs.length === 0 ? (
        <Card>
          <p>No organizations yet. We only list nonprofits we have verified; check back soon.</p>
        </Card>
      ) : (
        <>
          <section aria-labelledby="serving-heading" className="space-y-3">
            <h2 id="serving-heading" className="text-xl font-semibold">
              {areaName ? `Serving ${areaName}` : "Organizations"} ({serving.length})
            </h2>
            {areaName && serving.length > 0 && (
              <p className="text-sm text-muted">Local organizations first, then regional and statewide ones.</p>
            )}
            {serving.length === 0 ? nothingMatches : <ul className="grid gap-(--space-section) sm:grid-cols-2">{serving.map(card)}</ul>}
          </section>

          {national.length > 0 && (
            // Open when no area is chosen; with an area, folded away so local organizations come first.
            <details open={!area} className="group space-y-3">
              <summary className="cursor-pointer text-xl font-semibold">
                National organizations ({national.length})
                <span className="ms-2 text-sm font-normal text-muted">
                  They serve the whole country{areaName ? `, including ${areaName}` : ""}.
                </span>
              </summary>
              <ul className="mt-3 grid gap-(--space-section) sm:grid-cols-2">{national.map(card)}</ul>
            </details>
          )}
        </>
      )}

      {[...serving, ...national].some((o) => o.cnScore !== null) && (
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
