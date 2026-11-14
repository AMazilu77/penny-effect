import { describe, expect, it } from "vitest";
import { newsFeedWhere, orgSlug, previewText, safeExternalUrl } from "@/lib/feed";
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

describe("previewText", () => {
  it("keeps short text whole", () => {
    expect(previewText("  Short update.  ")).toEqual({ preview: "Short update.", truncated: false });
    // Within the slack: not worth a "Read more".
    expect(previewText("a".repeat(300), 280).truncated).toBe(false);
  });

  it("cuts long text at a word boundary with an ellipsis", () => {
    const text = "word ".repeat(100).trim(); // 499 chars
    const { preview, truncated } = previewText(text, 280);
    expect(truncated).toBe(true);
    expect(preview.endsWith("word…")).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(281);
  });

  it("prefers a paragraph break and drops trailing punctuation", () => {
    const text = `${"First paragraph sentence. ".repeat(8).trim()}\n${"Second part. ".repeat(30)}`;
    const { preview } = previewText(text, 280);
    expect(preview).toBe(`${"First paragraph sentence. ".repeat(8).trim().replace(/\.$/, "")}…`);
  });

  it("hard-cuts text with no spaces", () => {
    expect(previewText("x".repeat(400), 280).preview).toBe(`${"x".repeat(280)}…`);
  });
});

describe("orgSlug", () => {
  it("accepts Every.org-style slugs and lowercases them", () => {
    expect(orgSlug("givedirectly")).toBe("givedirectly");
    expect(orgSlug("Against-Malaria-Foundation")).toBe("against-malaria-foundation");
  });

  it("rejects anything else", () => {
    for (const bad of ["", "-lead", "a/b", "a b", "../x", "x".repeat(101), "café"]) expect(orgSlug(bad)).toBeNull();
  });
});
