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
  locationForm,
  locationUpdate,
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
      locationCity: "New York",
      locationState: "NY",
      locationZip: "10008",
      locationCountry: "US",
      lastSyncedAt: now,
    });
    // Our display name is never overwritten by a refresh.
    expect(fields).not.toHaveProperty("name");
  });

  it("leaves out the address when an admin entered it by hand", () => {
    const fields = everyOrgFields(parseNonprofitResponse(givedirectly), new Date(), { keepLocation: true });
    expect(fields).not.toHaveProperty("locationCity");
    expect(fields).not.toHaveProperty("locationZip");
    expect(fields).toMatchObject({ ein: "271661997" });
  });
});

describe("locationForm", () => {
  const base = { organizationId: "org1" };

  it("reads a full local entry: city, state (any form), ZIP, county without 'County', volunteers", () => {
    expect(
      locationForm.parse({
        ...base,
        locationCity: " West Palm Beach ",
        locationState: "florida",
        locationZip: "33407",
        locationCounty: "Palm Beach County",
        serviceArea: "LOCAL",
        acceptsVolunteers: "on",
        volunteerUrl: "https://thelordsplace.org/make-a-difference/volunteer/",
      }),
    ).toEqual({
      organizationId: "org1",
      locationCity: "West Palm Beach",
      locationState: "FL",
      locationZip: "33407",
      locationCounty: "Palm Beach",
      serviceArea: "LOCAL",
      acceptsVolunteers: true,
      volunteerUrl: "https://thelordsplace.org/make-a-difference/volunteer/",
    });
  });

  it("treats empty fields and an unticked box as not set", () => {
    expect(locationForm.parse({ ...base, locationCity: "", locationState: "", serviceArea: "" })).toEqual({
      organizationId: "org1",
      locationCity: null,
      locationState: null,
      locationZip: null,
      locationCounty: null,
      serviceArea: null,
      acceptsVolunteers: false,
      volunteerUrl: null,
    });
  });

  it("refuses bad values", () => {
    for (const bad of [
      { locationState: "ZZ" },
      { locationState: "FL", locationZip: "3340" },
      { locationState: "FL", locationCity: "<b>Miami</b>" },
      { locationState: "FL", serviceArea: "GALACTIC" },
      { volunteerUrl: "javascript:alert(1)" },
      { volunteerUrl: "not a url" },
      { acceptsVolunteers: "yes" },
      // A city or county needs a state.
      { locationCity: "Miami" },
      { locationCounty: "Broward" },
    ]) {
      expect(locationForm.safeParse({ ...base, ...bad }).success).toBe(false);
    }
  });
});

describe("locationUpdate", () => {
  const fromEveryOrg = { locationCity: "West Palm Beach", locationState: "FL", locationZip: "33407", locationManual: false };
  const input = {
    organizationId: "org1",
    locationCity: "West Palm Beach",
    locationState: "FL",
    locationZip: "33407",
    locationCounty: "Palm Beach",
    serviceArea: "LOCAL" as const,
    acceptsVolunteers: true,
    volunteerUrl: null,
  };

  it("adding only county, service area or volunteering keeps Every.org in charge of the address", () => {
    expect(locationUpdate(input, fromEveryOrg)).toMatchObject({ locationCounty: "Palm Beach", serviceArea: "LOCAL", locationManual: false });
  });

  it("changing the city, state or ZIP marks the address as entered by hand", () => {
    expect(locationUpdate({ ...input, locationCity: "Riviera Beach" }, fromEveryOrg).locationManual).toBe(true);
    expect(locationUpdate({ ...input, locationZip: "33409" }, fromEveryOrg).locationManual).toBe(true);
    expect(locationUpdate(input, { ...fromEveryOrg, locationManual: true }).locationManual).toBe(true);
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
  const ready = { ein: "271661997", everyOrgId: "x", isDisbursable: true, status: "ACTIVE" as const, serviceArea: "LOCAL" as const };

  it("allows a linked, disbursable, active organization with an EIN", () => {
    expect(verifyBlocker(ready)).toBeNull();
  });

  it("names the first missing requirement", () => {
    expect(verifyBlocker({ ...ready, everyOrgId: null })).toBe("no-everyorg");
    expect(verifyBlocker({ ...ready, ein: null })).toBe("no-ein");
    expect(verifyBlocker({ ...ready, isDisbursable: false })).toBe("not-disbursable");
    expect(verifyBlocker({ ...ready, status: "HIDDEN" })).toBe("hidden");
    expect(verifyBlocker({ ...ready, serviceArea: null })).toBe("no-service-area");
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
