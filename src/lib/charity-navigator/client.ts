// Server-side client for Charity Navigator's GraphQL Data API (D-016).
// Docs: https://developer.charitynavigator.org/ (read 2026-11-14).
//
// Off unless CHARITY_NAVIGATOR_API_KEY is set: the API needs an account and a
// subscription (paid plans start with a 30-day free trial). The query follows
// the portal's published example (publicSearchFaceted → ein,
// encompass_score, encompass_star_rating); responses are validated with zod
// and only an exact EIN match is used. Tests use saved fixtures.
import { z } from "zod";

const ENDPOINT = "https://api.charitynavigator.org/graphql";
const TIMEOUT_MS = 10_000;

export class CharityNavigatorError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "CharityNavigatorError";
  }
}

export type CnApiRating = { ein: string; score: number; stars: number | null };

// CN may send numbers as numbers or strings; accept both, keep only sane values.
const num = z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/).transform(Number)]);
const responseSchema = z.object({
  data: z
    .object({
      publicSearchFaceted: z
        .object({
          results: z
            .array(
              z.object({
                ein: z.string(),
                encompass_score: num.nullish(),
                encompass_star_rating: num.nullish(),
              }),
            )
            .nullish(),
        })
        .nullish(),
    })
    .nullish(),
  errors: z.array(z.object({ message: z.string() })).nullish(),
});

/** Picks the result for exactly this EIN, or null. Pure, so it's unit-tested. */
export function parseRatingResponse(body: unknown, ein: string): CnApiRating | null {
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) throw new CharityNavigatorError("Charity Navigator sent an unexpected response");
  if (parsed.data.errors?.length) throw new CharityNavigatorError("Charity Navigator returned an error");
  const results = parsed.data.data?.publicSearchFaceted?.results ?? [];
  const match = results.find((r) => r.ein.replace("-", "") === ein);
  if (!match || match.encompass_score == null) return null;
  const score = Math.round(match.encompass_score);
  if (score < 0 || score > 100) return null;
  const stars = match.encompass_star_rating == null ? null : Math.round(match.encompass_star_rating);
  return { ein, score, stars: stars !== null && stars >= 0 && stars <= 4 ? stars : null };
}

const QUERY = `query Rating($term: String!) {
  publicSearchFaceted(term: $term, result_size: 5) {
    results { ein encompass_score encompass_star_rating }
  }
}`;

export function charityNavigatorEnabled(): boolean {
  return Boolean(process.env.CHARITY_NAVIGATOR_API_KEY);
}

export function createCharityNavigatorClient(options: { apiKey?: string; fetch?: typeof fetch } = {}) {
  const fetchImpl = options.fetch ?? fetch;
  return {
    /** The rating for a 9-digit EIN, or null if CN has none. */
    async getRating(ein: string): Promise<CnApiRating | null> {
      const key = options.apiKey ?? process.env.CHARITY_NAVIGATOR_API_KEY;
      if (!key) throw new CharityNavigatorError("CHARITY_NAVIGATOR_API_KEY is not set");
      if (!/^\d{9}$/.test(ein)) return null;
      let res: Response;
      try {
        res = await fetchImpl(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ query: QUERY, variables: { term: ein } }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
          cache: "no-store",
        });
      } catch {
        // Don't pass on the original error: keep the key out of logs.
        throw new CharityNavigatorError("Could not reach Charity Navigator");
      }
      if (!res.ok) throw new CharityNavigatorError(`Charity Navigator responded ${res.status}`, res.status);
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        throw new CharityNavigatorError("Charity Navigator sent invalid JSON", res.status);
      }
      return parseRatingResponse(body, ein);
    },
  };
}

export type CharityNavigatorClient = ReturnType<typeof createCharityNavigatorClient>;
