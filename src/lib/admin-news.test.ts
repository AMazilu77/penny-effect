import { describe, expect, it } from "vitest";
import { canPostNewsFor, newsFieldErrors, newsForm, NEWS_LIMITS, normalizeText, visibleLength } from "@/lib/admin-news";

const valid = {
  organizationId: "org_1",
  title: "  Net distribution in Malawi completed ",
  content: "AMF reports 1.2 million nets distributed across three districts.",
  sourceUrl: " https://www.againstmalaria.com/news ",
};

describe("newsForm", () => {
  it("accepts a complete item and trims it", () => {
    expect(newsForm.parse(valid)).toEqual({
      organizationId: "org_1",
      title: "Net distribution in Malawi completed",
      content: "AMF reports 1.2 million nets distributed across three districts.",
      sourceUrl: "https://www.againstmalaria.com/news",
    });
  });

  it("requires a real http(s) source link", () => {
    for (const sourceUrl of ["", "   ", "not a url", "javascript:alert(1)", "ftp://example.com/x", "/relative/path"]) {
      expect(newsForm.safeParse({ ...valid, sourceUrl }).success).toBe(false);
    }
  });

  it("rejects missing or oversized text", () => {
    expect(newsForm.safeParse({ ...valid, title: "Hi" }).success).toBe(false);
    expect(newsForm.safeParse({ ...valid, content: "short" }).success).toBe(false);
    expect(newsForm.safeParse({ ...valid, title: "x".repeat(201) }).success).toBe(false);
    expect(newsForm.safeParse({ ...valid, organizationId: "" }).success).toBe(false);
  });
});

describe("canPostNewsFor", () => {
  it("allows only active, verified organizations", () => {
    expect(canPostNewsFor({ status: "ACTIVE", verifiedAt: new Date() })).toBe(true);
    expect(canPostNewsFor({ status: "ACTIVE", verifiedAt: null })).toBe(false);
    expect(canPostNewsFor({ status: "HIDDEN", verifiedAt: new Date() })).toBe(false);
  });
});

describe("line breaks (the 'Fill in every field' bug)", () => {
  // Browsers submit a textarea's line breaks as "\r\n": two characters each.
  const paragraphs = Array.from({ length: 21 }, () => "x".repeat(94)).join("\n") + "x".repeat(6); // 2,000 as the admin sees it
  const submitted = paragraphs.replace(/\n/g, "\r\n"); // 2,020 as sent

  it("counts a summary the way the admin sees it", () => {
    expect(paragraphs.length).toBe(2000);
    expect(submitted.length).toBe(2020);
    expect(visibleLength(submitted)).toBe(2000);
  });

  it("accepts a summary that fits the counter, even with many line breaks", () => {
    const r = newsForm.safeParse({ ...valid, content: submitted });
    expect(r.success).toBe(true);
    expect(r.success && r.data.content).toBe(paragraphs); // stored with plain "\n"
  });

  it("normalizes old-Mac and Windows line breaks", () => {
    expect(normalizeText(" a\r\nb\rc ")).toBe("a\nb\nc");
  });
});

describe("newsFieldErrors", () => {
  const ok = { organizationId: "org_1", title: valid.title, content: valid.content, sourceUrl: valid.sourceUrl };

  it("returns nothing for a valid item", () => {
    expect(newsFieldErrors(ok)).toEqual({});
  });

  it("names the field, the rule and the actual length when the summary is too long", () => {
    const errors = newsFieldErrors({ ...ok, content: "y".repeat(2345) });
    expect(errors).toEqual({ content: "Summary is too long: 2,345 characters (maximum 2,000). Shorten it by 345." });
  });

  it("explains every failing field at once", () => {
    const errors = newsFieldErrors({ organizationId: "", title: "Hi", content: "", sourceUrl: "ftp://x" });
    expect(errors.organizationId).toMatch(/^Organization: choose/);
    expect(errors.title).toBe("Title is too short: 2 characters (minimum 3).");
    expect(errors.content).toBe("Summary is empty: write at least 10 characters.");
    expect(errors.sourceUrl).toMatch(/https:\/\//);
  });

  it("reports an over-long title and source link with their limits", () => {
    expect(newsFieldErrors({ ...ok, title: "t".repeat(201) }).title).toContain(`maximum ${NEWS_LIMITS.title.max}`);
    expect(newsFieldErrors({ ...ok, sourceUrl: "https://x.org/" + "a".repeat(2000) }).sourceUrl).toContain("maximum 2,000");
  });

  it("agrees with the schema: no messages exactly when the schema accepts", () => {
    const cases = [
      ok,
      { ...ok, title: "  ab  " },
      { ...ok, content: "x".repeat(2000) },
      { ...ok, content: "x".repeat(2001) },
      { ...ok, sourceUrl: "javascript:alert(1)" },
      { ...ok, organizationId: "  " },
    ];
    for (const c of cases) {
      expect(Object.keys(newsFieldErrors(c)).length === 0).toBe(newsForm.safeParse(c).success);
    }
  });
});
