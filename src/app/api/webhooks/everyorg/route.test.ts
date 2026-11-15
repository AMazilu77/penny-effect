import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import oneTime from "@/lib/everyorg-webhook/fixtures/donation-one-time.json";

// No database: the store is replaced by spies.
const store = vi.hoisted(() => ({
  findByCheckoutToken: vi.fn(),
  findByChargeId: vi.fn(),
  complete: vi.fn(),
  transition: vi.fn(),
  recordEvent: vi.fn(),
}));
vi.mock("@/lib/everyorg-webhook/store", () => ({ prismaWebhookStore: store }));

import { POST } from "./route";

const SECRET = "s".repeat(64);
const URL_ = "http://localhost:3000/api/webhooks/everyorg";

function request(body: string, headers: Record<string, string> = {}) {
  return new Request(URL_, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${SECRET}`, ...headers },
    body,
  });
}

describe("POST /api/webhooks/everyorg", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("DONATIONS_CHECKOUT_ENABLED", "true");
    vi.stubEnv("EVERYORG_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("EVERYORG_WEBHOOK_TOKEN", "public-routing-token");
    for (const fn of Object.values(store)) fn.mockReset();
    store.findByCheckoutToken.mockResolvedValue(null);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is a 404 while checkout is off, even with the right token", async () => {
    vi.stubEnv("DONATIONS_CHECKOUT_ENABLED", "false");
    expect((await POST(request(JSON.stringify(oneTime)))).status).toBe(404);
    vi.stubEnv("DONATIONS_CHECKOUT_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "production");
    expect((await POST(request(JSON.stringify(oneTime)))).status).toBe(404);
    expect(store.recordEvent).not.toHaveBeenCalled();
  });

  it("answers a bare 401 and stores nothing without the right bearer token", async () => {
    for (const authorization of ["", "Bearer wrong", "Bearer public-routing-token", SECRET]) {
      const res = await POST(request(JSON.stringify(oneTime), { authorization }));
      expect(res.status).toBe(401);
      expect(await res.text()).toBe("");
    }
    expect(store.recordEvent).not.toHaveBeenCalled();
    expect(store.findByCheckoutToken).not.toHaveBeenCalled();
  });

  it("fails closed when the secret isn't configured", async () => {
    vi.stubEnv("EVERYORG_WEBHOOK_SECRET", "");
    expect((await POST(request(JSON.stringify(oneTime), { authorization: "Bearer " }))).status).toBe(401);
  });

  it("refuses non-JSON and oversized bodies", async () => {
    expect((await POST(request("x", { "content-type": "text/plain" }))).status).toBe(415);
    expect((await POST(request("x".repeat(70_000)))).status).toBe(413);
    expect(store.recordEvent).not.toHaveBeenCalled();
  });

  it("acknowledges an authenticated event with 200 even when it doesn't match, and logs it", async () => {
    const res = await POST(request(JSON.stringify(oneTime)));
    expect(res.status).toBe(200);
    expect(store.recordEvent).toHaveBeenCalledOnce();
    expect(store.recordEvent.mock.calls[0][0]).toMatchObject({ kind: "DONATION", status: "REJECTED" });
    expect(store.complete).not.toHaveBeenCalled();
  });

  it("records broken JSON from an authenticated sender as rejected", async () => {
    expect((await POST(request("{not json"))).status).toBe(200);
    expect(store.recordEvent.mock.calls[0][0]).toMatchObject({ status: "REJECTED", reason: "body is not valid JSON" });
  });

  it("answers 500 on our own failure so Every.org retries", async () => {
    store.recordEvent.mockRejectedValue(new Error("db down"));
    expect((await POST(request(JSON.stringify(oneTime)))).status).toBe(500);
  });
});
