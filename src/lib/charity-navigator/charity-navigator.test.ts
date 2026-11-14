import { describe, expect, it, vi } from "vitest";
import { CharityNavigatorError, createCharityNavigatorClient, parseRatingResponse } from "./client";
import { cnProfileUrlFor, displayRating, isStale, manualRatingForm } from "./rating";
import { refreshCharityNavigator, type CnStore } from "./refresh";

const EIN = "271661997";
const NOW = new Date("2026-11-14T00:00:00Z");
const fixture = (results: unknown[]) => ({ data: { publicSearchFaceted: { results } } });

describe("parseRatingResponse", () => {
  it("takes the result for exactly this EIN", () => {
    const body = fixture([
      { ein: "111111111", encompass_score: 70, encompass_star_rating: 2 },
      { ein: "27-1661997", encompass_score: 97.6, encompass_star_rating: 4 },
    ]);
    expect(parseRatingResponse(body, EIN)).toEqual({ ein: EIN, score: 98, stars: 4 });
  });

  it("accepts numbers sent as strings, and a missing star rating", () => {
    expect(parseRatingResponse(fixture([{ ein: EIN, encompass_score: "88", encompass_star_rating: null }]), EIN)).toEqual({
      ein: EIN,
      score: 88,
      stars: null,
    });
  });

  it("returns null when CN has no rating for this EIN, or a nonsense score", () => {
    expect(parseRatingResponse(fixture([{ ein: "111111111", encompass_score: 90 }]), EIN)).toBeNull();
    expect(parseRatingResponse(fixture([{ ein: EIN, encompass_score: null }]), EIN)).toBeNull();
    expect(parseRatingResponse(fixture([{ ein: EIN, encompass_score: 140 }]), EIN)).toBeNull();
    expect(parseRatingResponse(fixture([]), EIN)).toBeNull();
  });

  it("throws on GraphQL errors or an unexpected shape", () => {
    expect(() => parseRatingResponse({ errors: [{ message: "bad" }] }, EIN)).toThrow(CharityNavigatorError);
    expect(() => parseRatingResponse({ data: { publicSearchFaceted: { results: "x" } } }, EIN)).toThrow(CharityNavigatorError);
  });
});

describe("client", () => {
  it("sends the key as a bearer token and the EIN as the search term", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(fixture([{ ein: EIN, encompass_score: 95, encompass_star_rating: 4 }]))));
    const r = await createCharityNavigatorClient({ apiKey: "k_test", fetch: fetchMock }).getRating(EIN);
    expect(r).toMatchObject({ score: 95, stars: 4 });
    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer k_test");
    expect(JSON.parse(String(init?.body)).variables).toEqual({ term: EIN });
  });

  it("reports HTTP errors without the key, and skips malformed EINs", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("no", { status: 429 }));
    const client = createCharityNavigatorClient({ apiKey: "k_secret", fetch: fetchMock });
    await expect(client.getRating(EIN)).rejects.toMatchObject({ status: 429, message: expect.not.stringContaining("k_secret") });
    expect(await client.getRating("12-345")).toBeNull();
  });
});

describe("rating rules", () => {
  it("builds the profile link from the EIN", () => {
    expect(cnProfileUrlFor(EIN)).toBe("https://www.charitynavigator.org/ein/271661997");
  });

  it("marks ratings older than about six months as stale, but still shows them", () => {
    expect(isStale(new Date("2026-06-01"), NOW)).toBe(false);
    expect(isStale(new Date("2026-05-01"), NOW)).toBe(true);
    const shown = displayRating(
      { cnScore: 91, cnStars: 4, cnProfileUrl: cnProfileUrlFor(EIN), cnCheckedAt: new Date("2025-01-01"), cnSource: "MANUAL" },
      NOW,
    );
    expect(shown).toMatchObject({ score: 91, stale: true, manual: true });
  });

  it("shows nothing without a score, link and date", () => {
    expect(displayRating({ cnScore: null, cnStars: null, cnProfileUrl: null, cnCheckedAt: null, cnSource: null }, NOW)).toBeNull();
  });
});

describe("manualRatingForm", () => {
  const form = manualRatingForm(EIN);
  const ok = { organizationId: "o1", cnScore: "95", cnStars: "4", cnProfileUrl: "https://www.charitynavigator.org/ein/271661997" };

  it("accepts a score, optional stars and this org's CN profile link", () => {
    expect(form.parse(ok)).toMatchObject({ cnScore: 95, cnStars: 4 });
    expect(form.parse({ ...ok, cnStars: "" }).cnStars).toBeNull();
    expect(form.safeParse({ ...ok, cnProfileUrl: "https://charitynavigator.org/ein/27-1661997/" }).success).toBe(true);
  });

  it("requires the link to be CN's page for this EIN", () => {
    for (const cnProfileUrl of [
      "https://www.charitynavigator.org/ein/111111111",
      "https://evil.example/ein/271661997",
      "http://www.charitynavigator.org/ein/271661997",
      "https://www.charitynavigator.org.evil.example/ein/271661997",
      "",
    ]) {
      expect(form.safeParse({ ...ok, cnProfileUrl }).success, cnProfileUrl).toBe(false);
    }
  });

  it("rejects scores and stars outside the published ranges", () => {
    for (const cnScore of ["101", "-1", "9.5", "abc", ""]) expect(form.safeParse({ ...ok, cnScore }).success, cnScore).toBe(false);
    expect(form.safeParse({ ...ok, cnStars: "5" }).success).toBe(false);
  });
});

describe("refreshCharityNavigator", () => {
  const store = (n = 2) => ({
    candidates: vi.fn<CnStore["candidates"]>(async () => Array.from({ length: n }, (_, i) => ({ id: `o${i}`, ein: EIN }))),
    save: vi.fn<CnStore["save"]>(async () => {}),
  });

  it("saves API ratings with the profile link and date, and leaves orgs without a rating alone", async () => {
    const s = store(2);
    const client = { getRating: vi.fn().mockResolvedValueOnce({ ein: EIN, score: 90, stars: 4 }).mockResolvedValueOnce(null) };
    const summary = await refreshCharityNavigator({ store: s, client, now: () => NOW });
    expect(s.save).toHaveBeenCalledTimes(1);
    expect(s.save.mock.calls[0][1]).toEqual({
      cnScore: 90,
      cnStars: 4,
      cnProfileUrl: "https://www.charitynavigator.org/ein/271661997",
      cnCheckedAt: NOW,
      cnSource: "API",
    });
    expect(summary).toMatchObject({ checked: 2, updated: 1, noRating: 1 });
  });

  it("stops on a 429 and after repeated failures", async () => {
    const rateLimited = { getRating: vi.fn().mockRejectedValue(new CharityNavigatorError("x", 429)) };
    expect(await refreshCharityNavigator({ store: store(5), client: rateLimited, now: () => NOW })).toMatchObject({
      checked: 1,
      stoppedEarly: "rate-limited",
    });
    const down = { getRating: vi.fn().mockRejectedValue(new CharityNavigatorError("x", 500)) };
    expect(await refreshCharityNavigator({ store: store(10), client: down, now: () => NOW })).toMatchObject({
      checked: 3,
      stoppedEarly: "failures",
    });
  });
});
