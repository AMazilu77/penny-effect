import { describe, expect, it } from "vitest";
import {
  areaOptions,
  cityOptions,
  countByCategory,
  discoverSections,
  matchesFilters,
  parseDiscoverParams,
  resolveArea,
  type DirectoryFilter,
  type DirectoryOrg,
} from "@/lib/directory";
import type { Area, RegionDef } from "@/lib/area";

const orgs: DirectoryOrg[] = [
  { id: "1", name: "The Against Malaria Foundation", description: "Funds insecticidal nets.", categorySlugs: ["medical-research", "highest-impact"] },
  { id: "2", name: "GiveDirectly", description: "Sends cash to people in extreme poverty.", categorySlugs: ["humanitarian-aid", "highest-impact"] },
  { id: "3", name: "Médecins Sans Frontières", description: null, categorySlugs: ["humanitarian-aid"] },
  { id: "4", name: "100% Literacy_Fund", description: "Books.", categorySlugs: ["education"] },
];
const noFilter: DirectoryFilter = { category: null, q: "", volunteer: false };
const ids = (list: { id: string }[]) => list.map((o) => o.id);
const matching = (filter: Partial<typeof noFilter>) => ids(orgs.filter((o) => matchesFilters(o, { ...noFilter, ...filter })));

describe("parseDiscoverParams", () => {
  it("reads a valid category slug and a trimmed search", () => {
    expect(parseDiscoverParams({ category: " Highest-Impact ", q: "  malaria   nets " })).toEqual({
      category: "highest-impact",
      q: "malaria nets",
      area: null,
      city: null,
      volunteer: false,
    });
  });

  it("ignores repeated, malformed or oversized values", () => {
    expect(parseDiscoverParams({ category: ["a", "b"], q: ["x"] })).toEqual({ category: null, q: "", area: null, city: null, volunteer: false });
    expect(parseDiscoverParams({ category: "<script>" }).category).toBeNull();
    expect(parseDiscoverParams({ q: "x".repeat(500) }).q).toHaveLength(100);
  });

  it("reads an area (region or state), a city within it, and the volunteer toggle", () => {
    expect(parseDiscoverParams({ area: "south-florida", city: " West Palm  Beach ", volunteer: "1" })).toMatchObject({
      area: { regionSlug: "south-florida" },
      city: "West Palm Beach",
      volunteer: true,
    });
    expect(parseDiscoverParams({ area: "fl" }).area).toEqual({ state: "FL" });
    // The older ?state= links from #60 still work.
    expect(parseDiscoverParams({ state: "Florida", city: "Miami" })).toMatchObject({ area: { state: "FL" }, city: "Miami" });
  });

  it("ignores a city without an area, and odd areas or cities", () => {
    expect(parseDiscoverParams({ city: "Miami" }).city).toBeNull();
    expect(parseDiscoverParams({ area: "XX" }).area).toBeNull();
    expect(parseDiscoverParams({ area: ["FL", "NY"] }).area).toBeNull();
    expect(parseDiscoverParams({ area: "FL", city: "<b>Miami</b>" }).city).toBeNull();
    expect(parseDiscoverParams({ area: "FL", city: "Miami 33101" }).city).toBeNull();
    expect(parseDiscoverParams({ area: "FL", city: "x".repeat(81) }).city).toBeNull();
  });
});

describe("matchesFilters: cause and search", () => {
  it("returns everything without filters", () => {
    expect(matching({})).toHaveLength(4);
  });

  it("filters by category", () => {
    expect(matching({ category: "highest-impact" })).toEqual(["1", "2"]);
    expect(matching({ category: "space-science" })).toEqual([]);
  });

  it("searches name and description, case- and accent-insensitive, all words", () => {
    expect(matching({ q: "MALARIA" })).toEqual(["1"]);
    expect(matching({ q: "cash poverty" })).toEqual(["2"]);
    expect(matching({ q: "medecins" })).toEqual(["3"]);
    expect(matching({ q: "cash nets" })).toEqual([]);
  });

  it("treats % and _ as plain characters", () => {
    expect(matching({ q: "%" })).toEqual(["4"]);
    expect(matching({ q: "y_f" })).toEqual(["4"]);
  });

  it("combines category and search", () => {
    expect(matching({ category: "humanitarian-aid", q: "give" })).toEqual(["2"]);
  });
});

