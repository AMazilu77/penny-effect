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
    vi.stubEnv("EVERYORG_DONATE_HOST", "staging.every.org");
    vi.stubEnv("EVERYORG_STAGING_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("EVERYORG_STAGING_WEBHOOK_TOKEN", "public-routing-token");
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
    vi.stubEnv("EVERYORG_STAGING_WEBHOOK_SECRET", "");
    expect((await POST(request(JSON.stringify(oneTime), { authorization: "Bearer " }))).status).toBe(401);
    expect((await POST(request(JSON.stringify(oneTime), { authorization: `Bearer ${SECRET}` }))).status).toBe(401);
  });

  it("refuses oversized bodies before reading them", async () => {
    expect((await POST(request("x".repeat(70_000)))).status).toBe(413);
    expect(store.recordEvent).not.toHaveBeenCalled();
  });

  it("accepts a JSON body whatever its Content-Type (Every.org doesn't document one)", async () => {
    for (const contentType of ["text/plain", "application/json; charset=utf-8", ""]) {
      expect((await POST(request(JSON.stringify(oneTime), { "content-type": contentType }))).status).toBe(200);
    }
    expect(store.recordEvent).toHaveBeenCalledTimes(3);
  });

  it("completes a matching gift end to end (pending → completed with Every.org's amount)", async () => {
    const row = {
      id: "don_1",
      status: "PENDING",
      amountCents: 1000,
      requestedAmountCents: 1000,
      currency: "USD",
      checkoutToken: oneTime.partnerDonationId,
      checkoutEin: "271661997",
      checkoutSlug: "givedirectly",
      externalId: null,
    };
    store.findByCheckoutToken.mockResolvedValue(row);
    store.complete.mockResolvedValue(true);
    const res = await POST(request(JSON.stringify({ ...oneTime, amount: "20.00", netAmount: "19.26" })));
    expect(res.status).toBe(200);
    expect(store.complete).toHaveBeenCalledWith("don_1", expect.objectContaining({ chargeId: "ch_test_0001", amountCents: 2000, requestedAmountCents: 1000, netAmountCents: 1926 }));
    expect(store.recordEvent.mock.calls[0][0]).toMatchObject({ kind: "DONATION", status: "APPLIED", donationId: "don_1" });
  });

  it("rejects a staging request signed with the production secret", async () => {
    vi.stubEnv("EVERYORG_WEBHOOK_SECRET", "p".repeat(64));
    expect((await POST(request(JSON.stringify(oneTime), { authorization: `Bearer ${"p".repeat(64)}` }))).status).toBe(401);
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
