import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const mocks = vi.hoisted(() => ({
  currentUserId: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  rateLimitResponse: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ currentUserId: mocks.currentUserId }));
vi.mock("@/lib/avatar-store", () => ({
  avatarStore: { get: mocks.get, save: mocks.save, remove: mocks.remove },
  avatarUrl: (d: Date) => `/api/profile/avatar?v=${d.getTime()}`,
}));
vi.mock("@/lib/rate-limit-store", () => ({ rateLimitResponse: mocks.rateLimitResponse }));

import { DELETE, GET, POST } from "./route";

async function png(): Promise<Uint8Array> {
  return new Uint8Array(await sharp({ create: { width: 64, height: 32, channels: 3, background: "#5fcf7f" } }).png().toBuffer());
}

function upload(bytes: Uint8Array, type = "image/png") {
  const form = new FormData();
  form.set("file", new File([new Uint8Array(bytes)], "me.png", { type }));
  return new Request("http://localhost:3000/api/profile/avatar", { method: "POST", body: form });
}

describe("/api/profile/avatar", () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks)) fn.mockReset();
    mocks.currentUserId.mockResolvedValue("user-a");
    mocks.rateLimitResponse.mockResolvedValue(null);
    mocks.save.mockResolvedValue(new Date(1_700_000_000_000));
  });

  it("refuses every method when signed out, touching nothing", async () => {
    mocks.currentUserId.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await POST(upload(await png()))).status).toBe(401);
    expect((await DELETE()).status).toBe(401);
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("serves only the signed-in user's own picture, privately", async () => {
    mocks.get.mockResolvedValue({ data: new Uint8Array([1, 2, 3]), updatedAt: new Date() });
    const res = await GET();
    expect(mocks.get).toHaveBeenCalledWith("user-a");
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toContain("private");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("is 404 when there's no uploaded picture", async () => {
    mocks.get.mockResolvedValue(null);
    expect((await GET()).status).toBe(404);
  });

  it("stores a re-encoded square WebP for the signed-in user", async () => {
    const res = await POST(upload(await png()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, url: "/api/profile/avatar?v=1700000000000" });
    const [userId, stored] = mocks.save.mock.calls[0];
    expect(userId).toBe("user-a");
    const meta = await sharp(stored).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 256, 256]);
  });

  it("refuses a non-image and stores nothing", async () => {
    const res = await POST(upload(new TextEncoder().encode("<svg onload=alert(1)>"), "image/svg+xml"));
    expect(res.status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("refuses a request without a file", async () => {
    const req = new Request("http://localhost:3000/api/profile/avatar", { method: "POST", body: new FormData() });
    expect((await POST(req)).status).toBe(400);
  });

  it("refuses an oversized request from its Content-Length before reading it", async () => {
    const req = new Request("http://localhost:3000/api/profile/avatar", {
      method: "POST",
      headers: { "content-length": String(20 * 1024 * 1024) },
      body: "x",
    });
    expect((await POST(req)).status).toBe(413);
  });

  it("is rate limited per user", async () => {
    mocks.rateLimitResponse.mockResolvedValue(new Response(null, { status: 429 }));
    expect((await POST(upload(await png()))).status).toBe(429);
    expect(mocks.rateLimitResponse.mock.calls[0][0]).toEqual([expect.objectContaining({ identifier: "user-a" })]);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("removes only the signed-in user's picture", async () => {
    expect((await DELETE()).status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith("user-a");
  });
});
