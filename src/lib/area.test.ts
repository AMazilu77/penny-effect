import { describe, expect, it } from "vitest";
import {
  areaStates,
  basedIn,
  cityKey,
  countyKey,
  inRegion,
  myArea,
  myAreaColumns,
  myAreaFromFilter,
  myAreaSchema,
  normalizeCountyName,
  parseAreaParam,
  parseCityParam,
  parseVolunteerParam,
  placeLine,
  servesArea,
  type Area,
  type LocatedOrg,
  type RegionDef,
} from "./area";

// The regions the migration inserts (prisma/migrations/20261122030000_local_nonprofits).
const palmBeach: RegionDef = { slug: "palm-beach-county", name: "Palm Beach County", counties: [{ state: "FL", county: "Palm Beach" }] };
const southFlorida: RegionDef = {
  slug: "south-florida",
  name: "South Florida",
  counties: [
    { state: "FL", county: "Palm Beach" },
    { state: "FL", county: "Broward" },
    { state: "FL", county: "Miami-Dade" },
  ],
};
const region = (r: RegionDef, city: string | null = null): Area => ({ kind: "region", region: r, city });

const wpb: LocatedOrg = { locationState: "FL", locationCounty: "Palm Beach", locationCity: "West Palm Beach", serviceArea: "LOCAL" };
const fortLauderdale: LocatedOrg = { locationState: "FL", locationCounty: "Broward", locationCity: "Fort Lauderdale", serviceArea: "REGIONAL" };
const miami: LocatedOrg = { locationState: "FL", locationCounty: "Miami Dade County", locationCity: "Miami", serviceArea: null };
const orlando: LocatedOrg = { locationState: "FL", locationCounty: "Orange", locationCity: "Orlando", serviceArea: "LOCAL" };
const tallahasseeStatewide: LocatedOrg = { locationState: "FL", locationCounty: "Leon", locationCity: "Tallahassee", serviceArea: "STATEWIDE" };
const nationalInWpb: LocatedOrg = { ...wpb, serviceArea: "NATIONAL" };
const palmBeachTexas: LocatedOrg = { locationState: "TX", locationCounty: "Palm Beach", locationCity: "Nowhere", serviceArea: "LOCAL" };

describe("county names", () => {
  it("compare ignoring case, accents, hyphens, dots, a trailing County, and Saint vs St", () => {
    expect(countyKey("Miami-Dade")).toBe(countyKey("miami dade county"));
    expect(countyKey("St. Lucie")).toBe(countyKey("Saint Lucie County"));
    expect(countyKey("Doña Ana")).toBe(countyKey("Dona Ana"));
    expect(countyKey("Orleans Parish")).toBe(countyKey("Orleans"));
    expect(countyKey("Palm Beach")).not.toBe(countyKey("Palm Beach Gardens"));
  });

  it("are stored without the word County", () => {
    expect(normalizeCountyName("  Palm   Beach County ")).toBe("Palm Beach");
    expect(normalizeCountyName("Miami-Dade")).toBe("Miami-Dade");
  });

  it("city keys ignore case, accents and dots", () => {
    expect(cityKey("ST. PETERSBURG")).toBe(cityKey("St Petersburg"));
    expect(cityKey("Cañon City")).toBe(cityKey("canon city"));
  });
});

describe("region → county matching", () => {
  it("South Florida is Palm Beach + Broward + Miami-Dade", () => {
    expect(inRegion(wpb, southFlorida)).toBe(true);
    expect(inRegion(fortLauderdale, southFlorida)).toBe(true);
    expect(inRegion(miami, southFlorida)).toBe(true); // "Miami Dade County" as typed
    expect(inRegion(orlando, southFlorida)).toBe(false);
  });

  it("a one-county region matches only that county", () => {
    expect(inRegion(wpb, palmBeach)).toBe(true);
    expect(inRegion(fortLauderdale, palmBeach)).toBe(false);
  });

  it("needs the same state, not just the same county name", () => {
    expect(inRegion(palmBeachTexas, palmBeach)).toBe(false);
  });

  it("an organization without a county (not entered yet) is in no region", () => {
    expect(inRegion({ locationState: "FL", locationCity: "West Palm Beach" }, southFlorida)).toBe(false);
  });

  it("knows which states a region spans", () => {
    expect(areaStates(region(southFlorida))).toEqual(["FL"]);
    expect(areaStates({ kind: "state", state: "NY", city: null })).toEqual(["NY"]);
  });
});

describe("basedIn: region, state and city", () => {
  it("a city narrows a region by the city field", () => {
    expect(basedIn(wpb, region(southFlorida, "west palm beach"))).toBe(true);
    expect(basedIn(fortLauderdale, region(southFlorida, "West Palm Beach"))).toBe(false);
  });

  it("a state matches every organization in it; with a city, only that city", () => {
    expect(basedIn(orlando, { kind: "state", state: "FL", city: null })).toBe(true);
    expect(basedIn(orlando, { kind: "state", state: "FL", city: "Miami" })).toBe(false);
    expect(basedIn(miami, { kind: "state", state: "FL", city: "Miami" })).toBe(true);
  });
});

