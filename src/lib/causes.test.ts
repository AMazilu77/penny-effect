import { describe, expect, it } from "vitest";
import { CATEGORY_EVERYORG_CAUSES, CURATED_CATEGORY_SLUGS, suggestCategorySlugs } from "./causes";

// The category slugs in the database (migration 20261112060000 and prisma/seed.ts).
const MAPPED_SLUGS = [
  "humanitarian-aid",
  "animal-welfare",
  "environment",
  "mental-health",
  "political-reform",
  "medical-research",
  "education",
  "space-science",
];

describe("CATEGORY_EVERYORG_CAUSES", () => {
  it("maps exactly the 8 thematic categories, not curated ones", () => {
    expect(Object.keys(CATEGORY_EVERYORG_CAUSES).sort()).toEqual([...MAPPED_SLUGS].sort());
    for (const curated of CURATED_CATEGORY_SLUGS) {
      expect(Object.keys(CATEGORY_EVERYORG_CAUSES)).not.toContain(curated);
    }
  });

  it("uses each Every.org cause for one category only", () => {
    const all = Object.values(CATEGORY_EVERYORG_CAUSES).flat();
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("suggestCategorySlugs", () => {
  it("suggests categories from GiveDirectly's real Every.org causes", () => {
    expect(suggestCategorySlugs(["poverty", "humans", "research", "food-security"])).toEqual([
      "humanitarian-aid",
      "medical-research",
    ]);
  });

  it("ignores case, whitespace and unknown causes", () => {
    expect(suggestCategorySlugs([" Animals ", "made-up-cause"])).toEqual(["animal-welfare"]);
    expect(suggestCategorySlugs([])).toEqual([]);
  });

  it("never suggests Highest Impact", () => {
    const everyCause = Object.values(CATEGORY_EVERYORG_CAUSES).flat();
    expect(suggestCategorySlugs(everyCause)).not.toContain("highest-impact");
    expect(suggestCategorySlugs(everyCause)).toHaveLength(8);
  });
});
