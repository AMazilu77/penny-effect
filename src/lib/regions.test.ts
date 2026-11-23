import { describe, expect, it } from "vitest";
import { countyLines, createRegionForm, parseCountyLines, regionSlug, saveRegionForm } from "./regions";

describe("regionSlug", () => {
  it("makes a web address from the name", () => {
    expect(regionSlug("South Florida")).toBe("south-florida");
    expect(regionSlug("  Palm Beach County ")).toBe("palm-beach-county");
    expect(regionSlug("Miami–Dade & Monroe")).toBe("miami-dade-monroe");
    expect(regionSlug("Doña Ana")).toBe("dona-ana");
  });
});

describe("parseCountyLines", () => {
  it("reads one county per line, with the state as a code or name, County optional", () => {
    expect(parseCountyLines("Palm Beach, FL\nBroward County, Florida\n\n  Miami-Dade ,fl  ")).toEqual([
      { state: "FL", county: "Palm Beach" },
      { state: "FL", county: "Broward" },
      { state: "FL", county: "Miami-Dade" },
    ]);
  });

  it("drops duplicates, however they're written", () => {
    expect(parseCountyLines("Miami-Dade, FL\nmiami dade county, FL")).toEqual([{ state: "FL", county: "Miami-Dade" }]);
  });

  it("keeps the same county name in two states", () => {
    expect(parseCountyLines("Orange, FL\nOrange, CA")).toHaveLength(2);
  });

  it("refuses the whole box if any line can't be read", () => {
    expect(parseCountyLines("Palm Beach, FL\nBroward")).toBeNull();
    expect(parseCountyLines("Palm Beach, ZZ")).toBeNull();
    expect(parseCountyLines("<script>, FL")).toBeNull();
  });

  it("round-trips through the edit box", () => {
    const counties = [{ state: "FL", county: "Palm Beach" }, { state: "FL", county: "Broward" }];
    expect(parseCountyLines(countyLines(counties))).toEqual(counties);
  });
});

describe("region forms", () => {
  it("a new region gets its slug from the name", () => {
    expect(createRegionForm.parse({ name: "Treasure Coast", counties: "Martin, FL\nSt. Lucie, FL\nIndian River, FL" })).toEqual({
      name: "Treasure Coast",
      slug: "treasure-coast",
      counties: [
        { state: "FL", county: "Martin" },
        { state: "FL", county: "St. Lucie" },
        { state: "FL", county: "Indian River" },
      ],
    });
  });

  it("needs a name and at least one county", () => {
    expect(createRegionForm.safeParse({ name: "SF", counties: "Broward, FL" }).success).toBe(false);
    expect(createRegionForm.safeParse({ name: "Somewhere", counties: "  " }).success).toBe(false);
    expect(createRegionForm.safeParse({ name: "<b>Bad</b>", counties: "Broward, FL" }).success).toBe(false);
  });

  it("editing keeps the id and checks the same way", () => {
    expect(saveRegionForm.parse({ regionId: "r1", name: "South Florida", counties: "Broward, FL" })).toEqual({
      regionId: "r1",
      name: "South Florida",
      counties: [{ state: "FL", county: "Broward" }],
    });
    expect(saveRegionForm.safeParse({ regionId: "", name: "South Florida", counties: "Broward, FL" }).success).toBe(false);
  });
});
