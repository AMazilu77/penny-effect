import { describe, expect, it } from "vitest";
import { CATEGORY_EVERYORG_CAUSES } from "@/lib/causes";
import { SEED_CATEGORIES, SEED_ORGANIZATIONS, seedBlockedReason } from "./seed-data";

describe("seed data", () => {
  it("has the 9 categories with unique slugs, including Highest Impact", () => {
    const slugs = SEED_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(9);
    expect(slugs).toContain("highest-impact");
    for (const slug of Object.keys(CATEGORY_EVERYORG_CAUSES)) expect(slugs).toContain(slug);
  });

  it("only real-looking organizations: 9-digit EIN, unique EIN/slug/name, known categories", () => {
    const categorySlugs = new Set(SEED_CATEGORIES.map((c) => c.slug));
    for (const key of ["ein", "everyOrgSlug", "name"] as const) {
      const values = SEED_ORGANIZATIONS.map((o) => o[key]);
      expect(new Set(values).size, key).toBe(values.length);
    }
    for (const org of SEED_ORGANIZATIONS) {
      expect(org.ein, org.name).toMatch(/^\d{9}$/);
      expect(org.website, org.name).toMatch(/^https:\/\//);
      expect(org.categorySlugs.length, org.name).toBeGreaterThan(0);
      for (const slug of org.categorySlugs) expect(categorySlugs.has(slug), `${org.name}: ${slug}`).toBe(true);
    }
  });

  it("puts exactly the five D-013 charities in Highest Impact", () => {
    expect(SEED_ORGANIZATIONS.filter((o) => o.categorySlugs.includes("highest-impact")).map((o) => o.everyOrgSlug).sort()).toEqual(
      ["againstmalaria", "givedirectly", "hki", "malaria-consortium", "newincentives"],
    );
  });
});

describe("seedBlockedReason", () => {
  it("refuses production and allows local runs", () => {
    expect(seedBlockedReason({ VERCEL_ENV: "production" })).toMatch(/production/);
    expect(seedBlockedReason({ VERCEL_ENV: "preview" })).toBeNull();
    expect(seedBlockedReason({})).toBeNull();
  });
});
