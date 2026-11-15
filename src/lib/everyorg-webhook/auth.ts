// Checks that a webhook request really comes from Every.org (M3-PLAN §2,
// D-014 update).
//
// Every.org sends `Authorization: Bearer <token>` with each partner webhook.
// The token is ours to keep secret: it lives only in the server-only env var
// EVERYORG_WEBHOOK_SECRET (never NEXT_PUBLIC_, never in a page or a link).
//
// Not to be confused with EVERYORG_WEBHOOK_TOKEN (`webhook_token`): that one
// goes into every Donate Link, so any donor can read it. It routes gifts to
// our webhook and proves nothing. If the two are ever set to the same value,
// we refuse everything rather than accept a public value as a password.
import { createHash, timingSafeEqual } from "node:crypto";

/** Shorter secrets are treated as missing (fail closed). */
export const MIN_WEBHOOK_SECRET_LENGTH = 32;

type Env = Record<string, string | undefined>;

/** The bearer tokens we currently accept: the main one, plus NEXT during a rotation. */
export function acceptedWebhookSecrets(env: Env = process.env): string[] {
  const publicToken = env.EVERYORG_WEBHOOK_TOKEN?.trim();
  return [env.EVERYORG_WEBHOOK_SECRET, env.EVERYORG_WEBHOOK_SECRET_NEXT]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length >= MIN_WEBHOOK_SECRET_LENGTH)
    .filter((value) => !publicToken || value !== publicToken);
}

/** Whether a webhook can be accepted at all (used to fail closed and for an admin hint). */
export function webhookConfigured(env: Env = process.env): boolean {
  return acceptedWebhookSecrets(env).length > 0;
}

const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

/**
 * True only for exactly `Bearer <one of the accepted secrets>`.
 * Compares sha256 digests in constant time, so neither the response time nor
 * a length difference reveals how close a guess was.
 */
export function isAuthorizedWebhookRequest(authorization: string | null, env: Env = process.env): boolean {
  if (!authorization) return false;
  const given = digest(authorization);
  let ok = false;
  // Check every accepted secret (no early exit) so timing doesn't depend on which one matched.
  for (const secret of acceptedWebhookSecrets(env)) {
    if (timingSafeEqual(given, digest(`Bearer ${secret}`))) ok = true;
  }
  return ok;
}
