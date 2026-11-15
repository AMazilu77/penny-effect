import { beforeEach, describe, expect, it } from "vitest";
import oneTime from "./fixtures/donation-one-time.json";
import refund from "./fixtures/refund-assumed.json";
import dispute from "./fixtures/dispute-assumed.json";
import {
  processPartnerWebhook,
  type DonationStatusName,
  type MatchableDonation,
  type PartnerEventRecord,
  type WebhookStore,
} from "./process";

const NOW = new Date("2026-11-14T06:00:00Z");
const TOKEN = "tok_AAAAAAAAAAAAAAAAAAAAAA";

type Row = MatchableDonation & { completedAt?: Date; netAmountCents?: number | null; paymentMethod?: string | null };

// In-memory store with the same guarantees as the Prisma one: conditional
// updates, unique externalId, events deduplicated on (kind, chargeId).
function memoryStore(rows: Row[]) {
  const events: PartnerEventRecord[] = [];
  const store: WebhookStore = {
    async findByCheckoutToken(t) {
      return rows.find((r) => r.checkoutToken === t) ?? null;
    },
    async findByChargeId(c) {
      return rows.find((r) => r.externalId === c) ?? null;
    },
    async complete(id, data) {
      const row = rows.find((r) => r.id === id);
      if (!row || row.status !== "PENDING" || row.externalId) return false;
      if (rows.some((r) => r.externalId === data.chargeId)) return false;
      Object.assign(row, { status: "COMPLETED", externalId: data.chargeId, ...data });
      return true;
    },
    async transition(id, from, to) {
      const row = rows.find((r) => r.id === id);
      if (!row || !from.includes(row.status)) return false;
      row.status = to;
      return true;
    },
    async recordEvent(event) {
      if (event.chargeId && events.some((e) => e.kind === event.kind && e.chargeId === event.chargeId)) return;
      events.push(event);
    },
  };
  return { store, events, rows };
}

function pending(overrides: Partial<Row> = {}): Row {
  return {
    id: "don_1",
    status: "PENDING",
    amountCents: 1000,
    currency: "USD",
    checkoutToken: TOKEN,
    checkoutEin: "271661997",
    checkoutSlug: "givedirectly",
    externalId: null,
    ...overrides,
  };
}

function completed(status: DonationStatusName = "COMPLETED"): Row {
  return pending({ status, externalId: "ch_test_0001" });
}

describe("donation events", () => {
  let mem: ReturnType<typeof memoryStore>;
  beforeEach(() => {
    mem = memoryStore([pending()]);
  });

  it("completes a matching PENDING gift and records net amount and method", async () => {
    const result = await processPartnerWebhook(mem.store, oneTime, NOW);
    expect(result).toEqual({ kind: "DONATION", status: "APPLIED", reason: null, donationId: "don_1" });
    expect(mem.rows[0]).toMatchObject({
      status: "COMPLETED",
      externalId: "ch_test_0001",
      netAmountCents: 948,
      paymentMethod: "card",
      completedAt: NOW,
    });
  });

  it("is idempotent: a retried webhook changes nothing and is logged once", async () => {
    await processPartnerWebhook(mem.store, oneTime, NOW);
    const again = await processPartnerWebhook(mem.store, oneTime, new Date("2026-11-15T00:00:00Z"));
    expect(again.status).toBe("DUPLICATE");
    expect(mem.rows[0].completedAt).toEqual(NOW);
    expect(mem.events).toHaveLength(1);
    expect(mem.events[0].status).toBe("APPLIED");
  });

  it("never stores donor data in the audit log", async () => {
    await processPartnerWebhook(mem.store, oneTime, NOW);
    const text = JSON.stringify(mem.events);
    for (const pii of ["Jane", "Doe", "jane@", "Main St", "pennies", "Keep it up"]) expect(text).not.toContain(pii);
  });

  const mismatches: [string, Record<string, unknown>, RegExp][] = [
    ["an unknown partnerDonationId", { partnerDonationId: "tok_other" }, /no donation/],
    ["a missing partnerDonationId", { partnerDonationId: undefined }, /no partnerDonationId/],
    ["another nonprofit's EIN", { toNonprofit: { slug: "givedirectly", ein: "123456789" } }, /EIN/],
    ["no EIN when we expect one", { toNonprofit: { slug: "givedirectly" } }, /EIN/],
    ["a different amount", { amount: "15.00" }, /amount 1500/],
    ["a malformed amount", { amount: "$10" }, /plain dollar/],
    ["another currency", { currency: "EUR" }, /currency/],
    ["a monthly gift", { frequency: "Monthly" }, /One-time/],
    ["a missing chargeId", { chargeId: undefined }, /invalid donation payload: chargeId/],
  ];
  for (const [name, change, reason] of mismatches) {
    it(`rejects ${name} and leaves the gift PENDING`, async () => {
      const result = await processPartnerWebhook(mem.store, { ...oneTime, ...change }, NOW);
      expect(result.status).toBe("REJECTED");
      expect(result.reason).toMatch(reason);
      expect(mem.rows[0].status).toBe("PENDING");
      expect(mem.rows[0].externalId).toBeNull();
      expect(mem.events).toHaveLength(1);
    });
  }

  it("matches by slug when we have no EIN snapshot", async () => {
    mem = memoryStore([pending({ checkoutEin: null })]);
    expect((await processPartnerWebhook(mem.store, oneTime, NOW)).status).toBe("APPLIED");
    mem = memoryStore([pending({ checkoutEin: null, checkoutSlug: "other-org" })]);
    expect((await processPartnerWebhook(mem.store, oneTime, NOW)).reason).toMatch(/slug/);
  });

  it("accepts a dashed EIN from Every.org", async () => {
    const body = { ...oneTime, toNonprofit: { ...oneTime.toNonprofit, ein: "27-1661997" } };
    expect((await processPartnerWebhook(mem.store, body, NOW)).status).toBe("APPLIED");
  });

  it("won't complete a gift that isn't PENDING", async () => {
    mem = memoryStore([pending({ status: "FAILED" })]);
    const result = await processPartnerWebhook(mem.store, oneTime, NOW);
    expect(result).toMatchObject({ status: "REJECTED", reason: "donation is FAILED, not PENDING" });
  });

  it("won't let a second charge complete an already-completed gift", async () => {
    await processPartnerWebhook(mem.store, oneTime, NOW);
    const result = await processPartnerWebhook(mem.store, { ...oneTime, chargeId: "ch_test_0002" }, NOW);
    expect(result.status).toBe("REJECTED");
    expect(mem.rows[0].externalId).toBe("ch_test_0001");
  });

  it("ignores an implausible net amount", async () => {
    await processPartnerWebhook(mem.store, { ...oneTime, netAmount: "11.00" }, NOW);
    expect(mem.rows[0].netAmountCents).toBeNull();
  });

  it("handles two identical deliveries racing", async () => {
    const [a, b] = await Promise.all([
      processPartnerWebhook(mem.store, oneTime, NOW),
      processPartnerWebhook(mem.store, oneTime, NOW),
    ]);
    expect([a.status, b.status].sort()).toEqual(["APPLIED", "DUPLICATE"]);
    expect(mem.rows[0].status).toBe("COMPLETED");
  });

  it("records a non-JSON body as rejected", async () => {
    const result = await processPartnerWebhook(mem.store, undefined, NOW);
    expect(result).toMatchObject({ kind: "UNKNOWN", status: "REJECTED" });
    expect(mem.rows[0].status).toBe("PENDING");
  });

  it("ignores a negative-amount event without a type", async () => {
    const result = await processPartnerWebhook(mem.store, { ...oneTime, amount: "-10.00" }, NOW);
    expect(result).toMatchObject({ kind: "UNKNOWN", status: "IGNORED" });
    expect(mem.rows[0].status).toBe("PENDING");
  });
});

