import { describe, expect, it } from "vitest";
import { highestImpactLabel, GIVEDIRECTLY_EIN } from "@/lib/highest-impact";
import { orgStatuses, STATUS_GUIDE } from "@/lib/org-status";

const base = {
  status: "ACTIVE" as const,
  verifiedAt: new Date("2026-11-12"),
  ein: "123456789",
  everyOrgId: "abc",
  isDisbursable: true,
};

describe("orgStatuses", () => {
  it("calls a verified, active, linked, disbursable org Live and nothing else", () => {
    expect(orgStatuses(base)).toEqual(["live"]);
  });

  it("shows a newly imported org as waiting for review", () => {
    expect(orgStatuses({ ...base, verifiedAt: null })).toEqual(["waiting"]);
  });

  it("explains why a verified org isn't live", () => {
    expect(orgStatuses({ ...base, isDisbursable: false })).toEqual(["verified", "cant-receive"]);
    expect(orgStatuses({ ...base, status: "HIDDEN" })).toEqual(["verified", "hidden"]);
  });

  it("flags unlinked orgs and missing EINs", () => {
    expect(orgStatuses({ ...base, verifiedAt: null, everyOrgId: null, ein: null })).toEqual(["waiting", "not-linked"]);
    expect(orgStatuses({ ...base, verifiedAt: null, ein: null })).toEqual(["waiting", "no-ein"]);
  });

  it("has a label and a plain-language meaning for every status", () => {
    for (const s of Object.values(STATUS_GUIDE)) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.meaning.length).toBeGreaterThan(20);
    }
  });
});

describe("highestImpactLabel", () => {
  it("labels GiveDirectly as GiveWell's cash-transfer benchmark in Highest Impact", () => {
    expect(highestImpactLabel({ ein: GIVEDIRECTLY_EIN, categorySlugs: ["highest-impact"] })).toBe(
      "GiveWell's cash-transfer benchmark",
    );
  });

  it("adds nothing outside Highest Impact or for other organizations", () => {
    expect(highestImpactLabel({ ein: GIVEDIRECTLY_EIN, categorySlugs: ["humanitarian-aid"] })).toBeNull();
    expect(highestImpactLabel({ ein: "203069841", categorySlugs: ["highest-impact"] })).toBeNull();
  });
});
