// Local nonprofits (D-028): matching organizations to an area the user
// picked (a region made of counties, a state, or a city), service areas, and
// "My area". Pure (no database), so it's unit-tested; Discover, the feed's
// Near me tab, the profile and the admin pages all use these same rules.
//
// Only areas the user chooses. Nothing here guesses where a user is.
import { z } from "zod";
import { stateCode } from "@/lib/everyorg/address";

// ---- Service areas ----

export const SERVICE_AREAS = ["LOCAL", "REGIONAL", "STATEWIDE", "NATIONAL"] as const;
export type ServiceAreaName = (typeof SERVICE_AREAS)[number];

export const SERVICE_AREA_LABELS: Record<ServiceAreaName, string> = {
  LOCAL: "Local",
  REGIONAL: "Regional",
  STATEWIDE: "Statewide",
  NATIONAL: "National",
};

export const SERVICE_AREA_HELP: Record<ServiceAreaName, string> = {
  LOCAL: "Serves one city or community",
  REGIONAL: "Serves several cities or counties",
  STATEWIDE: "Serves the whole state it's based in",
  NATIONAL: "Serves the whole country, or beyond",
};

// ---- Text matching ----

/** Lowercased, accents removed, single spaces: "Médecins " → "medecins". */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * A county name as stored and shown: trimmed, single spaces, without a
 * trailing "County" ("palm beach county" stays "palm beach" as typed, but
 * "Palm Beach County" → "Palm Beach").
 */
export function normalizeCountyName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+county$/i, "")
    .trim();
}

/**
 * The key two county names are compared by, so "Miami-Dade", "Miami Dade
 * County", "St. Lucie" and "Saint Lucie" match. Ignores case, accents,
 * hyphens and dots, a trailing County/Parish/Borough, and "Saint" vs "St".
 */
