// Discover: browse and search the verified directory (Milestone 2).
// Category chips come from the database and link to ?category=<slug>; state
// and city (?state=FL&city=Miami) come from each organization's public
// address. Everything is in the URL, so a filtered view can be shared, and
// the filters are a plain GET form that works without JavaScript. Only organizations users may see are listed
// (src/lib/organizations.ts).
import Link from "next/link";
import { getServerSession } from "next-auth";
import { FollowButton, FollowNotice } from "@/components/FollowButton";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { CharityNavigatorBadge } from "@/components/CharityNavigatorBadge";
import { CN_EXPLAINER } from "@/lib/charity-navigator/rating";
import { HIGHEST_IMPACT_RULE, HIGHEST_IMPACT_SLUG, highestImpactLabel } from "@/lib/highest-impact";
import { buttonPrimary, chip, textLink } from "@/components/ui/buttons";
import { countByCategory, filterDirectory, locationOptions, parseDiscoverParams } from "@/lib/directory";
import { stateName } from "@/lib/everyorg/address";
import { safeExternalUrl } from "@/lib/feed";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const selectClass = "w-full rounded-control border bg-inset px-3 py-2 text-base text-fg";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

type Place = { state: string | null; city: string | null };
const NOWHERE: Place = { state: null, city: null };

function discoverHref(category: string | null, q: string, { state, city }: Place = NOWHERE): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  if (state) params.set("state", state);
  if (state && city) params.set("city", city);
  const query = params.toString();
  return query ? `/discover?${query}` : "/discover";
}

/** The request's time, for the "rating may be out of date" check (read outside rendering). */
function requestTime(): Date {
  return new Date();
}

export default async function DiscoverPage({ searchParams }: Props) {
  const params = await searchParams;
  const { category, q, state, city: requestedCity } = parseDiscoverParams(params);
  const now = requestTime();
  // Discover is public; signed-in visitors also see Follow buttons.
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const [categories, orgRows, follows] = await Promise.all([
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
        locationCity: true,
        locationState: true,
        cnScore: true,
        cnStars: true,
        cnProfileUrl: true,
        cnCheckedAt: true,
        cnSource: true,
        categories: { select: { slug: true, name: true }, orderBy: { name: "asc" } },
      },
    }),
    userId ? prisma.organizationFollow.findMany({ where: { userId }, select: { organizationId: true } }) : [],
  ]);
  const followed = new Set(follows.map((f) => f.organizationId));

  const orgs = orgRows.map((o) => ({ ...o, categorySlugs: o.categories.map((c) => c.slug) }));

  // Location: the states (and the chosen state's cities) that have organizations.
  const places = locationOptions(orgs, state);
  // A city that isn't in the chosen state (e.g. left over after changing state) is dropped.
  const city = places.cities.find((c) => c.value.toLowerCase() === requestedCity?.toLowerCase())?.value ?? null;
  const place: Place = { state, city };
  const placeLabel = state ? (city ? `${city}, ${state}` : stateName(state)) : null;

  // Cause chips count organizations in the chosen place.
  const inPlace = state ? filterDirectory(orgs, { category: null, q: "", state, city }) : orgs;
  const counts = countByCategory(inPlace);
  // Chips: categories that have at least one organization (plus the selected one).
  const chips = categories.filter((c) => (counts.get(c.slug) ?? 0) > 0 || c.slug === category);
  const selected = categories.find((c) => c.slug === category) ?? null;
  const results = filterDirectory(orgs, { category: selected ? selected.slug : null, q, state, city });
  const returnTo = discoverHref(selected?.slug ?? null, q, place);

  return (
    <div className="space-y-(--space-section)">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Discover</h1>
        <p className="text-muted">Verified nonprofits you can support, by cause and place.</p>
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
          {(places.states.length > 0 || state) && (
            <label className="flex min-w-0 grow basis-48 flex-col gap-1 text-sm font-medium text-muted sm:grow-0 sm:basis-56">
              State
              <select name="state" defaultValue={state ?? ""} className={selectClass}>
                <option value="">Any state</option>
                {places.states.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label} ({s.count})
                  </option>
                ))}
              </select>
            </label>
          )}
          {/* Cities appear once a state is chosen (press Search after picking a state if JavaScript is off). */}
          {state && places.cities.length > 0 && (
            <label className="flex min-w-0 grow basis-48 flex-col gap-1 text-sm font-medium text-muted sm:grow-0 sm:basis-56">
              City
              <select name="city" defaultValue={city ?? ""} className={selectClass}>
                <option value="">Any city in {state}</option>
                {places.cities.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label} ({c.count})
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className={buttonPrimary}>Search</button>
        </form>
        {placeLabel && (
          <p className="text-sm">
            Showing organizations based in <span className="font-semibold text-heading">{placeLabel}</span>.{" "}
            <Link href={discoverHref(selected?.slug ?? null, q)} className={textLink}>
              Any location
            </Link>
          </p>
        )}

        <nav aria-label="Causes" className="flex flex-wrap gap-2">
          <Link href={discoverHref(null, q, place)} className={chip(!selected)} aria-current={!selected ? "page" : undefined}>
            All ({inPlace.length})
          </Link>
          {chips.map((c) => (
            <Link
              key={c.slug}
              href={discoverHref(c.slug, q, place)}
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
            {selected && <> in {selected.name}</>}
            {placeLabel && <> based in {placeLabel}</>}.{" "}
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
                    {org.locationState && (
                      <p className="text-sm text-muted">
                        {org.locationCity ? `${org.locationCity}, ${org.locationState}` : stateName(org.locationState)}
                      </p>
                    )}
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
                  <FollowButton
                    organizationId={org.id}
                    organizationName={org.name}
                    following={followed.has(org.id)}
                    signedIn={userId !== null}
                    returnTo={returnTo}
                  />
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
