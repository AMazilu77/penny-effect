import { describe, expect, it } from "vitest";
import { followForm, followNotice, safeReturnPath, withNotice } from "@/lib/follows";

describe("safeReturnPath", () => {
  it("allows our own pages, keeping Discover's filters", () => {
    expect(safeReturnPath("/org/givedirectly")).toBe("/org/givedirectly");
    expect(safeReturnPath("/discover?category=animal-welfare&q=dogs")).toBe("/discover?category=animal-welfare&q=dogs");
    expect(safeReturnPath("/feed?view=following")).toBe("/feed?view=following");
    expect(safeReturnPath("/dashboard")).toBe("/dashboard");
  });

  it("sends anything else to /dashboard", () => {
    for (const bad of [
      "https://evil.example/org/x",
      "//evil.example/discover",
      "/\\evil.example",
      "/admin/organizations",
      "/org/../admin",
      "/org/Bad Slug",
      "javascript:alert(1)",
      "",
      null,
      undefined,
      "/discover" + "x".repeat(400),
    ]) {
      expect(safeReturnPath(bad)).toBe("/dashboard");
    }
  });

  it("drops fragments", () => {
    expect(safeReturnPath("/dashboard#give")).toBe("/dashboard");
  });
});

describe("withNotice", () => {
  it("adds or replaces the notice, keeping other parameters", () => {
    expect(withNotice("/org/acs", "followed")).toBe("/org/acs?notice=followed");
    expect(withNotice("/discover?q=dogs&notice=unfollowed", "followed")).toBe("/discover?q=dogs&notice=followed");
  });
});

describe("followForm", () => {
  it("accepts a cuid-like id only", () => {
    expect(followForm.safeParse({ organizationId: "cmh1abc234" }).success).toBe(true);
    expect(followForm.safeParse({ organizationId: "" }).success).toBe(false);
    expect(followForm.safeParse({ organizationId: "x'; drop" }).success).toBe(false);
    expect(followForm.safeParse({ organizationId: null }).success).toBe(false);
  });
});

describe("followNotice", () => {
  it("knows only fixed codes", () => {
    expect(followNotice("followed")).toMatch(/Following/);
    expect(followNotice("<script>")).toBeNull();
    expect(followNotice(["followed"])).toBeNull();
  });
});
