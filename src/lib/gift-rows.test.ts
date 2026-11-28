import { describe, expect, it } from "vitest";
import { toGiftRow, type GiftRowSource } from "./gift-rows";

const now = new Date("2026-11-23T12:00:00Z");
const row = (over: Partial<GiftRowSource> = {}): GiftRowSource => ({
  id: "d1",
  amountCents: 2500,
  requestedAmountCents: 2500,
  netAmountCents: null,
  currency: "USD",
  status: "PENDING",
  legacy: false,
  checkoutToken: "tok_secret",
  createdAt: new Date("2026-11-23T11:00:00Z"),
  completedAt: null,
  organization: { name: "GiveDirectly" },
  ...over,
});

describe("toGiftRow", () => {
  it("never passes the checkout token on", () => {
    expect(JSON.stringify(toGiftRow(row(), now))).not.toContain("tok_secret");
  });

  it("a confirmed gift shows Every.org's amount, net amount, and what was chosen here when different", () => {
    const g = toGiftRow(
      row({ status: "COMPLETED", amountCents: 3000, requestedAmountCents: 2500, netAmountCents: 2904, completedAt: now }),
      now,
    );
    expect(g).toMatchObject({ state: "COMPLETED", amountCents: 3000, requestedAmountCents: 2500, netAmountCents: 2904 });
    expect(toGiftRow(row({ status: "COMPLETED", completedAt: now }), now).requestedAmountCents).toBeNull();
  });

  it("an unconfirmed gift shows no net amount, and an old checkout reads Not completed", () => {
    expect(toGiftRow(row({ netAmountCents: 999 }), now).netAmountCents).toBeNull();
    expect(toGiftRow(row({ createdAt: new Date("2026-11-20T00:00:00Z") }), now).state).toBe("NOT_COMPLETED");
  });

  it("legacy rows are labelled legacy", () => {
    expect(toGiftRow(row({ legacy: true, checkoutToken: null }), now).state).toBe("LEGACY");
  });
});
