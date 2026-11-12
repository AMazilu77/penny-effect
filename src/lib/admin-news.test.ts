import { describe, expect, it } from "vitest";
import { canPostNewsFor, newsForm } from "@/lib/admin-news";

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
