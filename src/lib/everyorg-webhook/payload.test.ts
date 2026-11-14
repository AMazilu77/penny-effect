import { describe, expect, it } from "vitest";
import documented from "./fixtures/donation-documented-example.json";
import oneTime from "./fixtures/donation-one-time.json";
import refund from "./fixtures/refund-assumed.json";
import dispute from "./fixtures/dispute-assumed.json";
import {
  classifyPartnerEvent,
  donationEventSchema,
  parseAbsoluteAmountCents,
  parseAmountCents,
  storedPayload,
} from "./payload";

describe("classifyPartnerEvent", () => {
  it("treats the documented payload as a donation", () => {
    expect(classifyPartnerEvent(documented)).toBe("DONATION");
    expect(classifyPartnerEvent(oneTime)).toBe("DONATION");
  });

  it("recognises refunds and disputes only from an explicit type field", () => {
    expect(classifyPartnerEvent(refund)).toBe("REFUND");
    expect(classifyPartnerEvent(dispute)).toBe("DISPUTE");
    expect(classifyPartnerEvent({ ...oneTime, type: "CHARGEBACK" })).toBe("DISPUTE");
    expect(classifyPartnerEvent({ ...oneTime, status: "refunded" })).toBe("REFUND");
  });

  it("keeps a negative amount without a type for review instead of guessing", () => {
    expect(classifyPartnerEvent({ ...oneTime, amount: "-10.00" })).toBe("UNKNOWN");
  });

  it("calls non-objects unknown", () => {
    for (const body of [null, 1, "x", [], undefined]) expect(classifyPartnerEvent(body)).toBe("UNKNOWN");
  });
});

describe("amount parsing", () => {
  it("parses Every.org's dollar strings to cents exactly", () => {
    expect(parseAmountCents("10.00")).toBe(1000);
    expect(parseAmountCents("970.07")).toBe(97007);
    expect(parseAmountCents("1.13")).toBe(113);
  });

  it("rejects anything that isn't a plain amount", () => {
    for (const bad of ["", "-10.00", "$10", "1,000.00", "1e3", "10.001", "abc"]) {
      expect(parseAmountCents(bad)).toBeNull();
    }
  });

  it("accepts a minus sign only for refund amounts", () => {
    expect(parseAbsoluteAmountCents("-10.00")).toBe(1000);
    expect(parseAbsoluteAmountCents("10.00")).toBe(1000);
    expect(parseAbsoluteAmountCents("--10")).toBeNull();
  });
});

describe("donationEventSchema", () => {
  it("accepts the documented example", () => {
    expect(donationEventSchema.safeParse(documented).success).toBe(true);
  });

  it("requires the fields we match on", () => {
    for (const field of ["chargeId", "toNonprofit", "amount", "currency", "frequency"] as const) {
      const body: Record<string, unknown> = { ...oneTime };
      delete body[field];
      expect(donationEventSchema.safeParse(body).success).toBe(false);
    }
  });
});

describe("storedPayload", () => {
  it("drops every piece of donor data", () => {
    const stored = storedPayload(documented);
    const text = JSON.stringify(stored);
    for (const pii of ["Jane", "Doe", "jane@", "123 Main", "San Francisco", "94103", "animals", "fantastic"]) {
      expect(text).not.toContain(pii);
    }
    expect(stored).toEqual({
      chargeId: "somerandomuuid",
      partnerDonationId: "somerandomuuid",
      amount: "1000.00",
      netAmount: "970.07",
      currency: "USD",
      frequency: "Monthly",
      donationDate: "2022-02-03T05:00:16.175Z",
      toNonprofit: { slug: "givedirectly", ein: "271661997", name: "Give Directly" },
    });
  });

  it("doesn't store unknown new fields", () => {
    expect(storedPayload({ chargeId: "x", donorPhone: "555-0100" })).toEqual({ chargeId: "x" });
  });
});
