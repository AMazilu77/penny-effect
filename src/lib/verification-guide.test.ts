import { describe, expect, it } from "vitest";
import { ERRORS, verifyForm } from "@/lib/admin-orgs";
import { formatEin, verificationChecklist, VERIFICATION_NOTE_MAX } from "@/lib/verification-guide";

const gd = { ein: "271661997", everyOrgSlug: "givedirectly", website: "https://www.givedirectly.org/" };

describe("formatEin", () => {
  it("adds the dash after the first two digits", () => {
    expect(formatEin("271661997")).toBe("27-1661997");
  });
  it("leaves anything that isn't 9 digits alone", () => {
    expect(formatEin("12-3")).toBe("12-3");
  });
});

describe("verificationChecklist", () => {
  it("has the five checks in order", () => {
    expect(verificationChecklist(gd).map((i) => i.id)).toEqual(["irs", "filings", "profiles", "website", "everyorg"]);
  });

  it("prefills the EIN links in each site's own format (checked live 2026-11-13)", () => {
    const hrefs = verificationChecklist(gd).flatMap((i) => i.links.map((l) => l.href));
    expect(hrefs).toContain("https://projects.propublica.org/nonprofits/organizations/271661997");
    expect(hrefs).toContain("https://www.guidestar.org/profile/27-1661997");
    expect(hrefs).toContain("https://www.charitynavigator.org/ein/271661997");
    expect(hrefs).toContain("https://www.every.org/givedirectly");
    expect(hrefs).toContain("https://www.givedirectly.org/");
  });

  it("tells the admin which EIN to search at the IRS", () => {
    expect(verificationChecklist(gd)[0].check).toContain("27-1661997");
  });

  it("falls back to the sites' search pages without an EIN, and never builds a link from a bad EIN", () => {
    const items = verificationChecklist({ ein: "12345", everyOrgSlug: null, website: null });
    const hrefs = items.flatMap((i) => i.links.map((l) => l.href));
    expect(hrefs.some((h) => h.includes("12345"))).toBe(false);
    expect(items.find((i) => i.id === "website")?.links).toEqual([]);
    expect(items.find((i) => i.id === "everyorg")?.links).toEqual([]);
  });

  it("encodes the Every.org slug so it can't change the path", () => {
    const items = verificationChecklist({ ...gd, everyOrgSlug: "a/b?c" });
    expect(items.find((i) => i.id === "everyorg")?.links[0].href).toBe("https://www.every.org/a%2Fb%3Fc");
  });
});

describe("verifyForm (the verification note)", () => {
  it("accepts a real note and trims it", () => {
    const r = verifyForm.safeParse({ organizationId: "org1", verificationNote: "  IRS current; 990 for 2024 on ProPublica.  " });
    expect(r.success && r.data.verificationNote).toBe("IRS current; 990 for 2024 on ProPublica.");
  });

  it("rejects a missing, too short or too long note", () => {
    expect(verifyForm.safeParse({ organizationId: "org1" }).success).toBe(false);
    expect(verifyForm.safeParse({ organizationId: "org1", verificationNote: "looks fine          " }).success).toBe(false);
    expect(verifyForm.safeParse({ organizationId: "org1", verificationNote: "x".repeat(VERIFICATION_NOTE_MAX + 1) }).success).toBe(
      false,
    );
  });

  it("has a message that explains what to write", () => {
    expect(ERRORS["note-required"]).toMatch(/what you checked/);
  });
});
