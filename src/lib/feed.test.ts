import { describe, expect, it } from "vitest";
import { newsFeedWhere, safeExternalUrl } from "@/lib/feed";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";

describe("newsFeedWhere", () => {
  it("only shows sourced items from visible organizations when the user follows no causes", () => {
    expect(newsFeedWhere([])).toEqual({ sourceUrl: { not: null }, organization: VISIBLE_ORGANIZATION_WHERE });
  });

  it("filters by followed causes and still requires a source link and a visible organization", () => {
    expect(newsFeedWhere(["cat1", "cat2"])).toEqual({
      sourceUrl: { not: null },
      organization: { ...VISIBLE_ORGANIZATION_WHERE, categories: { some: { id: { in: ["cat1", "cat2"] } } } },
    });
  });
});

describe("safeExternalUrl", () => {
  it("accepts http and https links", () => {
    expect(safeExternalUrl("https://www.unicef.org/press-releases/x")).toBe(
      "https://www.unicef.org/press-releases/x",
    );
    expect(safeExternalUrl("http://example.org")).toBe("http://example.org/");
  });

  it("rejects missing, malformed and non-web links", () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
    expect(safeExternalUrl("")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("mailto:someone@example.org")).toBeNull();
  });
});
