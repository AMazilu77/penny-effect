// Discover: filtering the directory of visible organizations by cause, a
// search term, an area (a region made of counties, or a state, optionally
// narrowed to a city), and "takes volunteers". Area matching lives in
// src/lib/area.ts. Pure (no database), so it's unit-tested. The page loads
// the visible organizations once and filters here: the directory is small,
// and plain string matching avoids SQL wildcard surprises ("%", "_").
import { stateName } from "@/lib/everyorg/address";
import {
  basedIn,
  cityKey,
  fold,
  parseAreaParam,
  parseCityParam,
  parseVolunteerParam,
  serviceRank,
  servesArea,
  type Area,
  type AreaParam,
  type LocatedOrg,
  type RegionDef,
} from "@/lib/area";

export type DirectoryOrg = LocatedOrg & {
  id: string;
  name: string;
  description: string | null;
  categorySlugs: string[];
  acceptsVolunteers?: boolean;
};

export type DiscoverParams = {
  category: string | null;
  q: string;
  /** ?area= (or the older ?state=): a region slug or a state code. */
  area: AreaParam;
  /** ?city=: narrows the area to one city. Ignored without an area. */
  city: string | null;
  /** ?volunteer=1: only organizations that take volunteers. */
  volunteer: boolean;
};

/** Reads Discover's query string safely (single values, trimmed, bounded, validated). */
export function parseDiscoverParams(params: Record<string, string | string[] | undefined>): DiscoverParams {
  const category = typeof params.category === "string" ? params.category.trim().toLowerCase() : "";
  const q = typeof params.q === "string" ? params.q.trim().replace(/\s+/g, " ").slice(0, 100) : "";
  const area = parseAreaParam(params.area, params.state);
  return {
    category: /^[a-z0-9-]{1,60}$/.test(category) ? category : null,
    q,
    area,
    // A city means nothing without an area.
    city: area ? parseCityParam(params.city) : null,
    volunteer: parseVolunteerParam(params.volunteer),
  };
}

/**
 * The area for an ?area= value: a known region (by slug) or a state, with
 * the city if given. An unknown region is no area.
 */
export function resolveArea(param: AreaParam, city: string | null, regions: readonly RegionDef[]): Area | null {
  if (!param) return null;
  if ("state" in param) return { kind: "state", state: param.state, city };
  const region = regions.find((r) => r.slug === param.regionSlug);
  return region ? { kind: "region", region, city } : null;
}

export type DirectoryFilter = { category: string | null; q: string; volunteer: boolean };

/** Cause, search (every word, in name or description, ignoring case and accents) and volunteering. */
export function matchesFilters(org: DirectoryOrg, { category, q, volunteer }: DirectoryFilter): boolean {
  if (category && !org.categorySlugs.includes(category)) return false;
  if (volunteer && !org.acceptsVolunteers) return false;
  const words = fold(q).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold(`${org.name} ${org.description ?? ""}`);
  return words.every((w) => haystack.includes(w));
}

export type DiscoverSections<T> = {
  /**
   * With an area: organizations serving it (based there and not national,
   * or statewide in its state), local first. Without: every organization
   * that isn't national, in name order.
   */
  serving: T[];
  /** National organizations matching the other filters, in their own section. */
  national: T[];
};

/**
 * Discover's two lists. National organizations get their own section so
 * small local ones aren't buried under them. `orgs` come in name order;
 * within an area, local ones move to the top (stable, so names stay A–Z
 * within each service area).
 */
export function discoverSections<T extends DirectoryOrg>(orgs: readonly T[], filter: DirectoryFilter & { area: Area | null }): DiscoverSections<T> {
  const matching = orgs.filter((o) => matchesFilters(o, filter));
  const national = matching.filter((o) => o.serviceArea === "NATIONAL");
  const { area } = filter;
  const serving = area
    ? matching.filter((o) => servesArea(o, area)).sort((a, b) => serviceRank(a.serviceArea) - serviceRank(b.serviceArea))
    : matching.filter((o) => o.serviceArea !== "NATIONAL");
  return { serving, national };
}

/** How many organizations each category has (for the chips). */
export function countByCategory(orgs: readonly DirectoryOrg[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const org of orgs) for (const slug of org.categorySlugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  return counts;
}

export type PlaceCount = { value: string; label: string; count: number };

/**
 * The area choices with how many organizations serve each: every region
 * (A–Z), and the states that have organizations (by name). National
 * organizations aren't counted; they show in every area's national section.
 */
export function areaOptions(orgs: readonly DirectoryOrg[], regions: readonly RegionDef[]): { regions: PlaceCount[]; states: PlaceCount[] } {
  const local = orgs.filter((o) => o.serviceArea !== "NATIONAL");
  const states = new Set(local.map((o) => o.locationState).filter((s): s is string => Boolean(s)));
  return {
    regions: regions
      .map((region) => ({
        value: region.slug,
        label: region.name,
        count: local.filter((o) => servesArea(o, { kind: "region", region, city: null })).length,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    states: [...states]
      .map((state) => ({
        value: state,
        label: stateName(state),
        count: local.filter((o) => servesArea(o, { kind: "state", state, city: null })).length,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

/**
 * The cities in an area that have (non-national) organizations based there,
 * A–Z with counts. Cities that differ only in case, accents or dots count as
 * one, shown as first written.
 */
export function cityOptions(orgs: readonly DirectoryOrg[], area: Area): PlaceCount[] {
  const whole: Area = { ...area, city: null };
  const cities = new Map<string, PlaceCount>();
  for (const org of orgs) {
    if (org.serviceArea === "NATIONAL" || !org.locationCity || !basedIn(org, whole)) continue;
    const key = cityKey(org.locationCity);
    const entry = cities.get(key) ?? { value: org.locationCity, label: org.locationCity, count: 0 };
    entry.count += 1;
    cities.set(key, entry);
  }
  return [...cities.values()].sort((a, b) => a.label.localeCompare(b.label));
}
