import { describe, expect, it } from "vitest";
import { CHECKOUT_PENDING_HOURS, countedDonationsWhere, giftState, giftStateLabel, staleCheckoutCutoff } from "./gift-state";

const now = new Date("2026-11-23T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
const gift = (over: Partial<Parameters<typeof giftState>[0]> = {}) => ({
  status: "PENDING" as const,
  legacy: false,
  checkoutStarted: true,
  createdAt: hoursAgo(1),
  ...over,
});

describe("giftState", () => {
  it("a fresh checkout is waiting for Every.org", () => {
    expect(giftState(gift(), now)).toBe("PENDING");
    expect(giftState(gift({ createdAt: hoursAgo(CHECKOUT_PENDING_HOURS - 0.1) }), now)).toBe("PENDING");
  });

  it("a checkout with no confirmation after 48 hours reads Not completed (display only)", () => {
    expect(giftState(gift({ createdAt: hoursAgo(CHECKOUT_PENDING_HOURS + 0.1) }), now)).toBe("NOT_COMPLETED");
    expect(giftStateLabel("NOT_COMPLETED")).toBe("Not completed");
  });

  it("an old intention that never went to checkout stays recorded, not yet paid", () => {
    expect(giftState(gift({ checkoutStarted: false, createdAt: hoursAgo(500) }), now)).toBe("PENDING");
  });

  it("confirmed, refunded and disputed gifts keep their status at any age", () => {
    for (const status of ["COMPLETED", "REFUNDED", "DISPUTED", "FAILED"] as const) {
      expect(giftState(gift({ status, createdAt: hoursAgo(1000) }), now)).toBe(status);
    }
  });

  it("legacy rows are labelled as such, whatever their status", () => {
    expect(giftState(gift({ legacy: true, status: "COMPLETED" }), now)).toBe("LEGACY");
    expect(giftState(gift({ legacy: true, checkoutStarted: false }), now)).toBe("LEGACY");
    expect(giftStateLabel("LEGACY")).toMatch(/not counted/);
  });
});

describe("countedDonationsWhere", () => {
  it("leaves out legacy rows and checkouts older than 48 hours that were never confirmed", () => {
    expect(countedDonationsWhere("u1", now)).toEqual({
      userId: "u1",
      legacy: false,
      NOT: { status: "PENDING", checkoutToken: { not: null }, createdAt: { lt: staleCheckoutCutoff(now) } },
    });
    expect(staleCheckoutCutoff(now).toISOString()).toBe("2026-11-21T12:00:00.000Z");
  });
});
