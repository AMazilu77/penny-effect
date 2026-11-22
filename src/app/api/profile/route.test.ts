import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

// No database or NextAuth: the session, store and rate limiter are spies.
const mocks = vi.hoisted(() => ({
  currentUserId: vi.fn(),
  update: vi.fn(),
  rateLimitResponse: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ currentUserId: mocks.currentUserId }));
vi.mock("@/lib/profile-store", () => ({ profileStore: { update: mocks.update } }));
vi.mock("@/lib/rate-limit-store", () => ({ rateLimitResponse: mocks.rateLimitResponse }));

import { PATCH } from "./route";

function patch(body: unknown) {
  return new Request("http://localhost:3000/api/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("PATCH /api/profile", () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks)) fn.mockReset();
    mocks.currentUserId.mockResolvedValue("user-a");
    mocks.update.mockResolvedValue(true);
    mocks.rateLimitResponse.mockResolvedValue(null);
  });

  it("is 401 when signed out, and touches nothing", async () => {
    mocks.currentUserId.mockResolvedValue(null);
    const res = await PATCH(patch({ name: "Ada" }));
    expect(res.status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("updates only the signed-in user's own row", async () => {
    const res = await PATCH(patch({ name: "  Ada  ", bio: "Hi", showNameInTotals: true }));
    expect(res.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith("user-a", { name: "Ada", bio: "Hi", showNameInTotals: true });
  });

  it("refuses a body that names another user, and updates nothing", async () => {
    const res = await PATCH(patch({ userId: "user-b", name: "Mallory" }));
    expect(res.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("refuses an email change (email is read-only)", async () => {
    expect((await PATCH(patch({ email: "new@example.com" }))).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("explains a bio that's too long", async () => {
    const res = await PATCH(patch({ bio: "x".repeat(281) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Keep your bio to 280 characters." });
  });

  it("is 400 for bad JSON", async () => {
    expect((await PATCH(patch("{not json"))).status).toBe(400);
  });

  it("is 404 when the account no longer exists", async () => {
    mocks.update.mockResolvedValue(false);
    expect((await PATCH(patch({ name: "Ada" }))).status).toBe(404);
  });

  it("passes on the rate limiter's 429, rate-limited per user", async () => {
    mocks.rateLimitResponse.mockResolvedValue(NextResponse.json({ error: "Too many" }, { status: 429 }));
    const res = await PATCH(patch({ name: "Ada" }));
    expect(res.status).toBe(429);
    expect(mocks.rateLimitResponse.mock.calls[0][0]).toEqual([expect.objectContaining({ identifier: "user-a" })]);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("doesn't leak internal errors", async () => {
    mocks.update.mockRejectedValue(new Error("connection string postgres://secret"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await PATCH(patch({ name: "Ada" }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});
