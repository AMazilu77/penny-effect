import { describe, expect, it } from "vitest";
import {
  clientIp,
  hashIdentifier,
  rateLimit,
  retryAfterText,
  RULES,
  windowStart,
  type RateLimitStore,
  type RateRule,
} from "./rate-limit";

// Same semantics as the Postgres store: atomic increment per (bucket, key, window).
function memoryStore() {
  const counts = new Map<string, number>();
  const store: RateLimitStore = {
    async hit(bucket, keyHash, start) {
      const key = `${bucket}|${keyHash}|${start.toISOString()}`;
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
  };
  return { store, counts };
}

const rule: RateRule = { name: "test", limit: 3, windowSeconds: 3600 };
const T0 = new Date("2026-11-14T10:15:00Z");

describe("rateLimit", () => {
  it("allows up to the limit, then refuses with the time until the window ends", async () => {
    const { store } = memoryStore();
    for (let i = 0; i < 3; i++) expect(await rateLimit(store, [{ rule, identifier: "u1" }], T0)).toEqual({ ok: true });
    expect(await rateLimit(store, [{ rule, identifier: "u1" }], T0)).toEqual({
      ok: false,
      retryAfterSeconds: 45 * 60,
      rule: "test",
    });
  });

  it("counts each identifier separately", async () => {
    const { store } = memoryStore();
    for (let i = 0; i < 4; i++) await rateLimit(store, [{ rule, identifier: "u1" }], T0);
    expect((await rateLimit(store, [{ rule, identifier: "u2" }], T0)).ok).toBe(true);
  });

  it("starts fresh in the next window", async () => {
    const { store } = memoryStore();
    for (let i = 0; i < 4; i++) await rateLimit(store, [{ rule, identifier: "u1" }], T0);
    expect((await rateLimit(store, [{ rule, identifier: "u1" }], new Date("2026-11-14T11:00:00Z"))).ok).toBe(true);
  });

  it("refuses when any check is over, and still counts all of them", async () => {
    const { store, counts } = memoryStore();
    const strict: RateRule = { name: "strict", limit: 1, windowSeconds: 60 };
    await rateLimit(store, [{ rule: strict, identifier: "ip" }, { rule, identifier: "u1" }], T0);
    const second = await rateLimit(store, [{ rule: strict, identifier: "ip" }, { rule, identifier: "u1" }], T0);
    expect(second).toMatchObject({ ok: false, rule: "strict" });
    expect([...counts.values()]).toEqual([2, 2]);
  });

  it("reports the longest wait when several checks are over", async () => {
    const { store } = memoryStore();
    const minute: RateRule = { name: "m", limit: 0, windowSeconds: 60 };
    const day: RateRule = { name: "d", limit: 0, windowSeconds: 86400 };
    const result = await rateLimit(store, [{ rule: minute, identifier: "x" }, { rule: day, identifier: "x" }], T0);
    expect(result).toMatchObject({ ok: false, rule: "d" });
  });

  it("checkout start: a card tester is stopped by user and by IP caps", async () => {
    const { store } = memoryStore();
    const checks = (user: string, ip: string) => [
      { rule: RULES.checkoutUserHour, identifier: user },
      { rule: RULES.checkoutUserDay, identifier: user },
      { rule: RULES.checkoutIpHour, identifier: ip },
      { rule: RULES.checkoutIpDay, identifier: ip },
    ];
    // One account, many attempts: stopped after 5 in an hour.
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await rateLimit(store, checks("u1", "1.1.1.1"), T0)).ok);
    expect(results).toEqual([true, true, true, true, true, false]);
    // Many fresh accounts from one IP: the IP cap (10/hour) still stops them.
    const fresh = memoryStore();
    const ipResults = [];
    for (let i = 0; i < 11; i++) ipResults.push((await rateLimit(fresh.store, checks(`u${i}`, "2.2.2.2"), T0)).ok);
    expect(ipResults.filter(Boolean)).toHaveLength(10);
    expect(ipResults[10]).toBe(false);
  });
});

describe("hashIdentifier", () => {
  it("never contains the raw identifier and depends on the secret and rule", () => {
    const h = hashIdentifier("signin:email", "alice@example.com", "secret-1");
    expect(h).not.toContain("alice");
    expect(h).toBe(hashIdentifier("signin:email", " Alice@Example.com ", "secret-1"));
    expect(h).not.toBe(hashIdentifier("signin:email", "alice@example.com", "secret-2"));
    expect(h).not.toBe(hashIdentifier("register:ip", "alice@example.com", "secret-1"));
  });
});

describe("windowStart", () => {
  it("rounds down to the window", () => {
    expect(windowStart(T0, 3600).toISOString()).toBe("2026-11-14T10:00:00.000Z");
    expect(windowStart(T0, 900).toISOString()).toBe("2026-11-14T10:15:00.000Z");
    expect(windowStart(T0, 86400).toISOString()).toBe("2026-11-14T00:00:00.000Z");
  });
});

describe("clientIp", () => {
  it("prefers x-real-ip, then the first x-forwarded-for entry", () => {
    expect(clientIp(new Headers({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers({ "x-forwarded-for": " 5.6.7.8 , 10.0.0.1" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("retryAfterText", () => {
  it("speaks in plain units", () => {
    expect(retryAfterText(30)).toBe("in a minute");
    expect(retryAfterText(45 * 60)).toBe("in 45 minutes");
    expect(retryAfterText(20 * 3600)).toBe("in 20 hours");
  });
});