export function countyKey(raw: string): string {
  return fold(raw)
    .replace(/[-.']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ (county|parish|borough)$/, "")
    .replace(/^(saint|st|ste|sainte) /, "st ");
}

/** The key two city names are compared by: case, accents, dots and extra spaces ignored. */
export function cityKey(raw: string): string {
  return fold(raw).replace(/\./g, "").replace(/\s+/g, " ").trim();
}

// ---- Areas and matching ----

export type RegionCountyRef = { state: string; county: string };
export type RegionDef = { slug: string; name: string; counties: readonly RegionCountyRef[] };

/** Where an organization is, and who it serves. */
export type LocatedOrg = {
  locationState?: string | null;
  locationCounty?: string | null;
  locationCity?: string | null;
  serviceArea?: ServiceAreaName | null;
};

/** An area picked in a filter or as My area. `city` narrows a region or state to one city. */
export type Area =
  | { kind: "region"; region: RegionDef; city: string | null }
  | { kind: "state"; state: string; city: string | null };

/** The states an area is in (a region can span several). */
export function areaStates(area: Area): string[] {
  return area.kind === "state" ? [area.state] : [...new Set(area.region.counties.map((c) => c.state))];
}

/** Is the organization's county one of the region's? Both state and county must match. */
export function inRegion(org: LocatedOrg, region: RegionDef): boolean {
  if (!org.locationState || !org.locationCounty) return false;
  const key = countyKey(org.locationCounty);
  return region.counties.some((c) => c.state === org.locationState && countyKey(c.county) === key);
}

/** Is the organization based in the area (by its address, whatever it serves)? */
export function basedIn(org: LocatedOrg, area: Area): boolean {
  const inPlace = area.kind === "region" ? inRegion(org, area.region) : org.locationState === area.state;
  if (!inPlace) return false;
  if (!area.city) return true;
  return Boolean(org.locationCity) && cityKey(org.locationCity ?? "") === cityKey(area.city);
}

/**
 * Does the organization serve the area, for Discover's main list and the
 * feed's Near me tab? Yes if it's based there (and isn't national), or if
 * it's statewide in a state the area is in. National organizations never
 * count: they're listed in their own section, so local ones aren't buried.
 */
export function servesArea(org: LocatedOrg, area: Area): boolean {
  if (org.serviceArea === "NATIONAL") return false;
  if (basedIn(org, area)) return true;
  return org.serviceArea === "STATEWIDE" && Boolean(org.locationState) && areaStates(area).includes(org.locationState ?? "");
}

/** List order inside an area: local first, then regional, not yet set, statewide. */
const SERVICE_RANK: Record<ServiceAreaName | "UNSET", number> = { LOCAL: 0, REGIONAL: 1, UNSET: 2, STATEWIDE: 3, NATIONAL: 4 };

export function serviceRank(area: ServiceAreaName | null | undefined): number {
  return SERVICE_RANK[area ?? "UNSET"];
}

/** A short "West Palm Beach, FL · Palm Beach County" line, or null when unknown. */
export function placeLine(org: LocatedOrg): string | null {
  if (!org.locationState) return null;
  const town = org.locationCity ? `${org.locationCity}, ${org.locationState}` : org.locationState;
  return org.locationCounty ? `${town} · ${org.locationCounty} County` : town;
}

/** How an area reads on the page: "South Florida", "West Palm Beach, FL", "Florida (FL)". */
export function areaLabel(area: Area, stateName: (code: string) => string): string {
  if (area.kind === "region") return area.city ? `${area.city} (${area.region.name})` : area.region.name;
  return area.city ? `${area.city}, ${area.state}` : stateName(area.state);
}

// ---- Discover's ?area= / ?city= / ?volunteer= ----

/** A region slug: lowercase words joined by hyphens, at least 3 characters (so it's never a state code). */
export const REGION_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const regionSlug = z.string().min(3).max(60).regex(REGION_SLUG);
/** A city as typed: letters (any language), spaces and . ' - only. */
const CITY = /^[\p{L} .'-]{1,80}$/u;

export type AreaParam = { regionSlug: string } | { state: string } | null;

/**
 * Reads ?area= (a region slug, or a state as a 2-letter code or name) and
 * the older ?state= that #60 links used. Anything else is no area.
 */
export function parseAreaParam(area: unknown, legacyState?: unknown): AreaParam {
  const raw = typeof area === "string" ? area.trim() : typeof legacyState === "string" ? legacyState.trim() : "";
  if (!raw || raw.length > 60) return null;
  if (/^[A-Za-z]{2}$/.test(raw)) {
    const code = stateCode(raw);
    return code ? { state: code } : null;
  }
  const slug = regionSlug.safeParse(raw);
  if (slug.success) return { regionSlug: slug.data };
  const code = stateCode(raw);
  return code ? { state: code } : null;
}

/** ?city=: a city name as typed, or null. */
export function parseCityParam(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const city = value.trim().replace(/\s+/g, " ");
  return CITY.test(city) ? city : null;
}

/** ?volunteer=1 (or on/true, from the checkbox): only organizations that take volunteers. */
export function parseVolunteerParam(value: unknown): boolean {
  return typeof value === "string" && ["1", "on", "true"].includes(value.trim().toLowerCase());
}

/** The value of an area in Discover's ?area= (region slug or state code). */
export function areaParamValue(area: Area): string {
  return area.kind === "region" ? area.region.slug : area.state;
}

// ---- My area (the user's own choice, saved on their account) ----

/** Body of PUT /api/profile/area, and the Discover "Save as my area" form. Strict: nothing else is accepted. */
export const myAreaSchema = z.union([
  z.strictObject({ kind: z.literal("none") }),
  z.strictObject({ kind: z.literal("region"), regionSlug }),
  z.strictObject({
    kind: z.literal("city"),
    state: z
      .string()
      .trim()
      .transform((s) => stateCode(s))
      .refine((s): s is string => s !== null, "Choose a state."),
    city: z
      .string()
      .trim()
      .transform((c) => c.replace(/\s+/g, " "))
      .refine((c) => CITY.test(c), "Enter a city name (letters, spaces, . ' - only)."),
  }),
]);

export type MyAreaInput = z.infer<typeof myAreaSchema>;

/** The User columns for a My area choice (the CHECK constraint allows exactly these shapes). */
export function myAreaColumns(
  input: { kind: "none" } | { kind: "region"; regionId: string } | { kind: "city"; state: string; city: string },
): { areaRegionId: string | null; areaCity: string | null; areaState: string | null } {
  switch (input.kind) {
    case "none":
      return { areaRegionId: null, areaCity: null, areaState: null };
    case "region":
      return { areaRegionId: input.regionId, areaCity: null, areaState: null };
    case "city":
      return { areaRegionId: null, areaCity: input.city, areaState: input.state };
  }
}

/** A user's saved My area as an Area, or null when none is set. */
export function myArea(user: {
  areaRegion: RegionDef | null;
  areaCity: string | null;
  areaState: string | null;
}): Area | null {
  if (user.areaRegion) return { kind: "region", region: user.areaRegion, city: null };
  if (user.areaCity && user.areaState) return { kind: "state", state: user.areaState, city: user.areaCity };
  return null;
}

/**
 * What "Save as my area" on Discover would save for the area being viewed:
 * the city if one is chosen (with its state; for a region spanning several
 * states there's no single state, so the region), else the region. A whole
 * state isn't a My area (too broad), so that returns null.
 */
export function myAreaFromFilter(area: Area | null): MyAreaInput | null {
  if (!area) return null;
  if (area.city) {
    const states = areaStates(area);
    if (states.length === 1) return { kind: "city", state: states[0], city: area.city };
  }
  return area.kind === "region" ? { kind: "region", regionSlug: area.region.slug } : null;
}
