import { describe, expect, it } from "vitest";
import givedirectly from "./fixtures/nonprofit-givedirectly.json";
import searchMalaria from "./fixtures/search-malaria.json";
import { normalizeEin, parseNonprofitResponse, parseSearchResponse } from "./parse";

describe("normalizeEin", () => {
  it("keeps 9 digits and removes dashes and spaces", () => {
    expect(normalizeEin("271661997")).toBe("271661997");
    expect(normalizeEin("27-1661997")).toBe("271661997");
    expect(normalizeEin(" 27 1661997 ")).toBe("271661997");
  });

  it("rejects anything that isn't exactly 9 digits", () => {
    for (const bad of [null, undefined, "", "12345678", "1234567890", "12-345678a"]) {
      expect(normalizeEin(bad)).toBeNull();
    }
  });
});

describe("parseNonprofitResponse (real GiveDirectly response)", () => {
  const org = parseNonprofitResponse(givedirectly);

  it("keeps identity, EIN and disbursability", () => {
    expect(org).toMatchObject({
      everyOrgId: "c1c38cb5-16d6-4aca-a949-83c8e7cc1b88",
      slug: "givedirectly",
      name: "GiveDirectly",
      ein: "271661997",
      // The live API sends `donationsEnabled: true`, not `isDisbursable`.
      isDisbursable: true,
      nteeCode: "P60",
      profileUrl: "https://www.every.org/givedirectly",
      websiteUrl: "https://www.givedirectly.org/",
    });
  });

  it("collects cause slugs from nonprofitTags", () => {
    expect(org.causes).toEqual(["poverty", "humans", "research", "food-security"]);
  });

  it("trims text and treats blank text as missing", () => {
    expect(org.description?.endsWith(" ")).toBe(false);
    const blank = structuredClone(givedirectly);
    blank.data.nonprofit.description = "   ";
    expect(parseNonprofitResponse(blank).description).toBeNull();
  });

  it("prefers the documented isDisbursable field when present", () => {
    const body = structuredClone(givedirectly) as typeof givedirectly & {
      data: { nonprofit: { isDisbursable?: boolean } };
    };
    body.data.nonprofit.isDisbursable = false;
    expect(parseNonprofitResponse(body).isDisbursable).toBe(false);
  });

  it("treats a missing disbursable flag as not disbursable", () => {
    const body = structuredClone(givedirectly) as Record<string, unknown> & typeof givedirectly;
    delete (body.data.nonprofit as Partial<typeof body.data.nonprofit>).donationsEnabled;
    expect(parseNonprofitResponse(body).isDisbursable).toBe(false);
  });

  it("drops links that aren't http(s)", () => {
    const body = structuredClone(givedirectly);
    body.data.nonprofit.websiteUrl = "javascript:alert(1)";
    expect(parseNonprofitResponse(body).websiteUrl).toBeNull();
  });

  it("throws on a response without the required fields", () => {
    expect(() => parseNonprofitResponse({ data: { nonprofit: { name: "No id" } } })).toThrow();
    expect(() => parseNonprofitResponse({ message: "Nonprofit does not exist." })).toThrow();
  });
});

describe("parseSearchResponse (real search for 'malaria')", () => {
  const results = parseSearchResponse(searchMalaria);

  it("returns every result with slug, name and normalized EIN", () => {
    expect(results.map((r) => [r.slug, r.ein])).toEqual([
      // GiveWell pass-through profiles have no EIN, so they can never be verified.
      ["givewell-malaria-consortium", null],
      ["malawi-childrens-village", "161526805"],
      ["malaria-consortium", "980627052"],
      ["united-to-beat-malaria", null],
      ["givewell-amf", null],
    ]);
    expect(results.every((r) => r.isDisbursable)).toBe(true);
  });

  it("throws when the list is missing", () => {
    expect(() => parseSearchResponse({})).toThrow();
  });
});
