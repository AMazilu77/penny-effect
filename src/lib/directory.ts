// Discover: filtering the directory of visible organizations by category and
// a search term. Pure (no database), so it's unit-tested. The page loads the
// visible organizations once and filters here: the directory is small, and
// plain string matching avoids SQL wildcard surprises ("%", "_").

export type DirectoryOrg = {
  id: string;
  name: string;
  description: string | null;
  categorySlugs: string[];
};

export type DiscoverParams = { category: string | null; q: string };

/** Reads ?category= and ?q= safely (single values, trimmed, bounded). */
export function parseDiscoverParams(params: Record<string, string | string[] | undefined>): DiscoverParams {
  const category = typeof params.category === "string" ? params.category.trim().toLowerCase() : "";
  const q = typeof params.q === "string" ? params.q.trim().replace(/\s+/g, " ").slice(0, 100) : "";
  return { category: /^[a-z0-9-]{1,60}$/.test(category) ? category : null, q };
}

/** Lowercased, accents removed, so "medecins" finds "Médecins". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Organizations in the category (if any) whose name or description contains
 * every word of the search (if any), in their original order.
 */
export function filterDirectory<T extends DirectoryOrg>(orgs: T[], { category, q }: DiscoverParams): T[] {
  const words = fold(q).split(" ").filter(Boolean);
  return orgs.filter((org) => {
    if (category && !org.categorySlugs.includes(category)) return false;
    if (words.length === 0) return true;
    const haystack = fold(`${org.name} ${org.description ?? ""}`);
    return words.every((w) => haystack.includes(w));
  });
}

/** How many organizations each category has (for the chips). */
export function countByCategory(orgs: DirectoryOrg[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const org of orgs) for (const slug of org.categorySlugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  return counts;
}
