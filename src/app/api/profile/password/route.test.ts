import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUserId: vi.fn(),
  rateLimitResponse: vi.fn(),
  findCredentials: vi.fn(),
  setPasswordHash: vi.fn(),
  deleteUser: vi.fn(),
  compare: vi.fn(),
  hash: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ currentUserId: mocks.currentUserId }));
vi.mock("@/lib/rate-limit-store", () => ({ rateLimitResponse: mocks.rateLimitResponse }));
vi.mock("@/lib/account-store", () => ({
  prismaAccountStore: { findCredentials: mocks.findCredentials, setPasswordHash: mocks.setPasswordHash, deleteUser: mocks.deleteUser },
  bcryptHasher: { compare: mocks.compare, hash: mocks.hash },
}));

import { POST } from "./route";

const valid = { currentPassword: "old password", newPassword: "new password", confirmPassword: "new password" };

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/profile/password", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/profile/password", () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks)) fn.mockReset();
    mocks.currentUserId.mockResolvedValue("user-a");
    mocks.rateLimitResponse.mockResolvedValue(null);
    mocks.findCredentials.mockResolvedValue({ passwordHash: "$2b$hash", email: "a@example.com" });
    mocks.compare.mockResolvedValue(true);
    mocks.hash.mockResolvedValue("$2b$new");
  });

  it("is 401 when signed out", async () => {
    mocks.currentUserId.mockResolvedValue(null);
    expect((await POST(post(valid))).status).toBe(401);
    expect(mocks.setPasswordHash).not.toHaveBeenCalled();
  });

  it("changes the signed-in user's own password", async () => {
    expect((await POST(post(valid))).status).toBe(200);
    expect(mocks.findCredentials).toHaveBeenCalledWith("user-a");
    expect(mocks.setPasswordHash).toHaveBeenCalledWith("user-a", "$2b$new");
  });

  it("refuses a body that names another user", async () => {
    expect((await POST(post({ ...valid, userId: "user-b" }))).status).toBe(400);
    expect(mocks.setPasswordHash).not.toHaveBeenCalled();
  });

  it("says when the current password is wrong", async () => {
    mocks.compare.mockResolvedValue(false);
    const res = await POST(post(valid));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Your current password is incorrect." });
    expect(mocks.setPasswordHash).not.toHaveBeenCalled();
  });

  it("is rate limited per user and per IP, before checking the password", async () => {
    mocks.rateLimitResponse.mockResolvedValue(new Response(null, { status: 429 }));
    expect((await POST(post(valid, { "x-real-ip": "203.0.113.9" }))).status).toBe(429);
    expect(mocks.rateLimitResponse.mock.calls[0][0]).toEqual([
      expect.objectContaining({ identifier: "user-a" }),
      expect.objectContaining({ identifier: "203.0.113.9" }),
    ]);
    expect(mocks.compare).not.toHaveBeenCalled();
  });

  it("never sends internal errors or passwords back", async () => {
    mocks.setPasswordHash.mockRejectedValue(new Error("db down: old password"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post(valid));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("old password");
  });
});
