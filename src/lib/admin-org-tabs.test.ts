import { describe, expect, it } from "vitest";
import {
  ORG_TABS,
  orgSearchWhere,
  orgTabHref,
  orgTabWhere,
  parseOrgSearch,
  parseOrgTab,
  type OrgTab,
} from "@/lib/admin-org-tabs";
import { isVisibleOrganization } from "@/lib/organizations";

type Org = { status: "ACTIVE" | "HIDDEN"; verifiedAt: Date | null; ein: string | null; isDisbursable: boolean };

// Evaluates the small subset of Prisma's where syntax that orgTabWhere uses,
// so we can check the tabs against real combinations of flags.
function matches(org: Org, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "NOT") return !matches(org, cond as Record<string, unknown>);
    if (key === "AND") return (cond as Record<string, unknown>[]).every((w) => matches(org, w));
    const value = org[key as keyof Org];
    if (cond && typeof cond === "object" && "not" in cond) return value !== (cond as { not: unknown }).not;
    return value === cond;
  });
}

const flags = [true, false];
const allOrgs: Org[] = (["ACTIVE", "HIDDEN"] as const).flatMap((status) =>
  flags.flatMap((verified) =>
    flags.flatMap((hasEin) =>
      flags.map((isDisbursable) => ({
        status,
        verifiedAt: verified ? new Date() : null,
        ein: hasEin ? "203069841" : null,
        isDisbursable,
      })),
    ),
  ),
);

const tabOf = (org: Org): OrgTab[] => ORG_TABS.filter((tab) => matches(org, orgTabWhere(tab) as Record<string, unknown>));

describe("orgTabWhere", () => {
  it("puts every organization in exactly one tab", () => {
    for (const org of allOrgs) expect(tabOf(org)).toHaveLength(1);
  });

  it("Hidden holds every hidden organization, even a verified one", () => {
    for (const org of allOrgs.filter((o) => o.status === "HIDDEN")) expect(tabOf(org)).toEqual(["hidden"]);
  });

  it("Live is exactly what users see; Needs review is every other active organization", () => {
    for (const org of allOrgs.filter((o) => o.status === "ACTIVE")) {
      expect(tabOf(org)).toEqual([isVisibleOrganization(org) ? "live" : "review"]);
    }
  });
});

describe("parseOrgTab", () => {
  it("defaults to Needs review for missing or unknown values", () => {
    expect(parseOrgTab(undefined)).toBe("review");
    expect(parseOrgTab("deleted")).toBe("review");
    expect(parseOrgTab(["hidden"])).toBe("review");
  });

  it("accepts the three tabs", () => {
    expect(parseOrgTab("live")).toBe("live");
    expect(parseOrgTab("hidden")).toBe("hidden");
  });
});

describe("orgSearchWhere", () => {
  it("matches all when empty", () => {
    expect(orgSearchWhere("")).toEqual({});
  });

  it("searches names without case", () => {
    expect(orgSearchWhere("cancer")).toEqual({ OR: [{ name: { contains: "cancer", mode: "insensitive" } }] });
  });

  it("also searches the EIN when the text is digits, dash optional", () => {
    expect(orgSearchWhere("13-1788491")).toEqual({
      OR: [{ name: { contains: "13-1788491", mode: "insensitive" } }, { ein: { contains: "131788491" } }],
    });
  });

  it("trims and caps the query", () => {
    expect(parseOrgSearch("  red cross ")).toBe("red cross");
    expect(parseOrgSearch("x".repeat(500))).toHaveLength(100);
    expect(parseOrgSearch(["a"])).toBe("");
  });
});

describe("orgTabHref", () => {
  it("keeps the default tab out of the URL and keeps the search", () => {
    expect(orgTabHref("review")).toBe("/admin/organizations");
    expect(orgTabHref("hidden")).toBe("/admin/organizations?tab=hidden");
    expect(orgTabHref("live", "red cross")).toBe("/admin/organizations?tab=live&q=red+cross");
  });
});
