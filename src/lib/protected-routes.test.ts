import { describe, expect, it } from "vitest";
import { isProtectedPath } from "@/lib/protected-routes";

describe("isProtectedPath", () => {
  it.each(["/dashboard", "/feed", "/inbox", "/onboarding/interests", "/dashboard/settings"])(
    "protects %s",
    (path) => {
      expect(isProtectedPath(path)).toBe(true);
    },
  );

  it.each(["/", "/signin", "/signup", "/about", "/discover", "/charities", "/api/auth/session"])(
    "leaves public page %s open",
    (path) => {
      expect(isProtectedPath(path)).toBe(false);
    },
  );

  it("does not match look-alike paths", () => {
    expect(isProtectedPath("/feedback")).toBe(false);
    expect(isProtectedPath("/inboxes")).toBe(false);
    expect(isProtectedPath("/dashboards")).toBe(false);
  });
});