describe("countByCategory", () => {
  it("counts organizations per category", () => {
    const counts = countByCategory(orgs);
    expect(counts.get("highest-impact")).toBe(2);
    expect(counts.get("humanitarian-aid")).toBe(2);
    expect(counts.get("space-science")).toBeUndefined();
  });
});

// ---- Location ----

const southFlorida: RegionDef = {
  slug: "south-florida",
  name: "South Florida",
  counties: [
    { state: "FL", county: "Palm Beach" },
    { state: "FL", county: "Broward" },
    { state: "FL", county: "Miami-Dade" },
  ],
};
const palmBeach: RegionDef = { slug: "palm-beach-county", name: "Palm Beach County", counties: [{ state: "FL", county: "Palm Beach" }] };
const regions = [southFlorida, palmBeach];

// In name order, as the page loads them.
const placed: DirectoryOrg[] = [
  { id: "bgc", name: "Boys and Girls Clubs of Palm Beach County", description: null, categorySlugs: ["education"], locationState: "FL", locationCounty: "Palm Beach", locationCity: "West Palm Beach", serviceArea: "REGIONAL", acceptsVolunteers: true },
  { id: "fl-state", name: "Florida Statewide Literacy", description: null, categorySlugs: ["education"], locationState: "FL", locationCounty: "Leon", locationCity: "Tallahassee", serviceArea: "STATEWIDE" },
  { id: "gd", name: "GiveDirectly", description: null, categorySlugs: ["humanitarian-aid"], locationState: "NY", locationCounty: "New York", locationCity: "New York", serviceArea: "NATIONAL" },
  { id: "miami", name: "Miami Dog Rescue", description: null, categorySlugs: ["animal-welfare"], locationState: "FL", locationCounty: "Miami-Dade", locationCity: "Miami", serviceArea: "LOCAL", acceptsVolunteers: true },
  { id: "natl-wpb", name: "National Org Based in WPB", description: null, categorySlugs: ["humanitarian-aid"], locationState: "FL", locationCounty: "Palm Beach", locationCity: "West Palm Beach", serviceArea: "NATIONAL", acceptsVolunteers: true },
  { id: "noaddr", name: "No Address Yet", description: null, categorySlugs: ["animal-welfare"] },
  { id: "orlando", name: "Orlando Food Pantry", description: null, categorySlugs: ["humanitarian-aid"], locationState: "FL", locationCounty: "Orange", locationCity: "Orlando", serviceArea: "LOCAL" },
  { id: "peggy", name: "Peggy Adams Animal Rescue", description: "Animal rescue and adoption.", categorySlugs: ["animal-welfare"], locationState: "FL", locationCounty: "Palm Beach", locationCity: "WEST PALM BEACH", serviceArea: "LOCAL", acceptsVolunteers: true },
  { id: "unset", name: "Unreviewed Broward Org", description: null, categorySlugs: ["education"], locationState: "FL", locationCounty: "Broward", locationCity: "Fort Lauderdale", serviceArea: null },
];

const area = (r: RegionDef, city: string | null = null): Area => ({ kind: "region", region: r, city });
const sections = (filter: Partial<typeof noFilter> & { area?: Area | null }) => {
  const s = discoverSections(placed, { ...noFilter, area: null, ...filter });
  return { serving: ids(s.serving), national: ids(s.national) };
};

describe("resolveArea", () => {
  it("finds a region by slug, or uses the state", () => {
    expect(resolveArea({ regionSlug: "south-florida" }, null, regions)).toEqual(area(southFlorida));
    expect(resolveArea({ state: "FL" }, "Miami", regions)).toEqual({ kind: "state", state: "FL", city: "Miami" });
  });

  it("an unknown region is no area", () => {
    expect(resolveArea({ regionSlug: "atlantis" }, null, regions)).toBeNull();
    expect(resolveArea(null, "Miami", regions)).toBeNull();
  });
});

