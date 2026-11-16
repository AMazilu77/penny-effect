// Discover: filtering the directory of visible organizations by category, a
// search term, and the state and city of the organization's public address
// (stored from Every.org, see src/lib/everyorg/address.ts). Pure (no database), so it's unit-tested. The page loads the
// visible organizations once and filters here: the directory is small, and
// plain string matching avoids SQL wildcard surprises ("%", "_").

import { stateCode, stateName } from "@/lib/everyorg/address";

export type DirectoryOrg = {
  id: string;
  name: string;
  description: string | null;
  categorySlugs: string[];
  /** Two-letter state code and city of the public address; null when unknown. */
  locationState?: string | null;
  locationCity?: string | null;
};

export type DiscoverParams = {
  category: string | null;
  q: string;
  /** Two-letter USPS code, e.g. "FL". */
  state?: string | null;
  /** A city name as stored (matched ignoring case and accents); only used with a state. */
  city?: string | null;
};

/** Reads ?category=, ?q=, ?state= and ?city= safely (single values, trimmed, bounded). */
export function parseDiscoverParams(params: Record<string, string | string[] | undefined>): Required<DiscoverParams> {
  const category = typeof params.category === "string" ? params.category.trim().toLowerCase() : "";
  const q = typeof params.q === "string" ? params.q.trim().replace(/\s+/g, " ").slice(0, 100) : "";
  const state = typeof params.state === "string" && params.state.trim() ? stateCode(params.state) : null;
  const rawCity = typeof params.city === "string" ? params.city.trim().replace(/\s+/g, " ") : "";
  // Letters (any language), spaces and . ' - only; a city means nothing without a state.
  const city = state && /^[\p{L} .'-]{1,80}$/u.test(rawCity) ? rawCity : null;
  return { category: /^[a-z0-9-]{1,60}$/.test(category) ? category : null, q, state, city };
}

/** Lowercased, accents removed, so "medecins" finds "Médecins". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Organizations in the category (if any), state (if any) and city (if any,
 * ignoring case and accents) whose name or description contains every word
 * of the search (if any), in their original order.
 */
export function filterDirectory<T extends DirectoryOrg>(orgs: T[], { category, q, state, city }: DiscoverParams): T[] {
  const words = fold(q).split(" ").filter(Boolean);
  const cityKey = state && city ? fold(city) : null;
  return orgs.filter((org) => {
    if (category && !org.categorySlugs.includes(category)) return false;
    if (state && org.locationState !== state) return false;
    if (cityKey && fold(org.locationCity ?? "") !== cityKey) return false;
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

export type PlaceCount = { value: string; label: string; count: number };

/**
 * The states, and the cities in `state`, that have organizations among `orgs`,
 * with counts, for the location selects. States are sorted by name, cities
 * A–Z. Cities that differ only in case or accents are counted as one, shown
 * as first written.
 */
export function locationOptions(orgs: DirectoryOrg[], state: string | null): { states: PlaceCount[]; cities: PlaceCount[] } {
  const states = new Map<string, number>();
  const cities = new Map<string, PlaceCount>();
  for (const org of orgs) {
    if (!org.locationState) continue;
    states.set(org.locationState, (states.get(org.locationState) ?? 0) + 1);
    if (org.locationState === state && org.locationCity) {
      const key = fold(org.locationCity);
      const entry = cities.get(key) ?? { value: org.locationCity, label: org.locationCity, count: 0 };
      entry.count += 1;
      cities.set(key, entry);
    }
  }
  return {
    states: [...states]
      .map(([code, count]) => ({ value: code, label: stateName(code), count }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    cities: [...cities.values()].sort((a, b) => a.label.localeCompare(b.label)),
  };
}
