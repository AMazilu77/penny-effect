import { describe, expect, it } from "vitest";
import { checkoutPlan, donationRequestSchema } from "@/lib/donations";

const KEY = "0b5c2a5e-3f4d-4c1a-9e8b-7d6f5a4b3c2d";
const valid = { organizationId: "org_1", amount: "5.50", idempotencyKey: KEY };

describe("donationRequestSchema", () => {
  it("converts the dollar amount to integer cents", () => {
    expect(donationRequestSchema.parse(valid)).toEqual({ organizationId: "org_1", amountCents: 550, idempotencyKey: KEY });
    expect(donationRequestSchema.parse(valid)).not.toHaveProperty("amount");
  });

  it("accepts a JSON number amount", () => {
    expect(donationRequestSchema.parse({ ...valid, amount: 12 }).amountCents).toBe(1200);
  });

  it("enforces the $1 minimum and $10,000 maximum", () => {
    expect(donationRequestSchema.safeParse({ ...valid, amount: "0.99" }).success).toBe(false);
    expect(donationRequestSchema.parse({ ...valid, amount: "1" }).amountCents).toBe(100);
    expect(donationRequestSchema.parse({ ...valid, amount: "10000" }).amountCents).toBe(1_000_000);
    expect(donationRequestSchema.safeParse({ ...valid, amount: "10000.01" }).success).toBe(false);
  });

  it("rejects malformed amounts with a readable message", () => {
    const result = donationRequestSchema.safeParse({ ...valid, amount: "5.999" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter an amount like 5 or 5.50.");
  });

  it("requires a UUID idempotency key, asking stale pages to reload", () => {
    const missing = donationRequestSchema.safeParse({ organizationId: "org_1", amount: "5.50" });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]?.message).toBe("Please reload the page and try again.");
    expect(donationRequestSchema.safeParse({ ...valid, idempotencyKey: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(donationRequestSchema.safeParse({ amount: "5" }).success).toBe(false);
    expect(donationRequestSchema.safeParse({ organizationId: "org_1" }).success).toBe(false);
  });

  it("trims the message and drops it when empty", () => {
    expect(donationRequestSchema.parse({ ...valid, message: "  thanks!  " }).message).toBe("thanks!");
    expect(donationRequestSchema.parse({ ...valid, message: "   " }).message).toBeUndefined();
  });

  it("rejects messages over 500 characters", () => {
    expect(donationRequestSchema.safeParse({ ...valid, message: "x".repeat(501) }).success).toBe(false);
  });
});

describe("checkout requests and the $10 minimum (D-017)", () => {
  it("accepts checkout: true and nothing else for the flag", () => {
    expect(donationRequestSchema.parse({ ...valid, checkout: true }).checkout).toBe(true);
    expect(donationRequestSchema.safeParse({ ...valid, checkout: "yes" }).success).toBe(false);
    expect(donationRequestSchema.safeParse({ ...valid, checkout: false }).success).toBe(false);
  });

  it("the Give page: $10.00 and up goes to Every.org; less is refused with Every.org's minimum", () => {
    expect(checkoutPlan({ amountCents: 1000, requested: true, enabled: true })).toEqual({ kind: "checkout" });
    expect(checkoutPlan({ amountCents: 999, requested: true, enabled: true })).toEqual({
      kind: "error",
      status: 400,
      error: "Every.org's minimum gift is $10.00.",
    });
  });

  it("the Give page while checkout is off: refused, nothing recorded", () => {
    expect(checkoutPlan({ amountCents: 5000, requested: true, enabled: false })).toMatchObject({ kind: "error", status: 409 });
  });

  it("the dashboard form: a link only for $10+ with checkout on; otherwise an intention", () => {
    expect(checkoutPlan({ amountCents: 1000, requested: false, enabled: true })).toEqual({ kind: "checkout" });
    expect(checkoutPlan({ amountCents: 500, requested: false, enabled: true })).toEqual({ kind: "record" });
    expect(checkoutPlan({ amountCents: 5000, requested: false, enabled: false })).toEqual({ kind: "record" });
  });
});
