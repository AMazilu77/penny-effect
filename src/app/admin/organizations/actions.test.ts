import { beforeEach, describe, expect, it, vi } from "vitest";

// Admin permission and rule checks for the location form and verification
// (D-028). No database or Next.js runtime: requireAdminPage and Prisma are spies.
const mocks = vi.hoisted(() => ({
  requireAdminPage: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}));
vi.mock("@/lib/admin", () => ({ requireAdminPage: mocks.requireAdminPage }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { organization: { findUnique: mocks.findUnique, update: mocks.update, updateMany: mocks.updateMany } },
}));

import { saveLocation, restoreEveryOrgAddress, verifyOrganization } from "./actions";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const NOT_ADMIN = new Error("NEXT_NOT_FOUND");
const location = {
  organizationId: "org1",
  locationCity: "West Palm Beach",
  locationState: "FL",
  locationZip: "33407",
  locationCounty: "Palm Beach",
  serviceArea: "LOCAL",
  acceptsVolunteers: "on",
  volunteerUrl: "https://thelordsplace.org/make-a-difference/volunteer/",
};

describe("saveLocation / restoreEveryOrgAddress", () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks)) fn.mockClear();
    mocks.requireAdminPage.mockReset();
    mocks.requireAdminPage.mockResolvedValue({ userId: "admin-1" });
    mocks.findUnique.mockResolvedValue({ locationCity: "West Palm Beach", locationState: "FL", locationZip: "33407", locationManual: false });
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("a non-admin can't change an organization's location or volunteering", async () => {
    mocks.requireAdminPage.mockRejectedValue(NOT_ADMIN);
    await expect(saveLocation(form(location))).rejects.toBe(NOT_ADMIN);
    await expect(restoreEveryOrgAddress(form({ organizationId: "org1" }))).rejects.toBe(NOT_ADMIN);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("an admin saves county, service area and volunteering", async () => {
    await expect(saveLocation(form(location))).rejects.toThrow("notice=location");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "org1" },
      data: {
        locationCity: "West Palm Beach",
        locationState: "FL",
        locationZip: "33407",
        locationCounty: "Palm Beach",
        locationManual: false,
        serviceArea: "LOCAL",
        acceptsVolunteers: true,
        volunteerUrl: "https://thelordsplace.org/make-a-difference/volunteer/",
      },
    });
  });

  it("refuses an unsafe volunteer link without saving", async () => {
    await expect(saveLocation(form({ ...location, volunteerUrl: "javascript:alert(1)" }))).rejects.toThrow("error=location-invalid");
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe("verifyOrganization", () => {
  const ready = { ein: "592240502", everyOrgId: "x", isDisbursable: true, status: "ACTIVE" };
  const note = { organizationId: "org1", verificationNote: "IRS listed, not revoked; 990 for 2024 on ProPublica; EIN in website footer." };

  beforeEach(() => {
    for (const fn of Object.values(mocks)) fn.mockClear();
    mocks.requireAdminPage.mockReset();
    mocks.requireAdminPage.mockResolvedValue({ userId: "admin-1" });
  });

  it("a non-admin can't verify", async () => {
    mocks.requireAdminPage.mockRejectedValue(NOT_ADMIN);
    await expect(verifyOrganization(form(note))).rejects.toBe(NOT_ADMIN);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("needs a service area first: an EIN alone isn't enough", async () => {
    mocks.findUnique.mockResolvedValue({ ...ready, serviceArea: null });
    await expect(verifyOrganization(form(note))).rejects.toThrow("error=no-service-area");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("verifies once the service area is set", async () => {
    mocks.findUnique.mockResolvedValue({ ...ready, serviceArea: "LOCAL" });
    await expect(verifyOrganization(form(note))).rejects.toThrow("notice=verified");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ verifiedById: "admin-1" }) }));
  });
});