describe("discoverSections: filter combinations", () => {
  it("without an area: national organizations in their own section, everything else in name order", () => {
    expect(sections({})).toEqual({
      serving: ["bgc", "fl-state", "miami", "noaddr", "orlando", "peggy", "unset"],
      national: ["gd", "natl-wpb"],
    });
  });

  it("a region: organizations serving it, local first, then regional, not yet set, statewide", () => {
    expect(sections({ area: area(southFlorida) })).toEqual({
      serving: ["miami", "peggy", "bgc", "unset", "fl-state"],
      national: ["gd", "natl-wpb"],
    });
  });

  it("a one-county region leaves out the rest of South Florida", () => {
    expect(sections({ area: area(palmBeach) }).serving).toEqual(["peggy", "bgc", "fl-state"]);
  });

  it("a city (by the city field, any case) within a region", () => {
    expect(sections({ area: area(southFlorida, "west palm beach") }).serving).toEqual(["peggy", "bgc", "fl-state"]);
  });

  it("a state, and a city in it", () => {
    expect(sections({ area: { kind: "state", state: "FL", city: null } }).serving).toEqual(["miami", "orlando", "peggy", "bgc", "unset", "fl-state"]);
    expect(sections({ area: { kind: "state", state: "FL", city: "Orlando" } }).serving).toEqual(["orlando", "fl-state"]);
    expect(sections({ area: { kind: "state", state: "NY", city: null } }).serving).toEqual([]);
  });

  it("area + cause", () => {
    expect(sections({ area: area(southFlorida), category: "animal-welfare" })).toEqual({ serving: ["miami", "peggy"], national: [] });
  });

  it("area + volunteers", () => {
    expect(sections({ area: area(southFlorida), volunteer: true })).toEqual({ serving: ["miami", "peggy", "bgc"], national: ["natl-wpb"] });
  });

  it("area + cause + volunteers + search", () => {
    expect(sections({ area: area(palmBeach), category: "animal-welfare", volunteer: true, q: "adoption" }).serving).toEqual(["peggy"]);
    expect(sections({ area: area(palmBeach), category: "education", volunteer: true, q: "adoption" }).serving).toEqual([]);
  });

  it("volunteers alone, with no area", () => {
    expect(sections({ volunteer: true })).toEqual({ serving: ["bgc", "miami", "peggy"], national: ["natl-wpb"] });
  });

  it("an organization with no county yet is found by state and city, but not by region", () => {
    const noCounty: DirectoryOrg = { id: "nc", name: "No County", description: null, categorySlugs: [], locationState: "FL", locationCity: "Miami", serviceArea: "LOCAL" };
    expect(ids(discoverSections([noCounty], { ...noFilter, area: area(southFlorida) }).serving)).toEqual([]);
    expect(ids(discoverSections([noCounty], { ...noFilter, area: { kind: "state", state: "FL", city: "Miami" } }).serving)).toEqual(["nc"]);
  });
});

describe("areaOptions and cityOptions", () => {
  it("counts the organizations serving each region and state, never national ones", () => {
    expect(areaOptions(placed, regions)).toEqual({
      regions: [
        { value: "palm-beach-county", label: "Palm Beach County", count: 3 },
        { value: "south-florida", label: "South Florida", count: 5 },
      ],
      states: [{ value: "FL", label: "Florida", count: 6 }],
    });
  });

  it("lists the cities in an area A–Z, merging case variants", () => {
    expect(cityOptions(placed, area(southFlorida))).toEqual([
      { value: "Fort Lauderdale", label: "Fort Lauderdale", count: 1 },
      { value: "Miami", label: "Miami", count: 1 },
      { value: "West Palm Beach", label: "West Palm Beach", count: 2 },
    ]);
    expect(cityOptions(placed, { kind: "state", state: "FL", city: "Miami" }).map((c) => c.value)).toContain("Orlando");
  });
});
