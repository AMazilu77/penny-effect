// Rate limiting with fixed-window counters in Postgres (D-018).
//
// How it works: each rule ("at most 5 checkouts per user per hour") counts
// requests per identifier (an IP, an email or a user id) in fixed time
// windows (e.g. 14:00–15:00). Each request adds 1 to its window's row and is
// refused once the count passes the limit. Refused attempts count too, so
// hammering doesn't reset anything.
//
// Identifiers are stored only as an HMAC (keyed hash) with a server secret:
// the table never holds a readable IP address or email, and the hashes can't
// be reversed by trying every IP address.
//
// Pure logic here, tested with an in-memory store; ./rate-limit-store.ts
// is the Postgres version.
import { createHmac } from "node:crypto";

export type RateRule = {
  /** Stored as the bucket, e.g. "checkout:user". */
  name: string;
  limit: number;
  windowSeconds: number;
};

const HOUR = 3600;
const DAY = 24 * HOUR;

// Card testing (criminals checking stolen cards with many small payments) is
// the risk Every.org flagged, so checkout start is strict on two axes: per
// signed-in user and per IP, each with an hourly and a daily cap. Normal
// donors start one or two checkouts at a time.
export const RULES = {
  registerIp: { name: "register:ip", limit: 5, windowSeconds: HOUR },
  signInIp: { name: "signin:ip", limit: 20, windowSeconds: 15 * 60 },
  signInEmail: { name: "signin:email", limit: 8, windowSeconds: 15 * 60 },
  donateUser: { name: "donate:user", limit: 30, windowSeconds: HOUR },
  checkoutUserHour: { name: "checkout:user", limit: 5, windowSeconds: HOUR },
  checkoutUserDay: { name: "checkout:user:day", limit: 10, windowSeconds: DAY },
  checkoutIpHour: { name: "checkout:ip", limit: 10, windowSeconds: HOUR },
  checkoutIpDay: { name: "checkout:ip:day", limit: 25, windowSeconds: DAY },
  fetchImageUser: { name: "fetch-image:user", limit: 30, windowSeconds: 10 * 60 },
} as const satisfies Record<string, RateRule>;

export interface RateLimitStore {
  /** Adds 1 to the (bucket, keyHash, windowStart) counter atomically and returns the new count. */
  hit(bucket: string, keyHash: string, windowStart: Date, expiresAt: Date): Promise<number>;
}

export type RateCheck = { rule: RateRule; identifier: string };

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number; rule: string };

/** Start of the fixed window that `now` falls in. */
export function windowStart(now: Date, windowSeconds: number): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

/** Keyed hash of an identifier: stable per rule, unreadable, not reversible without the secret. */
export function hashIdentifier(ruleName: string, identifier: string, secret: string): string {
  return createHmac("sha256", secret).update(`${ruleName}\n${identifier.trim().toLowerCase()}`).digest("base64url");
}

function hashSecret(env: Record<string, string | undefined> = process.env): string {
  // NEXTAUTH_SECRET is always set where the app runs; the fallback only keeps
  // tests and CI builds working (they never store anything).
  return env.NEXTAUTH_SECRET || "penny-effect-rate-limit-dev";
}

/**
 * Counts this request against every check and says whether it's allowed.
 * All checks are counted (no early exit), so a refused request still uses up
 * its quota on each axis.
 */
export async function rateLimit(store: RateLimitStore, checks: RateCheck[], now = new Date()): Promise<RateLimitResult> {
  const secret = hashSecret();
  let worst: { retryAfterSeconds: number; rule: string } | null = null;
  for (const { rule, identifier } of checks) {
    const start = windowStart(now, rule.windowSeconds);
    const end = new Date(start.getTime() + rule.windowSeconds * 1000);
    const count = await store.hit(rule.name, hashIdentifier(rule.name, identifier, secret), start, end);
    if (count > rule.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 1000));
      if (!worst || retryAfterSeconds > worst.retryAfterSeconds) worst = { retryAfterSeconds, rule: rule.name };
    }
  }
  return worst ? { ok: false, ...worst } : { ok: true };
}

/**
 * The client's IP. On Vercel, `x-real-ip` and the first `x-forwarded-for`
 * entry are set by Vercel's edge from the real connection (a client can't
 * override them). Elsewhere (local dev) they may be missing: "unknown".
 */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/** "Try again in 3 minutes." / "in 2 hours." Plain words for the 429 message. */
export function retryAfterText(seconds: number): string {
  if (seconds < 90) return "in a minute";
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 90) return `in ${minutes} minutes`;
  return `in ${Math.ceil(minutes / 60)} hours`;
}
