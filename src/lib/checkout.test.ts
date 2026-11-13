import { describe, expect, it } from "vitest";
import { buildDonateLink, centsToDollars, checkoutEnabled, donateHost, newCheckoutToken } from "@/lib/checkout";

const base = {
  host: "staging.every.org" as const,
  nonprofit: "givedirectly",
  amountCents: 550,
  checkoutToken: "tok_123",
  successUrl: "https://penny.example/donations/d1/thanks",
  exitUrl: "https://penny.example/dashboard?checkout=cancelled",
};

describe("checkoutEnabled (the feature flag)", () => {
  it("is off by default and on only with DONATIONS_CHECKOUT_ENABLED=true", () => {
    expect(checkoutEnabled({})).toBe(false);
    expect(checkoutEnabled({ DONATIONS_CHECKOUT_ENABLED: "1" })).toBe(false);
    expect(checkoutEnabled({ DONATIONS_CHECKOUT_ENABLED: "true" })).toBe(true);
    expect(checkoutEnabled({ DONATIONS_CHECKOUT_ENABLED: "true", VERCEL_ENV: "preview" })).toBe(true);
  });

  it("is always off on Vercel production, whatever the flag says", () => {
    expect(checkoutEnabled({ DONATIONS_CHECKOUT_ENABLED: "true", VERCEL_ENV: "production" })).toBe(false);
  });
});

describe("donateHost", () => {
  it("defaults to Every.org staging and only accepts known hosts", () => {
    expect(donateHost({})).toBe("staging.every.org");
    expect(donateHost({ EVERYORG_DONATE_HOST: "www.every.org" })).toBe("www.every.org");
    expect(donateHost({ EVERYORG_DONATE_HOST: "evil.example" })).toBe("staging.every.org");
  });
});

describe("centsToDollars", () => {
  it("writes whole dollars without decimals and keeps two digits for cents", () => {
    expect(centsToDollars(500)).toBe("5");
    expect(centsToDollars(550)).toBe("5.50");
    expect(centsToDollars(505)).toBe("5.05");
    expect(centsToDollars(1_000_000)).toBe("10000");
  });
  it("refuses fractions of a cent and negatives", () => {
    expect(() => centsToDollars(5.5)).toThrow();
    expect(() => centsToDollars(-1)).toThrow();
  });
});

describe("buildDonateLink", () => {
  it("builds Every.org's documented Donate Link with our token and return links", () => {
    const url = new URL(buildDonateLink(base));
    expect(url.origin + url.pathname).toBe("https://staging.every.org/givedirectly");
    expect(url.hash).toBe("#donate");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      amount: "5.50",
      frequency: "ONCE",
      method: "card,bank,paypal,venmo,pay",
      partner_donation_id: "tok_123",
      success_url: "https://penny.example/donations/d1/thanks",
      exit_url: "https://penny.example/dashboard?checkout=cancelled",
    });
  });

  it("adds the webhook token only when there is one", () => {
    expect(new URL(buildDonateLink({ ...base, webhookToken: "wh_1" })).searchParams.get("webhook_token")).toBe("wh_1");
  });

  it("refuses identifiers that could change the path", () => {
    for (const nonprofit of ["../admin", "a/b", "x?y", ""]) expect(() => buildDonateLink({ ...base, nonprofit }), nonprofit).toThrow();
    expect(new URL(buildDonateLink({ ...base, nonprofit: "271661997" })).pathname).toBe("/271661997");
  });
});

describe("newCheckoutToken", () => {
  it("is random, URL-safe and 128 bits", () => {
    const a = newCheckoutToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(newCheckoutToken()).not.toBe(a);
  });
});
