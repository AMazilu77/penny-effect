import { beforeEach, describe, expect, it, vi } from "vitest";

// Admin permission checks for the region actions: no database, no Next.js
// runtime. requireAdminPage is a spy; for a non-admin it throws, as the real
// one does (notFound / redirect to sign-in).
const mocks = vi.hoisted(() => ({
  requireAdminPage: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
  regionCreate: vi.fn(),
  regionUpdateMany: vi.fn(),
  regionDeleteMany: vi.fn(),
  countyDeleteMany: vi.fn(),
  countyCreateMany: vi.fn(),
}));
vi.mock("@/lib/admin", () => ({ requireAdminPage: mocks.requireAdminPage }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => {
  const tx = {
    region: { updateMany: mocks.regionUpdateMany },
    regionCounty: { deleteMany: mocks.countyDeleteMany, createMany: mocks.countyCreateMany },
  };
  return {
    prisma: {
      region: { create: mocks.regionCreate, deleteMany: mocks.regionDeleteMany },
      $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    },
  };
});

import { createRegion, deleteRegion, saveRegion } from "./actions";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const NOT_ADMIN = new Error("NEXT_NOT_FOUND");
const writes = () =>
  [mocks.regionCreate, mocks.regionUpdateMany, mocks.regionDeleteMany, mocks.countyDeleteMany, mocks.countyCreateMany].flatMap(
    (m) => m.mock.calls,
  );

describe("admin region actions", () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks)) fn.mockClear();
    mocks.requireAdminPage.mockReset();
    mocks.requireAdminPage.mockResolvedValue({ userId: "admin-1" });
    mocks.regionUpdateMany.mockResolvedValue({ count: 1 });
    mocks.regionDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("a non-admin can't create, edit or delete a region, and nothing is written", async () => {
    mocks.requireAdminPage.mockRejectedValue(NOT_ADMIN);
    await expect(createRegion(form({ name: "Treasure Coast", counties: "Martin, FL" }))).rejects.toBe(NOT_ADMIN);
    await expect(saveRegion(form({ regionId: "r1", name: "South Florida", counties: "Broward, FL" }))).rejects.toBe(NOT_ADMIN);
    await expect(deleteRegion(form({ regionId: "r1", confirm: "on" }))).rejects.toBe(NOT_ADMIN);
    expect(writes()).toEqual([]);
  });

  it("an admin creates a region with its counties", async () => {
    await expect(createRegion(form({ name: "Treasure Coast", counties: "Martin, FL\nSt. Lucie, FL" }))).rejects.toThrow(
      "REDIRECT /admin/regions?notice=region-created",
    );
    expect(mocks.regionCreate).toHaveBeenCalledWith({
      data: {
        name: "Treasure Coast",
        slug: "treasure-coast",
        counties: { createMany: { data: [{ state: "FL", county: "Martin" }, { state: "FL", county: "St. Lucie" }] } },
      },
    });
  });

  it("an admin replaces a region's counties", async () => {
    await expect(saveRegion(form({ regionId: "r1", name: "South Florida", counties: "Broward, FL\nMiami-Dade, FL" }))).rejects.toThrow(
      "notice=region-saved",
    );
    expect(mocks.countyDeleteMany).toHaveBeenCalledWith({ where: { regionId: "r1" } });
    expect(mocks.countyCreateMany).toHaveBeenCalledWith({
      data: [
        { state: "FL", county: "Broward", regionId: "r1" },
        { state: "FL", county: "Miami-Dade", regionId: "r1" },
      ],
    });
  });

  it("refuses bad input without writing", async () => {
    await expect(createRegion(form({ name: "X", counties: "Martin, FL" }))).rejects.toThrow("error=region-invalid");
    await expect(saveRegion(form({ regionId: "r1", name: "South Florida", counties: "Broward" }))).rejects.toThrow("error=region-invalid");
    expect(writes()).toEqual([]);
  });

  it("deleting needs the confirm box", async () => {
    await expect(deleteRegion(form({ regionId: "r1" }))).rejects.toThrow("error=region-invalid");
    expect(mocks.regionDeleteMany).not.toHaveBeenCalled();
    await expect(deleteRegion(form({ regionId: "r1", confirm: "on" }))).rejects.toThrow("notice=region-deleted");
    expect(mocks.regionDeleteMany).toHaveBeenCalledWith({ where: { id: "r1" } });
  });
});
