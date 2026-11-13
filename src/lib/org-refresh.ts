// Weekly refresh of organization details from Every.org (Milestone 2, D-012).
//
// Vercel Cron calls /api/cron/refresh-organizations once a week. That route
// supplies the database and Every.org access; the rules live here, free of
// both, so they can be unit-tested with fakes.
//
// What a refresh changes:
// - Every.org's fields (EIN, disbursable, description, logo, ...) via
//   `everyOrgFields`, the same mapping the admin "link/refresh" uses. Our
//   display name is never overwritten.
// - If the EIN changed (or disappeared), the admin's earlier review no
//   longer applies, so verification (and its note) is cleared, as when an
//   admin re-links.
// - If Every.org no longer knows the organization (404), it is marked not
//   disbursable. Users stop seeing it (D-012); verification is kept, so it
//   comes back if Every.org lists it again.
// It never deletes, hides or verifies anything.
import { everyOrgFields, linkClearsVerification } from "@/lib/admin-orgs";
import { EveryOrgError, type EveryOrgClient } from "@/lib/everyorg/client";

/**
 * Most organizations refreshed per run. Every.org's details endpoint allows
 * 100 requests a minute per key, and the admin pages share the key. The
 * oldest-synced organizations go first, so larger directories catch up over
 * the following weeks.
 */
export const REFRESH_BATCH_SIZE = 60;

/** Stop starting new requests after this long, to finish inside the function's time limit. */
export const REFRESH_TIME_BUDGET_MS = 45_000;

/** Give up after this many failed Every.org calls in a row (Every.org is probably down). */
export const MAX_CONSECUTIVE_FAILURES = 3;

export type RefreshCandidate = {
  id: string;
  everyOrgId: string;
  ein: string | null;
  verifiedAt: Date | null;
};

export type RefreshUpdate = ReturnType<typeof everyOrgFields> & {
  verifiedAt?: null;
  verifiedById?: null;
  verificationNote?: null;
};

export type RefreshStore = {
  /** Active organizations linked to Every.org, least recently synced first. */
  candidates(limit: number): Promise<RefreshCandidate[]>;
  /** Saves the update; "conflict" when it would break a unique column (EIN, Every.org id or slug). */
  update(id: string, data: RefreshUpdate): Promise<"ok" | "conflict">;
  /** Marks an organization Every.org no longer knows as not disbursable. */
  markNotFound(id: string, now: Date): Promise<void>;
};

export type RefreshSummary = {
  checked: number;
  updated: number;
  /** Updated, and verification cleared because the EIN changed. */
  unverified: number;
  notFound: number;
  /** Skipped: the new data clashed with another organization, or Every.org returned a different record. */
  conflicts: number;
  failed: number;
  /** "rate-limited", "failures" or "time" when the run ended before all candidates. */
  stoppedEarly: "rate-limited" | "failures" | "time" | null;
};

type RefreshOptions = {
  store: RefreshStore;
  client: Pick<EveryOrgClient, "getNonprofit">;
  /** Injected for tests. */
  now?: () => Date;
  limit?: number;
  timeBudgetMs?: number;
};

export async function refreshOrganizations({
  store,
  client,
  now = () => new Date(),
  limit = REFRESH_BATCH_SIZE,
  timeBudgetMs = REFRESH_TIME_BUDGET_MS,
}: RefreshOptions): Promise<RefreshSummary> {
  const summary: RefreshSummary = {
    checked: 0,
    updated: 0,
    unverified: 0,
    notFound: 0,
    conflicts: 0,
    failed: 0,
    stoppedEarly: null,
  };
  const startedAt = now().getTime();
  let consecutiveFailures = 0;

  for (const org of await store.candidates(limit)) {
    if (now().getTime() - startedAt > timeBudgetMs) {
      summary.stoppedEarly = "time";
      break;
    }
    summary.checked++;

    let np;
    try {
      np = await client.getNonprofit(org.everyOrgId);
    } catch (error) {
      if (!(error instanceof EveryOrgError)) throw error;
      summary.failed++;
      if (error.status === 429) {
        summary.stoppedEarly = "rate-limited";
        break;
      }
      if (++consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        summary.stoppedEarly = "failures";
        break;
      }
      continue;
    }
    consecutiveFailures = 0;

    if (np === null) {
      await store.markNotFound(org.id, now());
      summary.notFound++;
      continue;
    }
    // Looked up by Every.org id, so a different id means something is off: leave it for an admin.
    if (np.everyOrgId !== org.everyOrgId) {
      summary.conflicts++;
      continue;
    }

    const clearVerification = org.verifiedAt !== null && linkClearsVerification(org.ein, np.ein);
    const data: RefreshUpdate = {
      ...everyOrgFields(np, now()),
      ...(clearVerification ? { verifiedAt: null, verifiedById: null, verificationNote: null } : {}),
    };
    if ((await store.update(org.id, data)) === "conflict") {
      summary.conflicts++;
      continue;
    }
    summary.updated++;
    if (clearVerification) summary.unverified++;
  }

  return summary;
}
