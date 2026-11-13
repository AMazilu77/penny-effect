import { describe, expect, it, vi } from "vitest";
import givedirectly from "@/lib/everyorg/fixtures/nonprofit-givedirectly.json";
import { EveryOrgError, type EveryOrgNonprofit } from "@/lib/everyorg/client";
import { parseNonprofitResponse } from "@/lib/everyorg/parse";
import {
  MAX_CONSECUTIVE_FAILURES,
  refreshOrganizations,
  type RefreshCandidate,
  type RefreshStore,
} from "@/lib/org-refresh";

const GD = parseNonprofitResponse(givedirectly);
const NOW = new Date("2026-11-16T07:00:00Z");

function candidate(overrides: Partial<RefreshCandidate> = {}): RefreshCandidate {
  return { id: "org1", everyOrgId: GD.everyOrgId, ein: GD.ein, verifiedAt: new Date("2026-11-12"), ...overrides };
}

function fakeStore(candidates: RefreshCandidate[], updateResult: "ok" | "conflict" = "ok") {
  return {
    candidates: vi.fn<RefreshStore["candidates"]>(async (limit) => candidates.slice(0, limit)),
    update: vi.fn<RefreshStore["update"]>(async () => updateResult),
    markNotFound: vi.fn<RefreshStore["markNotFound"]>(async () => {}),
  };
}

function clientReturning(...results: (EveryOrgNonprofit | null | Error)[]) {
  const getNonprofit = vi.fn(async () => {
    const next = results.length > 1 ? results.shift() : results[0];
    if (next instanceof Error) throw next;
    return next ?? null;
  });
  return { getNonprofit };
}

describe("refreshOrganizations", () => {
  it("updates Every.org fields and keeps verification when the EIN is unchanged", async () => {
    const store = fakeStore([candidate()]);
    const client = clientReturning(GD);

    const summary = await refreshOrganizations({ store, client, now: () => NOW });

    expect(client.getNonprofit).toHaveBeenCalledWith(GD.everyOrgId);
    expect(store.update).toHaveBeenCalledTimes(1);
    const [id, data] = store.update.mock.calls[0];
    expect(id).toBe("org1");
    expect(data).toMatchObject({ ein: GD.ein, isDisbursable: true, lastSyncedAt: NOW });
    expect(data).not.toHaveProperty("verifiedAt");
    expect(data).not.toHaveProperty("name");
    expect(summary).toMatchObject({ checked: 1, updated: 1, unverified: 0, stoppedEarly: null });
  });

  it("clears verification when Every.org reports a different EIN", async () => {
    const store = fakeStore([candidate({ ein: "123456789" })]);
    const summary = await refreshOrganizations({ store, client: clientReturning(GD), now: () => NOW });

    expect(store.update.mock.calls[0][1]).toMatchObject({
      ein: GD.ein,
      verifiedAt: null,
      verifiedById: null,
      verificationNote: null,
    });
    expect(summary).toMatchObject({ updated: 1, unverified: 1 });
  });

  it("clears verification when the EIN disappears", async () => {
    const store = fakeStore([candidate()]);
    await refreshOrganizations({ store, client: clientReturning({ ...GD, ein: null }), now: () => NOW });
    expect(store.update.mock.calls[0][1]).toMatchObject({ ein: null, verifiedAt: null });
  });

  it("doesn't count an unverified organization as unverified by the refresh", async () => {
    const store = fakeStore([candidate({ ein: "123456789", verifiedAt: null })]);
    const summary = await refreshOrganizations({ store, client: clientReturning(GD), now: () => NOW });
    expect(store.update.mock.calls[0][1]).not.toHaveProperty("verifiedAt");
    expect(summary.unverified).toBe(0);
  });

  it("marks an organization Every.org no longer knows as not disbursable, without updating anything else", async () => {
    const store = fakeStore([candidate()]);
    const summary = await refreshOrganizations({ store, client: clientReturning(null), now: () => NOW });

    expect(store.markNotFound).toHaveBeenCalledWith("org1", NOW);
    expect(store.update).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ notFound: 1, updated: 0 });
  });

  it("skips a response for a different Every.org record", async () => {
    const store = fakeStore([candidate({ everyOrgId: "someone-else" })]);
    const summary = await refreshOrganizations({ store, client: clientReturning(GD), now: () => NOW });
    expect(store.update).not.toHaveBeenCalled();
    expect(summary.conflicts).toBe(1);
  });

  it("counts a unique-column clash as a conflict and carries on", async () => {
    const store = fakeStore([candidate({ id: "a" }), candidate({ id: "b" })], "conflict");
    const summary = await refreshOrganizations({ store, client: clientReturning(GD), now: () => NOW });
    expect(summary).toMatchObject({ checked: 2, conflicts: 2, updated: 0 });
  });

  it("asks the store for at most `limit` candidates", async () => {
    const store = fakeStore([]);
    await refreshOrganizations({ store, client: clientReturning(GD), limit: 7 });
    expect(store.candidates).toHaveBeenCalledWith(7);
  });

  it("stops at once when Every.org rate-limits", async () => {
    const store = fakeStore([candidate({ id: "a" }), candidate({ id: "b" })]);
    const client = clientReturning(new EveryOrgError("Every.org responded 429", 429), GD);
    const summary = await refreshOrganizations({ store, client, now: () => NOW });

    expect(client.getNonprofit).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({ checked: 1, failed: 1, stoppedEarly: "rate-limited" });
  });

  it("skips a single failure but stops after several in a row", async () => {
    const orgs = Array.from({ length: 10 }, (_, i) => candidate({ id: `o${i}` }));
    const fail = new EveryOrgError("Every.org responded 500", 500);

    const once = await refreshOrganizations({
      store: fakeStore(orgs.slice(0, 2)),
      client: clientReturning(fail, GD),
      now: () => NOW,
    });
    expect(once).toMatchObject({ failed: 1, updated: 1, stoppedEarly: null });

    const down = await refreshOrganizations({ store: fakeStore(orgs), client: clientReturning(fail), now: () => NOW });
    expect(down).toMatchObject({ checked: MAX_CONSECUTIVE_FAILURES, stoppedEarly: "failures" });
  });

  it("stops starting new requests once the time budget is used", async () => {
    let t = 0;
    const now = () => new Date((t += 10_000)); // each call to now() advances 10 s
    const orgs = Array.from({ length: 10 }, (_, i) => candidate({ id: `o${i}` }));
    const summary = await refreshOrganizations({
      store: fakeStore(orgs),
      client: clientReturning(GD),
      now,
      timeBudgetMs: 45_000,
    });
    expect(summary.stoppedEarly).toBe("time");
    expect(summary.checked).toBeLessThan(10);
  });

  it("rethrows unexpected errors instead of hiding them", async () => {
    const store = fakeStore([candidate()]);
    await expect(
      refreshOrganizations({ store, client: clientReturning(new TypeError("bug")), now: () => NOW }),
    ).rejects.toThrow("bug");
  });
});
