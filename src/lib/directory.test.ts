import { describe, expect, it } from "vitest";
import { countByCategory, filterDirectory, locationOptions, parseDiscoverParams } from "@/lib/directory";

const orgs = [
  { id: "1", name: "The Against Malaria Foundation", description: "Funds insecticidal nets.", categorySlugs: ["medical-research", "highest-impact"] },
  { id: "2", name: "GiveDirectly", description: "Sends cash to people in extreme poverty.", categorySlugs: ["humanitarian-aid", "highest-impact"] },
  { id: "3", name: "Médecins Sans Frontières", description: null, categorySlugs: ["humanitarian-aid"] },
  { id: "4", name: "100% Literacy_Fund", description: "Books.", categorySlugs: ["education"] },
];

describe("parseDiscoverParams", () => {
  it("reads a valid category slug and a trimmed search", () => {
    expect(parseDiscoverParams({ category: " Highest-Impact ", q: "  malaria   nets " })).toEqual({ category: "highest-impact", q: "malaria nets", state: null, city: null });
  });

  it("ignores repeated, malformed or oversized values", () => {
    expect(parseDiscoverParams({ category: ["a", "b"], q: ["x"] })).toEqual({ category: null, q: "", state: null, city: null });
    expect(parseDiscoverParams({ category: "<script>" }).category).toBeNull();
    expect(parseDiscoverParams({ q: "x".repeat(500) }).q).toHaveLength(100);
    expect(parseDiscoverParams({})).toEqual({ category: null, q: "", state: null, city: null });
  });
});

describe("filterDirectory", () => {
  it("returns everything without filters", () => {
    expect(filterDirectory(orgs, { category: null, q: "" })).toHaveLength(4);
  });

  it("filters by category", () => {
    expect(filterDirectory(orgs, { category: "highest-impact", q: "" }).map((o) => o.id)).toEqual(["1", "2"]);
    expect(filterDirectory(orgs, { category: "space-science", q: "" })).toEqual([]);
  });

  it("searches name and description, case- and accent-insensitive, all words", () => {
    expect(filterDirectory(orgs, { category: null, q: "MALARIA" }).map((o) => o.id)).toEqual(["1"]);
    expect(filterDirectory(orgs, { category: null, q: "cash poverty" }).map((o) => o.id)).toEqual(["2"]);
    expect(filterDirectory(orgs, { category: null, q: "medecins" }).map((o) => o.id)).toEqual(["3"]);
    expect(filterDirectory(orgs, { category: null, q: "cash nets" })).toEqual([]);
  });

  it("treats % and _ as plain characters", () => {
    expect(filterDirectory(orgs, { category: null, q: "%" }).map((o) => o.id)).toEqual(["4"]);
    expect(filterDirectory(orgs, { category: null, q: "y_f" }).map((o) => o.id)).toEqual(["4"]);
    expect(filterDirectory(orgs, { category: null, q: "_" }).map((o) => o.id)).toEqual(["4"]);
  });

  it("combines category and search", () => {
    expect(filterDirectory(orgs, { category: "humanitarian-aid", q: "give" }).map((o) => o.id)).toEqual(["2"]);
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

describe("parseDiscoverParams: state and city", () => {
  it("reads a state code or name, and a city with it", () => {
    expect(parseDiscoverParams({ state: "fl", city: "  West   Palm Beach " })).toMatchObject({ state: "FL", city: "West Palm Beach" });
    expect(parseDiscoverParams({ state: "Florida" }).state).toBe("FL");
    expect(parseDiscoverParams({ state: "NY", city: "Coeur d'Alene" }).city).toBe("Coeur d'Alene");
  });

  it("ignores unknown states, odd cities, and a city without a state", () => {
    expect(parseDiscoverParams({ state: "XX" }).state).toBeNull();
    expect(parseDiscoverParams({ state: ["FL", "NY"] }).state).toBeNull();
    expect(parseDiscoverParams({ city: "Miami" }).city).toBeNull();
    expect(parseDiscoverParams({ state: "FL", city: "<b>Miami</b>" }).city).toBeNull();
    expect(parseDiscoverParams({ state: "FL", city: "x".repeat(81) }).city).toBeNull();
    expect(parseDiscoverParams({ state: "FL", city: "Miami 33101" }).city).toBeNull();
  });
});

const placed = [
  { id: "a", name: "Palm Beach Food Bank", description: null, categorySlugs: ["humanitarian-aid"], locationState: "FL", locationCity: "West Palm Beach" },
  { id: "b", name: "Peggy Adams Animal Rescue", description: null, categorySlugs: ["animal-welfare"], locationState: "FL", locationCity: "WEST PALM BEACH" },
  { id: "c", name: "Miami Dog Rescue", description: null, categorySlugs: ["animal-welfare"], locationState: "FL", locationCity: "Miami" },
  { id: "d", name: "GiveDirectly", description: null, categorySlugs: ["humanitarian-aid"], locationState: "NY", locationCity: "New York" },
  { id: "e", name: "No Address Yet", description: null, categorySlugs: ["animal-welfare"], locationState: null, locationCity: null },
];

describe("filterDirectory: state and city", () => {
  it("filters by state", () => {
    expect(filterDirectory(placed, { category: null, q: "", state: "FL" }).map((o) => o.id)).toEqual(["a", "b", "c"]);
  });

  it("filters by city within the state, ignoring case", () => {
    expect(filterDirectory(placed, { category: null, q: "", state: "FL", city: "west palm beach" }).map((o) => o.id)).toEqual(["a", "b"]);
  });

  it("combines location with cause and search", () => {
    expect(filterDirectory(placed, { category: "animal-welfare", q: "rescue", state: "FL" }).map((o) => o.id)).toEqual(["b", "c"]);
    expect(filterDirectory(placed, { category: "animal-welfare", q: "", state: "FL", city: "Miami" }).map((o) => o.id)).toEqual(["c"]);
  });

  it("leaves out organizations with no address only when a location is chosen", () => {
    expect(filterDirectory(placed, { category: null, q: "" })).toHaveLength(5);
    expect(filterDirectory(placed, { category: null, q: "", state: "NY" }).map((o) => o.id)).toEqual(["d"]);
  });
});

describe("locationOptions", () => {
  it("lists states by name with counts, skipping orgs without an address", () => {
    expect(locationOptions(placed, null)).toEqual({
      states: [
        { value: "FL", label: "Florida", count: 3 },
        { value: "NY", label: "New York", count: 1 },
      ],
      cities: [],
    });
  });

  it("lists the chosen state's cities A-Z, merging case variants", () => {
    expect(locationOptions(placed, "FL").cities).toEqual([
      { value: "Miami", label: "Miami", count: 1 },
      { value: "West Palm Beach", label: "West Palm Beach", count: 2 },
    ]);
  });
});
