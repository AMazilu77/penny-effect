import { describe, expect, it } from "vitest";
import { isVisibleOrganization, VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";

const visible = { status: "ACTIVE" as const, verifiedAt: new Date(), ein: "203069841", isDisbursable: true };

describe("isVisibleOrganization", () => {
  it("shows an active, verified, disbursable organization with an EIN", () => {
    expect(isVisibleOrganization(visible)).toBe(true);
  });

  it("hides it when any requirement is missing", () => {
    expect(isVisibleOrganization({ ...visible, status: "HIDDEN" })).toBe(false);
    expect(isVisibleOrganization({ ...visible, verifiedAt: null })).toBe(false);
    expect(isVisibleOrganization({ ...visible, ein: null })).toBe(false);
    expect(isVisibleOrganization({ ...visible, isDisbursable: false })).toBe(false);
  });
});

describe("VISIBLE_ORGANIZATION_WHERE", () => {
  it("encodes the same four requirements for database queries", () => {
    expect(VISIBLE_ORGANIZATION_WHERE).toEqual({
      status: "ACTIVE",
      verifiedAt: { not: null },
      ein: { not: null },
      isDisbursable: true,
    });
  });
});
