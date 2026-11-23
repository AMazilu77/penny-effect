import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUserId: vi.fn(),
  saveInterests: vi.fn(),
  rateLimitResponse: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ currentUserId: mocks.currentUserId }));
vi.mock("@/lib/interests-store", () => ({ saveInterests: mocks.saveInterests }));
vi.mock("@/lib/rate-limit-store", () => ({ rateLimitResponse: mocks.rateLimitResponse }));

import { PUT } from "./route";

function put(body: unknown) {
  return new Request("http://localhost:3000/api/profile/causes", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/profile/causes", () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks)) fn.mockReset();
    mocks.currentUserId.mockResolvedValue("user-a");
    mocks.saveInterests.mockResolvedValue({ ok: true });
    mocks.rateLimitResponse.mockResolvedValue(null);
  });

  it("is 401 when signed out", async () => {
    mocks.currentUserId.mockResolvedValue(null);
    expect((await PUT(put({ categoryIds: ["c1"] }))).status).toBe(401);
    expect(mocks.saveInterests).not.toHaveBeenCalled();
  });

  it("saves for the signed-in user only, ignoring any user id in the body", async () => {
    const res = await PUT(put({ categoryIds: ["c1", "c2", "c1"], userId: "user-b" }));
    expect(res.status).toBe(200);
    expect(mocks.saveInterests).toHaveBeenCalledWith("user-a", ["c1", "c2"]);
  });

  it("uses the onboarding rule: at least one cause", async () => {
    const res = await PUT(put({ categoryIds: [] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Pick at least one cause." });
  });

  it("refuses unknown category ids", async () => {
    mocks.saveInterests.mockResolvedValue({ ok: false, reason: "unknown-category" });
    expect((await PUT(put({ categoryIds: ["nope"] }))).status).toBe(400);
  });
});
