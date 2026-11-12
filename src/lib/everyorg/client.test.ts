import { describe, expect, it, vi } from "vitest";
import givedirectly from "./fixtures/nonprofit-givedirectly.json";
import notFound from "./fixtures/nonprofit-not-found.json";
import searchMalaria from "./fixtures/search-malaria.json";
import { createEveryOrgClient, EveryOrgError } from "./client";

const KEY = "pk_test_secret";

function fakeFetch(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
  );
}

function requestedUrl(fetchMock: ReturnType<typeof fakeFetch>): URL {
  return new URL(String(fetchMock.mock.calls[0][0]));
}

describe("getNonprofit", () => {
  it("requests the details endpoint with the key and parses the result", async () => {
    const fetchMock = fakeFetch(200, givedirectly);
    const client = createEveryOrgClient({ apiKey: KEY, fetch: fetchMock });

    const org = await client.getNonprofit(" givedirectly ");

    const url = requestedUrl(fetchMock);
    expect(url.origin + url.pathname).toBe("https://partners.every.org/v0.2/nonprofit/givedirectly");
    expect(url.searchParams.get("apiKey")).toBe(KEY);
    expect(org?.ein).toBe("271661997");
  });

  it("returns null for a 404 and for a blank id (without calling Every.org)", async () => {
    const fetchMock = fakeFetch(404, notFound);
    const client = createEveryOrgClient({ apiKey: KEY, fetch: fetchMock });
    expect(await client.getNonprofit("no-such-org")).toBeNull();
    expect(await client.getNonprofit("  ")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("encodes the id so it can't change the path", async () => {
    const fetchMock = fakeFetch(404, notFound);
    await createEveryOrgClient({ apiKey: KEY, fetch: fetchMock }).getNonprofit("../search/x?y");
    expect(requestedUrl(fetchMock).pathname).toBe("/v0.2/nonprofit/..%2Fsearch%2Fx%3Fy");
  });
});

describe("searchNonprofits", () => {
  it("sends the term, take and causes, and parses the results", async () => {
    const fetchMock = fakeFetch(200, searchMalaria);
    const client = createEveryOrgClient({ apiKey: KEY, fetch: fetchMock });

    const results = await client.searchNonprofits("malaria", { take: 5, causes: ["disease", "humans"] });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/v0.2/search/malaria");
    expect(url.searchParams.get("take")).toBe("5");
    expect(url.searchParams.get("causes")).toBe("disease,humans");
    expect(results).toHaveLength(5);
  });

  it("caps take at Every.org's limit of 50 and at least 1", async () => {
    const fetchMock = fakeFetch(200, { nonprofits: [] });
    const client = createEveryOrgClient({ apiKey: KEY, fetch: fetchMock });
    await client.searchNonprofits("a", { take: 500 });
    await client.searchNonprofits("a", { take: 0 });
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("take")).toBe("50");
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get("take")).toBe("1");
  });

  it("returns no results for a blank term without calling Every.org", async () => {
    const fetchMock = fakeFetch(200, searchMalaria);
    expect(await createEveryOrgClient({ apiKey: KEY, fetch: fetchMock }).searchNonprofits("  ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("errors never leak the key", () => {
  async function failure(fetchImpl: typeof fetch): Promise<EveryOrgError> {
    const client = createEveryOrgClient({ apiKey: KEY, fetch: fetchImpl });
    const error = await client.getNonprofit("givedirectly").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EveryOrgError);
    expect(String((error as Error).message)).not.toContain(KEY);
    return error as EveryOrgError;
  }

  it("on a server error", async () => {
    expect((await failure(fakeFetch(500, "oops"))).status).toBe(500);
  });

  it("on a network error whose message includes the URL", async () => {
    await failure(async (input) => {
      throw new TypeError(`fetch failed: ${String(input)}`);
    });
  });

  it("on invalid JSON", async () => {
    await failure(fakeFetch(200, "<html>not json</html>"));
  });

  it("on an unexpected response shape", async () => {
    await failure(fakeFetch(200, { data: { surprise: true } }));
  });

  it("when the key isn't configured", async () => {
    const previous = process.env.EVERY_ORG_PUBLIC_KEY;
    delete process.env.EVERY_ORG_PUBLIC_KEY;
    try {
      const fetchMock = fakeFetch(200, givedirectly);
      await expect(createEveryOrgClient({ fetch: fetchMock }).getNonprofit("givedirectly")).rejects.toThrow(
        "EVERY_ORG_PUBLIC_KEY is not set",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      if (previous !== undefined) process.env.EVERY_ORG_PUBLIC_KEY = previous;
    }
  });
});
