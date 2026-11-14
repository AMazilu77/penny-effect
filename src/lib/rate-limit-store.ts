// Postgres-backed RateLimitStore (D-018). Server-only.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, retryAfterText, type RateCheck, type RateLimitStore } from "@/lib/rate-limit";

export const prismaRateLimitStore: RateLimitStore = {
  async hit(bucket, keyHash, windowStart, expiresAt) {
    // One atomic statement: insert the window's first hit, or add 1 to it.
    // A "read, then write" in two steps would let parallel requests slip through.
    // $queryRaw with a template sends the values as parameters (no SQL injection).
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimitHit" ("bucket", "keyHash", "windowStart", "count", "expiresAt")
      VALUES (${bucket}, ${keyHash}, ${windowStart}, 1, ${expiresAt})
      ON CONFLICT ("bucket", "keyHash", "windowStart")
      DO UPDATE SET "count" = "RateLimitHit"."count" + 1
      RETURNING "count"`;
    return Number(rows[0]?.count ?? 0);
  },
};

/** Deletes counters whose window has ended (called by the weekly cron). */
export async function pruneRateLimits(now = new Date()): Promise<number> {
  const { count } = await prisma.rateLimitHit.deleteMany({ where: { expiresAt: { lt: now } } });
  return count;
}

/**
 * For route handlers: null when allowed, or a ready 429 response with a
 * Retry-After header and a plain-language `{ error }`.
 */
export async function rateLimitResponse(checks: RateCheck[], what: string): Promise<NextResponse | null> {
  const result = await rateLimit(prismaRateLimitStore, checks);
  if (result.ok) return null;
  return NextResponse.json(
    { error: `Too many ${what}. Please try again ${retryAfterText(result.retryAfterSeconds)}.` },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}
