import { describe, expect, it } from "vitest";
import {
  DuplicateIdempotencyKeyError,
  recordDonation,
  type DonationInput,
  type DonationStore,
  type RecordedDonation,
} from "@/lib/record-donation";

// In-memory store that enforces the same unique (userId, idempotencyKey)
// constraint as the database. `create` yields once before inserting, so two
// concurrent calls really interleave like two simultaneous HTTP requests.
function memoryStore() {
  const rows: (RecordedDonation & { userId: string; idempotencyKey: string })[] = [];
  const store: DonationStore = {
    async create(input) {
      await Promise.resolve();
      if (rows.some((r) => r.userId === input.userId && r.idempotencyKey === input.idempotencyKey)) {
        throw new DuplicateIdempotencyKeyError();
      }
      const row = {
        id: `don_${rows.length + 1}`,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
        organizationId: input.organizationId,
        amountCents: input.amountCents,
        currency: "USD",
        status: "PENDING" as const,
        createdAt: new Date(),
      };
      rows.push(row);
      return row;
    },
    async findByIdempotencyKey(userId, key) {
      return rows.find((r) => r.userId === userId && r.idempotencyKey === key) ?? null;
    },
  };
  return { store, rows };
}

const gift = (overrides: Partial<DonationInput> = {}): DonationInput => ({
  userId: "user_1",
  organizationId: "org_1",
  amountCents: 550,
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  ...overrides,
});

describe("recordDonation", () => {
  it("same key twice → one donation; the repeat returns the original", async () => {
    const { store, rows } = memoryStore();
    const first = await recordDonation(store, gift());
    const second = await recordDonation(store, gift());

    expect(first.kind).toBe("created");
    expect(second.kind).toBe("replayed");
    expect(rows).toHaveLength(1);
    if (first.kind !== "conflict" && second.kind !== "conflict") {
      expect(second.donation.id).toBe(first.donation.id);
    }
  });

  it("two different keys → two donations", async () => {
    const { store, rows } = memoryStore();
    await recordDonation(store, gift({ idempotencyKey: "11111111-1111-4111-8111-111111111111" }));
    await recordDonation(store, gift({ idempotencyKey: "22222222-2222-4222-8222-222222222222" }));
    expect(rows).toHaveLength(2);
  });

  it("a rapid double-click (two simultaneous requests, same key) → one donation", async () => {
    const { store, rows } = memoryStore();
    const results = await Promise.all([recordDonation(store, gift()), recordDonation(store, gift())]);

    expect(rows).toHaveLength(1);
    expect(results.map((r) => r.kind).sort()).toEqual(["created", "replayed"]);
  });

  it("the same key from a different user is a different donation", async () => {
    const { store, rows } = memoryStore();
    await recordDonation(store, gift({ userId: "user_1" }));
    await recordDonation(store, gift({ userId: "user_2" }));
    expect(rows).toHaveLength(2);
  });

  it("reusing a key for a different gift is a conflict, not a new donation", async () => {
    const { store, rows } = memoryStore();
    await recordDonation(store, gift({ amountCents: 550 }));
    expect(await recordDonation(store, gift({ amountCents: 9900 }))).toEqual({ kind: "conflict" });
    expect(await recordDonation(store, gift({ organizationId: "org_2" }))).toEqual({ kind: "conflict" });
    expect(rows).toHaveLength(1);
  });

  it("rethrows unexpected store errors", async () => {
    const store: DonationStore = {
      create: async () => {
        throw new Error("database down");
      },
      findByIdempotencyKey: async () => null,
    };
    await expect(recordDonation(store, gift())).rejects.toThrow("database down");
  });
});
