import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUserId: vi.fn(),
  saveMyArea: vi.fn(),
  rateLimitResponse: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ currentUserId: mocks.currentUserId }));
vi.mock("@/lib/area-store", () => ({ saveMyArea: mocks.saveMyArea }));
vi.mock("@/lib/rate-limit-store", () => ({ rateLimitResponse: mocks.rateLimitResponse }));

import { PUT } from "./route";

function put(body: unknown) {
  return new Request("http://localhost:3000/api/profile/area", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("PUT /api/profile/area", () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks)) fn.mockReset();
    mocks.currentUserId.mockResolvedValue("user-a");
    mocks.saveMyArea.mockResolvedValue({ ok: true });
    mocks.rateLimitResponse.mockResolvedValue(null);
  });

  it("is 401 when signed out, and saves nothing", async () => {
    mocks.currentUserId.mockResolvedValue(null);
    expect((await PUT(put({ kind: "none" }))).status).toBe(401);
    expect(mocks.saveMyArea).not.toHaveBeenCalled();
  });

  it("saves a region for the signed-in user only", async () => {
    expect((await PUT(put({ kind: "region", regionSlug: "south-florida" }))).status).toBe(200);
    expect(mocks.saveMyArea).toHaveBeenCalledWith("user-a", { kind: "region", regionSlug: "south-florida" });
  });

  it("saves a city with its state, normalized", async () => {
    expect((await PUT(put({ kind: "city", state: "fl", city: " West  Palm Beach " }))).status).toBe(200);
    expect(mocks.saveMyArea).toHaveBeenCalledWith("user-a", { kind: "city", state: "FL", city: "West Palm Beach" });
  });

  it("clears it", async () => {
    expect((await PUT(put({ kind: "none" }))).status).toBe(200);
    expect(mocks.saveMyArea).toHaveBeenCalledWith("user-a", { kind: "none" });
  });

  it("refuses another user's id, a street address or coordinates", async () => {
    for (const body of [
      { kind: "region", regionSlug: "south-florida", userId: "user-b" },
      { kind: "city", state: "FL", city: "1 Ocean Drive" },
      { kind: "city", state: "FL", city: "Miami", latitude: 25.76, longitude: -80.19 },
      { kind: "street", address: "1 Ocean Drive" },
    ]) {
      expect((await PUT(put(body))).status).toBe(400);
    }
    expect(mocks.saveMyArea).not.toHaveBeenCalled();
  });

  it("is 400 for an unknown region and for bad JSON", async () => {
    mocks.saveMyArea.mockResolvedValue({ ok: false, reason: "unknown-region" });
    expect((await PUT(put({ kind: "region", regionSlug: "atlantis" }))).status).toBe(400);
    expect((await PUT(put("{nope"))).status).toBe(400);
  });

  it("is rate limited", async () => {
    mocks.rateLimitResponse.mockResolvedValue(NextResponse.json({ error: "Too many" }, { status: 429 }));
    expect((await PUT(put({ kind: "none" }))).status).toBe(429);
    expect(mocks.saveMyArea).not.toHaveBeenCalled();
  });
});
