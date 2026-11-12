// Server-side client for the Every.org Nonprofits API (D-012).
// Docs: https://docs.every.org/docs/endpoints/nonprofit-details
//
// Only admin pages and the weekly refresh call this, never the browser, so
// regular users never wait on (or depend on) Every.org. Responses are
// validated and normalized in ./parse.ts.
//
// The public key is safe to expose in principle, but we still keep it out of
// client bundles (no NEXT_PUBLIC_ prefix) and out of every error message.
import { parseNonprofitResponse, parseSearchResponse } from "./parse";
import type { EveryOrgNonprofit, EveryOrgSearchResult } from "./parse";

export type { EveryOrgNonprofit, EveryOrgSearchResult } from "./parse";

const BASE_URL = "https://partners.every.org/v0.2";
const TIMEOUT_MS = 10_000;
/** Every.org caps search at 50 results per request. */
export const MAX_SEARCH_RESULTS = 50;

/** A failed Every.org call. The message never contains the API key. */
export class EveryOrgError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "EveryOrgError";
  }
}

type ClientOptions = {
  /** Defaults to process.env.EVERY_ORG_PUBLIC_KEY. */
  apiKey?: string;
  /** Injected in tests so they never touch the network. */
  fetch?: typeof fetch;
};

export function createEveryOrgClient(options: ClientOptions = {}) {
  const fetchImpl = options.fetch ?? fetch;

  function apiKey(): string {
    const key = options.apiKey ?? process.env.EVERY_ORG_PUBLIC_KEY;
    if (!key) throw new EveryOrgError("EVERY_ORG_PUBLIC_KEY is not set");
    return key;
  }

  /** GETs `path` and returns the parsed JSON, or null for a 404. */
  async function get(path: string, params: Record<string, string> = {}): Promise<unknown | null> {
    const url = new URL(BASE_URL + path);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    url.searchParams.set("apiKey", apiKey());

    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      // Don't pass on the original error: it can contain the URL (and key).
      throw new EveryOrgError("Could not reach Every.org");
    }

    if (response.status === 404) return null;
    if (!response.ok) throw new EveryOrgError(`Every.org responded ${response.status}`, response.status);
    try {
      return await response.json();
    } catch {
      throw new EveryOrgError("Every.org sent invalid JSON", response.status);
    }
  }

  function parse<T>(parser: (body: unknown) => T, body: unknown): T {
    try {
      return parser(body);
    } catch {
      throw new EveryOrgError("Every.org sent an unexpected response");
    }
  }

  return {
    /**
     * One nonprofit by Every.org slug, 9-digit EIN or Every.org id.
     * Returns null when Every.org doesn't know it.
     */
    async getNonprofit(idOrSlugOrEin: string): Promise<EveryOrgNonprofit | null> {
      const id = idOrSlugOrEin.trim();
      if (!id) return null;
      const body = await get(`/nonprofit/${encodeURIComponent(id)}`);
      return body === null ? null : parse(parseNonprofitResponse, body);
    },

    /**
     * Searches Every.org by name. `causes` narrows results to nonprofits in
     * any of those Every.org causes.
     */
    async searchNonprofits(
      term: string,
      options: { take?: number; causes?: string[] } = {},
    ): Promise<EveryOrgSearchResult[]> {
      const query = term.trim();
      if (!query) return [];
      const take = Math.min(Math.max(Math.trunc(options.take ?? 20), 1), MAX_SEARCH_RESULTS);
      const params: Record<string, string> = { take: String(take) };
      if (options.causes?.length) params.causes = options.causes.join(",");
      const body = await get(`/search/${encodeURIComponent(query)}`, params);
      return body === null ? [] : parse(parseSearchResponse, body);
    },
  };
}

export type EveryOrgClient = ReturnType<typeof createEveryOrgClient>;
