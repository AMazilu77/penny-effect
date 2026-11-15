import { describe, expect, it } from "vitest";
import { donationStatusLabel, summarizeDonations, type DonationStatusGroup } from "@/lib/dashboard";

const group = (status: DonationStatusGroup["status"], cents: number | null, count: number): DonationStatusGroup => ({
  status,
  _sum: { amountCents: cents },
  _count: { _all: count },
});

describe("summarizeDonations", () => {
  it("is all zeros for a user with no donations", () => {
    expect(summarizeDonations([])).toEqual({ givenCents: 0, givenCount: 0, pendingCents: 0, pendingCount: 0 });
  });

  it("never counts pending donations as given", () => {
    const summary = summarizeDonations([group("PENDING", 1050, 2)]);
    expect(summary.givenCents).toBe(0);
    expect(summary.pendingCents).toBe(1050);
    expect(summary.pendingCount).toBe(2);
  });

  it("counts completed donations as given", () => {
    expect(summarizeDonations([group("COMPLETED", 500, 1), group("PENDING", 250, 1)])).toEqual({
      givenCents: 500,
      givenCount: 1,
      pendingCents: 250,
      pendingCount: 1,
    });
  });

  it("ignores failed donations", () => {
    expect(summarizeDonations([group("FAILED", 9999, 3)])).toEqual({
      givenCents: 0,
      givenCount: 0,
      pendingCents: 0,
      pendingCount: 0,
    });
  });

  it("treats a missing sum as zero", () => {
    expect(summarizeDonations([group("PENDING", null, 1)]).pendingCents).toBe(0);
  });
});

describe("donationStatusLabel", () => {
  it("labels pending donations honestly", () => {
    expect(donationStatusLabel("PENDING")).toBe("Recorded, not yet paid");
  });
});

describe("refunds and disputes (Milestone 3 webhook)", () => {
  it("never counts REFUNDED or DISPUTED gifts as given or pending", () => {
    const summary = summarizeDonations([
      { status: "COMPLETED", _sum: { amountCents: 1000 }, _count: { _all: 1 } },
      { status: "REFUNDED", _sum: { amountCents: 2000 }, _count: { _all: 1 } },
      { status: "DISPUTED", _sum: { amountCents: 3000 }, _count: { _all: 1 } },
    ]);
    expect(summary).toEqual({ givenCents: 1000, givenCount: 1, pendingCents: 0, pendingCount: 0 });
  });

  it("labels them plainly", () => {
    expect(donationStatusLabel("REFUNDED")).toBe("Refunded");
    expect(donationStatusLabel("DISPUTED")).toBe("Payment disputed");
  });
});
