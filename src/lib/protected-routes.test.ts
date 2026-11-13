import { describe, expect, it } from "vitest";
import { isAdminPath, isProtectedPath } from "@/lib/protected-routes";

describe("isProtectedPath", () => {
  it.each(["/dashboard", "/feed", "/inbox", "/onboarding/interests", "/dashboard/settings", "/admin", "/admin/organizations", "/donations/abc/thanks"])(
    "protects %s",
    (path) => {
      expect(isProtectedPath(path)).toBe(true);
    },
  );

  it.each(["/", "/signin", "/signup", "/about", "/discover", "/api/auth/session"])(
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

describe("isAdminPath", () => {
  it.each(["/admin", "/admin/organizations", "/admin/news/new"])("treats %s as admin-only", (path) => {
    expect(isAdminPath(path)).toBe(true);
  });

  it.each(["/", "/dashboard", "/administrator", "/admins", "/api/admin/organizations"])(
    "does not treat %s as an admin page",
    (path) => {
      expect(isAdminPath(path)).toBe(false);
    },
  );
});
