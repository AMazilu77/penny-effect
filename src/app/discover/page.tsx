// Discover: browse and search the verified directory (Milestone 2).
// Category chips come from the database and link to ?category=<slug>, so a
// filtered view can be shared. Only organizations users may see are listed
// (src/lib/organizations.ts).
import Link from "next/link";
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

export default async function DiscoverPage({ searchParams }: Props) {
  const { category, q } = parseDiscoverParams(await searchParams);

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

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm ${active ? "border-emerald-600 bg-emerald-600 text-white" : "border-black/10 hover:bg-black/5"}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-2">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Discover</h1>
        <p className="opacity-70">Verified nonprofits you can support, by cause.</p>
      </header>

      <form action="/discover" method="get" role="search" className="flex gap-2">
        {selected && <input type="hidden" name="category" value={selected.slug} />}
        <input
          name="q"
          defaultValue={q}
          aria-label="Search organizations"
          placeholder="Search by name or mission"
          maxLength={100}
          className="w-full max-w-md rounded-lg border border-black/15 bg-transparent px-3 py-2"
        />
        <button className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5">Search</button>
      </form>

      <nav aria-label="Causes" className="flex flex-wrap gap-2">
        <Link href={discoverHref(null, q)} className={chipClass(!selected)} aria-current={!selected ? "page" : undefined}>
          All ({orgs.length})
        </Link>
        {chips.map((c) => (
          <Link
            key={c.slug}
            href={discoverHref(c.slug, q)}
            className={chipClass(selected?.slug === c.slug)}
            aria-current={selected?.slug === c.slug ? "page" : undefined}
          >
            {c.name} ({counts.get(c.slug) ?? 0})
          </Link>
        ))}
      </nav>

      {selected?.description && <p className="text-sm opacity-70">{selected.description}</p>}
      {category && !selected && <p className="text-sm opacity-70">That cause doesn&apos;t exist. Showing all causes.</p>}

      {orgs.length === 0 ? (
        <p className="rounded-xl border border-black/10 p-4 opacity-80">
          No organizations yet. We only list nonprofits we have verified; check back soon.
        </p>
      ) : results.length === 0 ? (
        <p className="rounded-xl border border-black/10 p-4 opacity-80">
          Nothing matches{q && <> &ldquo;{q}&rdquo;</>}
          {selected && <> in {selected.name}</>}.{" "}
          <Link href="/discover" className="underline">
            Show everything
          </Link>
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {results.map((org) => {
            const website = safeExternalUrl(org.website);
            return (
              <li key={org.id} className="space-y-2 rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm">
                <h2 className="font-semibold">{org.name}</h2>
                {org.description && <p className="text-sm opacity-80">{org.description}</p>}
                <div className="flex flex-wrap gap-1">
                  {org.categories.map((c) => (
                    <Link key={c.slug} href={discoverHref(c.slug, "")} className="rounded-full bg-black/5 px-2 py-0.5 text-xs hover:bg-black/10">
                      {c.name}
                    </Link>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {org.everyOrgSlug && (
                    <a
                      href={`https://www.every.org/${encodeURIComponent(org.everyOrgSlug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      View on Every.org
                    </a>
                  )}
                  {website && (
                    <a href={website} target="_blank" rel="noopener noreferrer" className="underline opacity-70">
                      Website
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