describe("servesArea (Discover's main list, the feed's Near me)", () => {
  const sf = region(southFlorida);

  it("includes local, regional and not-yet-set organizations based in the area", () => {
    expect([wpb, fortLauderdale, miami].map((o) => servesArea(o, sf))).toEqual([true, true, true]);
  });

  it("includes statewide organizations of the area's state, wherever they're based", () => {
    expect(servesArea(tallahasseeStatewide, sf)).toBe(true);
    expect(servesArea(tallahasseeStatewide, { kind: "state", state: "GA", city: null })).toBe(false);
  });

  it("never includes national organizations, even one based in the area", () => {
    expect(servesArea(nationalInWpb, sf)).toBe(false);
  });

  it("excludes local organizations elsewhere", () => {
    expect(servesArea(orlando, sf)).toBe(false);
  });
});

describe("Discover params", () => {
  it("reads a region slug or a state from ?area=", () => {
    expect(parseAreaParam("south-florida")).toEqual({ regionSlug: "south-florida" });
    expect(parseAreaParam("FL")).toEqual({ state: "FL" });
    expect(parseAreaParam("fl")).toEqual({ state: "FL" });
    expect(parseAreaParam("Florida")).toEqual({ state: "FL" });
  });

  it("still reads the older ?state= links", () => {
    expect(parseAreaParam(undefined, "NY")).toEqual({ state: "NY" });
    expect(parseAreaParam("south-florida", "NY")).toEqual({ regionSlug: "south-florida" });
  });

  it("ignores junk, arrays and injection attempts", () => {
    for (const bad of ["", "ZZ", "South Florida!", "a", "'; drop table", ["fl"], "x".repeat(61), "%"]) {
      expect(parseAreaParam(bad)).toBeNull();
    }
  });

  it("reads a city and the volunteer toggle", () => {
    expect(parseCityParam("  West  Palm Beach ")).toBe("West Palm Beach");
    expect(parseCityParam("Coeur d'Alene")).toBe("Coeur d'Alene");
    expect(parseCityParam("<script>")).toBeNull();
    expect(parseCityParam(["Miami"])).toBeNull();
    expect(parseVolunteerParam("1")).toBe(true);
    expect(parseVolunteerParam("on")).toBe(true);
    expect(parseVolunteerParam("0")).toBe(false);
    expect(parseVolunteerParam(undefined)).toBe(false);
  });
});

describe("My area", () => {
  it("accepts none, a region, or a city with its state, and nothing else", () => {
    expect(myAreaSchema.parse({ kind: "none" })).toEqual({ kind: "none" });
    expect(myAreaSchema.parse({ kind: "region", regionSlug: "south-florida" })).toEqual({ kind: "region", regionSlug: "south-florida" });
    expect(myAreaSchema.parse({ kind: "city", state: "florida", city: " West  Palm Beach " })).toEqual({
      kind: "city",
      state: "FL",
      city: "West Palm Beach",
    });
    expect(myAreaSchema.safeParse({ kind: "city", state: "FL", city: "123 Main St" }).success).toBe(false);
    expect(myAreaSchema.safeParse({ kind: "city", state: "ZZ", city: "Miami" }).success).toBe(false);
    expect(myAreaSchema.safeParse({ kind: "street", address: "1 Ocean Dr" }).success).toBe(false);
    expect(myAreaSchema.safeParse({ kind: "region", regionSlug: "south-florida", userId: "someone" }).success).toBe(false);
    expect(myAreaSchema.safeParse({ kind: "city", state: "FL", city: "Miami", latitude: 25.7 }).success).toBe(false);
  });

  it("maps to exactly one kind of column", () => {
    expect(myAreaColumns({ kind: "none" })).toEqual({ areaRegionId: null, areaCity: null, areaState: null });
    expect(myAreaColumns({ kind: "region", regionId: "r1" })).toEqual({ areaRegionId: "r1", areaCity: null, areaState: null });
    expect(myAreaColumns({ kind: "city", state: "FL", city: "Miami" })).toEqual({ areaRegionId: null, areaCity: "Miami", areaState: "FL" });
  });

  it("reads back as an area", () => {
    expect(myArea({ areaRegion: southFlorida, areaCity: null, areaState: null })).toEqual(region(southFlorida));
    expect(myArea({ areaRegion: null, areaCity: "Miami", areaState: "FL" })).toEqual({ kind: "state", state: "FL", city: "Miami" });
    expect(myArea({ areaRegion: null, areaCity: null, areaState: null })).toBeNull();
  });

  it("Save as my area keeps the most specific choice, never a whole state", () => {
    expect(myAreaFromFilter(region(southFlorida))).toEqual({ kind: "region", regionSlug: "south-florida" });
    expect(myAreaFromFilter(region(southFlorida, "West Palm Beach"))).toEqual({ kind: "city", state: "FL", city: "West Palm Beach" });
    expect(myAreaFromFilter({ kind: "state", state: "FL", city: "Miami" })).toEqual({ kind: "city", state: "FL", city: "Miami" });
    expect(myAreaFromFilter({ kind: "state", state: "FL", city: null })).toBeNull();
    expect(myAreaFromFilter(null)).toBeNull();
  });
});

describe("placeLine", () => {
  it("reads city, state and county", () => {
    expect(placeLine(wpb)).toBe("West Palm Beach, FL · Palm Beach County");
    expect(placeLine({ locationState: "NY", locationCity: "New York" })).toBe("New York, NY");
    expect(placeLine({})).toBeNull();
  });
});
