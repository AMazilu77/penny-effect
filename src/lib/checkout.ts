// Milestone 3 groundwork: Every.org Donate Link checkout (M3-PLAN, D-014).
//
// What exists so far: a donation is recorded as PENDING, gets a random
// checkoutToken, and the donor is sent to Every.org's Donate Link to pay.
// What does NOT exist yet: anything that marks a donation COMPLETED. That
// only ever happens from Every.org's webhook (a later, separate PR), never
// from the success redirect.
//
// Off unless DONATIONS_CHECKOUT_ENABLED=true, and always off on Vercel
// production until the go-live PR removes that guard on purpose.
import { randomBytes } from "node:crypto";

/** Every.org hosts we may send donors to: staging for testing, www for real gifts. */
export const DONATE_HOSTS = ["staging.every.org", "www.every.org"] as const;
export type DonateHost = (typeof DONATE_HOSTS)[number];

/** Payment methods offered in Milestone 3 (no crypto, stock or DAF yet: M3-PLAN §6). */
export const CHECKOUT_METHODS = ["card", "bank", "paypal", "venmo", "pay"] as const;

type Env = Record<string, string | undefined>;

/** Whether checkout is on. Never on Vercel production (until the go-live PR). */
export function checkoutEnabled(env: Env = process.env): boolean {
  if (env.VERCEL_ENV === "production") return false;
  return env.DONATIONS_CHECKOUT_ENABLED === "true";
}

/** Which Every.org host to use; staging unless explicitly set to a known host. */
export function donateHost(env: Env = process.env): DonateHost {
  const host = env.EVERYORG_DONATE_HOST;
  return (DONATE_HOSTS as readonly string[]).includes(host ?? "") ? (host as DonateHost) : "staging.every.org";
}

/** A random 128-bit token, URL-safe (sent to Every.org as partner_donation_id). */
export function newCheckoutToken(): string {
  return randomBytes(16).toString("base64url");
}

/** 550 → "5.50", 500 → "5" (Every.org's amount is in dollars). */
export function centsToDollars(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error("amount must be a whole number of cents");
  const dollars = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? String(dollars) : `${dollars}.${String(rest).padStart(2, "0")}`;
}

export type DonateLinkInput = {
  host: DonateHost;
  /** Every.org slug, or the 9-digit EIN when there is no slug. */
  nonprofit: string;
  amountCents: number;
  checkoutToken: string;
  /** Absolute URLs on our site. */
  successUrl: string;
  exitUrl: string;
  /** Every.org's webhook token (Every.org dashboard); omitted until the webhook exists. */
  webhookToken?: string;
};

/** Builds an Every.org Donate Link (docs.every.org/docs/donate-link). Pure. */
export function buildDonateLink(input: DonateLinkInput): string {
  if (!/^[a-z0-9-]+$/i.test(input.nonprofit)) throw new Error("invalid nonprofit identifier");
  const url = new URL(`https://${input.host}/${encodeURIComponent(input.nonprofit)}`);
  const params: Record<string, string> = {
    amount: centsToDollars(input.amountCents),
    frequency: "ONCE",
    method: CHECKOUT_METHODS.join(","),
    partner_donation_id: input.checkoutToken,
    success_url: input.successUrl,
    exit_url: input.exitUrl,
  };
  if (input.webhookToken) params.webhook_token = input.webhookToken;
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.hash = "donate";
  return url.toString();
}

/** Our site's base URL for success/exit links (NEXTAUTH_URL), without a trailing slash. */
export function siteUrl(env: Env = process.env): string {
  const base = env.NEXTAUTH_URL ?? "http://localhost:3000";
  return base.replace(/\/+$/, "");
}
