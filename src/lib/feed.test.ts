import { describe, expect, it } from "vitest";
import { FEED_VIEWS, chooseFeedView, feedHref, newsFeedWhere, orgSlug, parseFeedView, previewText, safeExternalUrl } from "@/lib/feed";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";

describe("newsFeedWhere", () => {
  const ids = { followedOrgIds: ["org1", "org2"], categoryIds: ["cat1", "cat2"] };

  it("Following: only organizations the user follows", () => {
    expect(newsFeedWhere("following", ids)).toEqual({
      sourceUrl: { not: null },
      organization: { ...VISIBLE_ORGANIZATION_WHERE, id: { in: ["org1", "org2"] } },
    });
  });

  it("My causes: organizations in the user's causes", () => {
    expect(newsFeedWhere("causes", ids)).toEqual({
      sourceUrl: { not: null },
      organization: { ...VISIBLE_ORGANIZATION_WHERE, categories: { some: { id: { in: ["cat1", "cat2"] } } } },
    });
  });

  it("Near me: organizations serving the user's area", () => {
    expect(newsFeedWhere("near", { ...ids, nearOrgIds: ["near1"] })).toEqual({
      sourceUrl: { not: null },
      organization: { ...VISIBLE_ORGANIZATION_WHERE, id: { in: ["near1"] } },
    });
    // No area: matches nothing.
    expect(newsFeedWhere("near", ids).organization).toMatchObject({ id: { in: [] } });
  });

  it("All: every visible organization", () => {
    expect(newsFeedWhere("all", ids)).toEqual({ sourceUrl: { not: null }, organization: VISIBLE_ORGANIZATION_WHERE });
  });

  it("every view requires a source link and a visible organization, even with nothing followed", () => {
    for (const view of FEED_VIEWS) {
      const where = newsFeedWhere(view, { followedOrgIds: [], categoryIds: [] });
      expect(where.sourceUrl).toEqual({ not: null });
      expect(where.organization).toMatchObject(VISIBLE_ORGANIZATION_WHERE);
    }
  });
});

describe("parseFeedView", () => {
  it("accepts only known view names", () => {
    expect(parseFeedView("all")).toBe("all");
    expect(parseFeedView("following")).toBe("following");
    expect(parseFeedView("nonsense")).toBeNull();
    expect(parseFeedView(["all"])).toBeNull();
    expect(parseFeedView(undefined)).toBeNull();
  });

  it("links keep the view in the URL", () => {
    expect(feedHref("causes")).toBe("/feed?view=causes");
  });
});

describe("chooseFeedView", () => {
  const all = { following: true, causes: true, near: true, all: true };
  const none = { following: false, causes: false, near: false, all: false };
  const base = { requested: undefined, remembered: undefined, followsAny: true, causesAny: true };

  it("a brand-new user (no follows, no causes) lands on All", () => {
    expect(chooseFeedView({ ...base, followsAny: false, causesAny: false, hasItems: { ...none, all: true } })).toEqual({
      view: "all",
      fellBackFrom: null,
    });
  });

  it("opens on Following when the user follows an organization that has updates", () => {
    expect(chooseFeedView({ ...base, hasItems: all }).view).toBe("following");
  });

  it("skips an empty Following for My causes, and an empty My causes for All", () => {
    expect(chooseFeedView({ ...base, hasItems: { following: false, causes: true, near: false, all: true } }).view).toBe("causes");
    expect(chooseFeedView({ ...base, hasItems: { following: false, causes: false, near: false, all: true } }).view).toBe("all");
  });

  it("uses My causes only when the user chose causes", () => {
    expect(chooseFeedView({ ...base, followsAny: false, hasItems: { following: false, causes: true, near: false, all: true } }).view).toBe(
      "causes",
    );
    expect(
      chooseFeedView({ ...base, followsAny: false, causesAny: false, hasItems: { following: false, causes: true, near: false, all: true } }).view,
    ).toBe("all");
  });

  it("still opens on All when there are no updates anywhere (the page then explains)", () => {
    expect(chooseFeedView({ ...base, hasItems: none })).toEqual({ view: "all", fellBackFrom: null });
  });

  it("opens on the remembered tab when it has updates, even over Following", () => {
    expect(chooseFeedView({ ...base, remembered: "causes", hasItems: all })).toEqual({ view: "causes", fellBackFrom: null });
    expect(chooseFeedView({ ...base, remembered: "all", hasItems: all }).view).toBe("all");
  });

  it("falls back to All when the remembered tab is empty, and says which tab was empty", () => {
    expect(chooseFeedView({ ...base, remembered: "following", hasItems: { following: false, causes: true, near: false, all: true } })).toEqual({
      view: "all",
      fellBackFrom: "following",
    });
  });

  it("keeps a remembered All even when it's empty (there's nowhere better to go)", () => {
    expect(chooseFeedView({ ...base, remembered: "all", hasItems: none })).toEqual({ view: "all", fellBackFrom: null });
  });

  it("ignores a remembered value that isn't a tab", () => {
    expect(chooseFeedView({ ...base, remembered: "admin", hasItems: all }).view).toBe("following");
  });

  it("shows a tab asked for in the URL as asked, even if it's empty", () => {
    expect(chooseFeedView({ ...base, requested: "following", remembered: "all", hasItems: none })).toEqual({
      view: "following",
      fellBackFrom: null,
    });
  });

  it("Near me: shown when asked or remembered, only once My area is set", () => {
    const near = { ...base, hasItems: { following: false, causes: false, near: true, all: true } };
    expect(chooseFeedView({ ...near, requested: "near", nearAvailable: true }).view).toBe("near");
    expect(chooseFeedView({ ...near, remembered: "near", nearAvailable: true })).toEqual({ view: "near", fellBackFrom: null });
    // No area set: the tab doesn't exist, so a stale link or cookie is ignored (no "Nothing under Near me" note).
    expect(chooseFeedView({ ...near, requested: "near" })).toEqual({ view: "all", fellBackFrom: null });
    expect(chooseFeedView({ ...near, remembered: "near" })).toEqual({ view: "all", fellBackFrom: null });
  });

  it("Near me follows the never-empty rule: a remembered empty Near me falls back to All", () => {
    expect(chooseFeedView({ ...base, remembered: "near", nearAvailable: true, hasItems: { ...all, near: false } })).toEqual({
      view: "all",
      fellBackFrom: "near",
    });
  });

  it("Near me is never picked on its own: the default stays Following → My causes → All", () => {
    expect(
      chooseFeedView({ ...base, followsAny: false, causesAny: false, nearAvailable: true, hasItems: { ...none, near: true, all: true } }).view,
    ).toBe("all");
  });

  it("ignores an unknown ?view= and chooses as usual", () => {
    expect(chooseFeedView({ ...base, requested: "bogus", hasItems: { following: false, causes: true, near: false, all: true } }).view).toBe(
      "causes",
    );
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
