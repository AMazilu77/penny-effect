import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findOrg: vi.fn(),
  recordDonation: vi.fn(),
  startCheckout: vi.fn(),
  rateLimitResponse: vi.fn(),
}));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { organization: { findFirst: mocks.findOrg } } }));
vi.mock("@/lib/record-donation", () => ({ recordDonation: mocks.recordDonation }));
vi.mock("@/lib/donation-store", () => ({ prismaDonationStore: {} }));
vi.mock("@/lib/start-checkout", () => ({ startCheckout: mocks.startCheckout }));
vi.mock("@/lib/rate-limit-store", () => ({ rateLimitResponse: mocks.rateLimitResponse }));

import { POST } from "./route";

const KEY = "0b5c2a5e-3f4d-4c1a-9e8b-7d6f5a4b3c2d";
const donation = { id: "don_1", organizationId: "org_1", amountCents: 2500, currency: "USD", status: "PENDING", createdAt: new Date() };

function post(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/donate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
    body: JSON.stringify({ organizationId: "org_1", idempotencyKey: KEY, ...body }),
  });
}

describe("POST /api/donate", () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks)) fn.mockReset();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-a" } });
    mocks.findOrg.mockResolvedValue({ id: "org_1", everyOrgSlug: "givedirectly" });
    mocks.recordDonation.mockResolvedValue({ kind: "created", donation });
    mocks.startCheckout.mockResolvedValue("https://staging.every.org/givedirectly?partner_donation_id=tok#donate");
    mocks.rateLimitResponse.mockResolvedValue(null);
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("DONATIONS_CHECKOUT_ENABLED", "true");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is 401 when signed out", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    expect((await POST(post({ amount: "25", checkout: true }))).status).toBe(401);
    expect(mocks.recordDonation).not.toHaveBeenCalled();
  });

  it("Give page: records a PENDING gift for the session user and returns the Every.org link", async () => {
    const res = await POST(post({ amount: "25", checkout: true }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ donation: { id: "don_1", status: "PENDING" }, checkoutUrl: expect.stringContaining("staging.every.org") });
    expect(mocks.recordDonation).toHaveBeenCalledWith({}, expect.objectContaining({ userId: "user-a", amountCents: 2500 }));
    // Leaving Every.org without paying comes back to the Give page.
    expect(mocks.startCheckout).toHaveBeenCalledWith("don_1", "/give/givedirectly?checkout=cancelled");
    // Strict per user and per IP (card testing).
    const rules = mocks.rateLimitResponse.mock.calls[0][0].map((c: { rule: { name: string } }) => c.rule.name);
    expect(rules).toEqual(expect.arrayContaining(["donate:user", "checkout:user", "checkout:user:day", "checkout:ip", "checkout:ip:day"]));
  });

  it("Give page: under $10 is refused before anything is recorded", async () => {
    const res = await POST(post({ amount: "9.99", checkout: true }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Every.org's minimum gift is $10.00." });
    expect(mocks.recordDonation).not.toHaveBeenCalled();
    expect(mocks.rateLimitResponse).not.toHaveBeenCalled();
  });

  it("Give page: refused while checkout is off (production, previews), nothing recorded", async () => {
    for (const env of ["production", "preview"]) {
      vi.stubEnv("VERCEL_ENV", env);
      expect((await POST(post({ amount: "25", checkout: true }))).status).toBe(409);
    }
    expect(mocks.recordDonation).not.toHaveBeenCalled();
  });

  it("validates the amount (format, $1–$10,000) with readable errors", async () => {
    for (const amount of ["abc", "-5", "5.999", "0.50", "10000.01"]) {
      const res = await POST(post({ amount }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/amount|minimum|maximum/i);
    }
    expect(mocks.recordDonation).not.toHaveBeenCalled();
  });

  it("dashboard form: a gift under $10 is recorded as an intention, with no link", async () => {
    mocks.recordDonation.mockResolvedValue({ kind: "created", donation: { ...donation, amountCents: 500 } });
    const res = await POST(post({ amount: "5" }));
    expect(res.status).toBe(201);
    expect(await res.json()).not.toHaveProperty("checkoutUrl");
    expect(mocks.startCheckout).not.toHaveBeenCalled();
  });

  it("a retried request replays the same gift (200) and the same checkout", async () => {
    mocks.recordDonation.mockResolvedValue({ kind: "replayed", donation });
    const res = await POST(post({ amount: "25", checkout: true }));
    expect(res.status).toBe(200);
    expect(mocks.startCheckout).toHaveBeenCalledWith("don_1", expect.any(String));
  });

  it("refuses organizations users can't see", async () => {
    mocks.findOrg.mockResolvedValue(null);
    expect((await POST(post({ amount: "25", checkout: true }))).status).toBe(400);
    expect(mocks.recordDonation).not.toHaveBeenCalled();
  });

  it("says so when no Every.org link could be made", async () => {
    mocks.startCheckout.mockResolvedValue(null);
    expect((await POST(post({ amount: "25", checkout: true }))).status).toBe(502);
  });
});
