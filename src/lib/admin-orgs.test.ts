import { describe, expect, it } from "vitest";
import givedirectly from "@/lib/everyorg/fixtures/nonprofit-givedirectly.json";
import { parseNonprofitResponse } from "@/lib/everyorg/parse";
import {
  categoriesForm,
  everyOrgFields,
  everyOrgRefForm,
  formDataToObject,
  importForm,
  linkClearsVerification,
  messageFor,
  verifyBlocker,
} from "@/lib/admin-orgs";

describe("everyOrgFields", () => {
  it("maps Every.org details onto our Organization columns", () => {
    const now = new Date("2026-11-12T00:00:00Z");
    const fields = everyOrgFields(parseNonprofitResponse(givedirectly), now);
    expect(fields).toMatchObject({
      ein: "271661997",
      everyOrgId: "c1c38cb5-16d6-4aca-a949-83c8e7cc1b88",
      everyOrgSlug: "givedirectly",
      isDisbursable: true,
      nteeCode: "P60",
      website: "https://www.givedirectly.org/",
      lastSyncedAt: now,
    });
    // Our display name is never overwritten by a refresh.
    expect(fields).not.toHaveProperty("name");
  });
});

describe("linkClearsVerification", () => {
  it("clears only when the EIN changes from a known one", () => {
    expect(linkClearsVerification(null, "271661997")).toBe(false);
    expect(linkClearsVerification("271661997", "271661997")).toBe(false);
    expect(linkClearsVerification("271661997", "203069841")).toBe(true);
    expect(linkClearsVerification("271661997", null)).toBe(true);
  });
});

describe("verifyBlocker", () => {
  const ready = { ein: "271661997", everyOrgId: "x", isDisbursable: true, status: "ACTIVE" as const };

  it("allows a linked, disbursable, active organization with an EIN", () => {
    expect(verifyBlocker(ready)).toBeNull();
  });

  it("names the first missing requirement", () => {
    expect(verifyBlocker({ ...ready, everyOrgId: null })).toBe("no-everyorg");
    expect(verifyBlocker({ ...ready, ein: null })).toBe("no-ein");
    expect(verifyBlocker({ ...ready, isDisbursable: false })).toBe("not-disbursable");
    expect(verifyBlocker({ ...ready, status: "HIDDEN" })).toBe("hidden");
  });
});

describe("form schemas", () => {
  it("accepts Every.org slugs and EINs, rejects anything that could change the URL", () => {
    expect(everyOrgRefForm.safeParse({ organizationId: "o1", everyOrgRef: " 27-1661997 " }).success).toBe(true);
    expect(everyOrgRefForm.safeParse({ organizationId: "o1", everyOrgRef: "againstmalaria" }).success).toBe(true);
    for (const bad of ["", "../search/x", "a b", "x?y=1", "a/b"]) {
      expect(everyOrgRefForm.safeParse({ organizationId: "o1", everyOrgRef: bad }).success).toBe(false);
    }
    expect(importForm.safeParse({ everyOrgSlug: "hki" }).success).toBe(true);
    expect(importForm.safeParse({ everyOrgSlug: "hki/../x" }).success).toBe(false);
  });

  it("reads repeated checkbox values as a list, including none", () => {
    const fd = new FormData();
    fd.append("organizationId", "o1");
    expect(categoriesForm.parse(formDataToObject(fd, ["categoryIds"]))).toEqual({ organizationId: "o1", categoryIds: [] });
    fd.append("categoryIds", "c1");
    fd.append("categoryIds", "c2");
    expect(categoriesForm.parse(formDataToObject(fd, ["categoryIds"])).categoryIds).toEqual(["c1", "c2"]);
  });
});

describe("messageFor", () => {
  it("maps known codes and ignores anything else", () => {
    expect(messageFor("notice", "verified")).toMatch(/Verified/);
    expect(messageFor("error", "no-ein")).toMatch(/EIN/);
    expect(messageFor("error", "<script>")).toBeNull();
    expect(messageFor("error", "toString")).toBeNull();
    expect(messageFor("notice", ["verified"])).toBeNull();
    expect(messageFor("notice", undefined)).toBeNull();
  });
});