describe("refund and dispute events (assumed shape)", () => {
  it("marks a completed gift REFUNDED", async () => {
    const mem = memoryStore([completed()]);
    expect(await processPartnerWebhook(mem.store, refund, NOW)).toMatchObject({ kind: "REFUND", status: "APPLIED" });
    expect(mem.rows[0].status).toBe("REFUNDED");
    expect(JSON.stringify(mem.events)).not.toContain("Jane");
  });

  it("marks a completed gift DISPUTED, and a later refund still applies", async () => {
    const mem = memoryStore([completed()]);
    await processPartnerWebhook(mem.store, dispute, NOW);
    expect(mem.rows[0].status).toBe("DISPUTED");
    await processPartnerWebhook(mem.store, refund, NOW);
    expect(mem.rows[0].status).toBe("REFUNDED");
  });

  it("is idempotent", async () => {
    const mem = memoryStore([completed()]);
    await processPartnerWebhook(mem.store, refund, NOW);
    expect((await processPartnerWebhook(mem.store, refund, NOW)).status).toBe("DUPLICATE");
    expect(mem.events).toHaveLength(1);
  });

  it("never touches a gift that isn't completed", async () => {
    // Pending gifts have no chargeId yet, so a refund can't even find them.
    const mem = memoryStore([pending()]);
    expect((await processPartnerWebhook(mem.store, refund, NOW)).status).toBe("REJECTED");
    expect(mem.rows[0].status).toBe("PENDING");
    const failed = memoryStore([completed("FAILED")]);
    expect((await processPartnerWebhook(failed.store, dispute, NOW)).status).toBe("REJECTED");
    expect(failed.rows[0].status).toBe("FAILED");
  });

  it("sends a partial refund to admin review instead of applying it", async () => {
    const mem = memoryStore([completed()]);
    const result = await processPartnerWebhook(mem.store, { ...refund, amount: "4.00" }, NOW);
    expect(result).toMatchObject({ status: "REJECTED", reason: "partial refund: needs admin review" });
    expect(mem.rows[0].status).toBe("COMPLETED");
  });

  it("accepts a negative full refund amount", async () => {
    const mem = memoryStore([completed()]);
    expect((await processPartnerWebhook(mem.store, { ...refund, amount: "-10.00" }, NOW)).status).toBe("APPLIED");
  });

  it("rejects a refund whose partnerDonationId belongs to another gift", async () => {
    const mem = memoryStore([completed()]);
    const result = await processPartnerWebhook(mem.store, { ...refund, partnerDonationId: "tok_other" }, NOW);
    expect(result.status).toBe("REJECTED");
    expect(mem.rows[0].status).toBe("COMPLETED");
  });
});
