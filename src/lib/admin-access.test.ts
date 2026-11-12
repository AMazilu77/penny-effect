import { describe, expect, it } from "vitest";
import { decideAdminAccess } from "@/lib/admin-access";

describe("decideAdminAccess", () => {
  it("lets in a user whose database role is ADMIN", () => {
    expect(decideAdminAccess("user_1", "ADMIN")).toEqual({ ok: true, userId: "user_1" });
  });

  it("turns away signed-out visitors", () => {
    expect(decideAdminAccess(undefined, "ADMIN")).toEqual({ ok: false, reason: "signed-out" });
    expect(decideAdminAccess("", undefined)).toEqual({ ok: false, reason: "signed-out" });
  });

  it("turns away regular users and users that no longer exist", () => {
    expect(decideAdminAccess("user_1", "USER")).toEqual({ ok: false, reason: "not-admin" });
    expect(decideAdminAccess("user_1", undefined)).toEqual({ ok: false, reason: "not-admin" });
    expect(decideAdminAccess("user_1", "admin")).toEqual({ ok: false, reason: "not-admin" });
  });
});
