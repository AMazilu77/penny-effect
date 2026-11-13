// Checks that a request to an /api/cron route really comes from Vercel Cron.
//
// When the CRON_SECRET environment variable is set in Vercel, Vercel Cron
// sends `Authorization: Bearer <CRON_SECRET>` with every scheduled call.
// Without the secret, these routes refuse everything (fail closed), so a
// missing setting can't turn them into public endpoints.
import { createHash, timingSafeEqual } from "node:crypto";

/** Shorter secrets are treated as missing. `openssl rand -hex 32` gives 64 characters. */
export const MIN_CRON_SECRET_LENGTH = 32;

export function isAuthorizedCronRequest(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < MIN_CRON_SECRET_LENGTH || !authorization) return false;
  // Compare hashes in constant time, so the response time doesn't leak how
  // much of the secret a guess got right (and lengths can differ safely).
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`));
}
