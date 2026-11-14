// Weekly refresh of Charity Navigator ratings (D-016), run by the same Vercel
// Cron as the Every.org refresh, only when CHARITY_NAVIGATOR_API_KEY is set.
// Rules, kept free of the database and network so they're unit-tested:
// - organizations donors can see, with an EIN, least recently checked first;
// - a rating from the API replaces whatever was stored (API is authoritative);
// - if CN has no rating, nothing is changed or deleted (a stale rating stays
//   visible, labelled stale, rather than disappearing);
// - stop on a 429, after 3 failures in a row, or when the time budget is used.
import { CharityNavigatorError, type CharityNavigatorClient, type CnApiRating } from "./client";
import { cnProfileUrlFor } from "./rating";

export const CN_BATCH_SIZE = 100; // well under CN's 1,000 requests/minute
export const CN_MAX_CONSECUTIVE_FAILURES = 3;

export type CnCandidate = { id: string; ein: string };
export type CnStore = {
  candidates(limit: number): Promise<CnCandidate[]>;
  save(id: string, data: { cnScore: number; cnStars: number | null; cnProfileUrl: string; cnCheckedAt: Date; cnSource: "API" }): Promise<void>;
};
export type CnRefreshSummary = {
  checked: number;
  updated: number;
  noRating: number;
  failed: number;
  stoppedEarly: "rate-limited" | "failures" | "time" | null;
};

export async function refreshCharityNavigator({
  store,
  client,
  now = () => new Date(),
  limit = CN_BATCH_SIZE,
  timeBudgetMs = 20_000,
}: {
  store: CnStore;
  client: Pick<CharityNavigatorClient, "getRating">;
  now?: () => Date;
  limit?: number;
  timeBudgetMs?: number;
}): Promise<CnRefreshSummary> {
  const summary: CnRefreshSummary = { checked: 0, updated: 0, noRating: 0, failed: 0, stoppedEarly: null };
  const start = now().getTime();
  let failuresInARow = 0;

  for (const org of await store.candidates(limit)) {
    if (now().getTime() - start > timeBudgetMs) {
      summary.stoppedEarly = "time";
      break;
    }
    summary.checked++;
    let rating: CnApiRating | null;
    try {
      rating = await client.getRating(org.ein);
    } catch (error) {
      if (!(error instanceof CharityNavigatorError)) throw error;
      summary.failed++;
      if (error.status === 429) {
        summary.stoppedEarly = "rate-limited";
        break;
      }
      if (++failuresInARow >= CN_MAX_CONSECUTIVE_FAILURES) {
        summary.stoppedEarly = "failures";
        break;
      }
      continue;
    }
    failuresInARow = 0;
    if (!rating) {
      summary.noRating++;
      continue;
    }
    await store.save(org.id, {
      cnScore: rating.score,
      cnStars: rating.stars,
      cnProfileUrl: cnProfileUrlFor(org.ein),
      cnCheckedAt: now(),
      cnSource: "API",
    });
    summary.updated++;
  }
  return summary;
}
