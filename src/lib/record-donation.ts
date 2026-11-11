// Idempotent donation recording.
//
// The donation form sends an idempotency key: a random UUID generated when the
// form loads (and again after each successful gift). The database has a unique
// constraint on (userId, idempotencyKey), so the same request can't create two
// donations, whether from a double-click, a network retry, or two requests
// racing each other. A repeat returns the original donation instead.
//
// Milestone 3 reuses this pattern for Every.org checkout and its webhook
// (the partner's event id plays the role of the key).

export type DonationInput = {
  userId: string;
  organizationId: string;
  amountCents: number;
  message?: string;
  idempotencyKey: string;
};

export type RecordedDonation = {
  id: string;
  organizationId: string;
  amountCents: number | null;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: Date;
};

/** Thrown by a store when (userId, idempotencyKey) already exists. */
export class DuplicateIdempotencyKeyError extends Error {
  constructor() {
    super("Duplicate idempotency key");
    this.name = "DuplicateIdempotencyKeyError";
  }
}

/** Where donations are saved. The real one is Prisma; tests use an in-memory one. */
export interface DonationStore {
  /** Inserts a new donation. Must throw DuplicateIdempotencyKeyError on a duplicate key. */
  create(input: DonationInput): Promise<RecordedDonation>;
  findByIdempotencyKey(userId: string, idempotencyKey: string): Promise<RecordedDonation | null>;
}

export type RecordDonationResult =
  | { kind: "created"; donation: RecordedDonation }
  | { kind: "replayed"; donation: RecordedDonation }
  // The key was already used for a *different* gift (other organization or amount).
  | { kind: "conflict" };

export async function recordDonation(store: DonationStore, input: DonationInput): Promise<RecordDonationResult> {
  try {
    // Insert first and let the unique constraint decide. "Check, then insert"
    // would let two simultaneous requests both pass the check.
    return { kind: "created", donation: await store.create(input) };
  } catch (err) {
    if (!(err instanceof DuplicateIdempotencyKeyError)) throw err;
  }

  const existing = await store.findByIdempotencyKey(input.userId, input.idempotencyKey);
  if (!existing) {
    // Shouldn't happen: the constraint said the row exists.
    throw new Error("Idempotency key conflict but no matching donation found");
  }

  const sameGift =
    existing.organizationId === input.organizationId && existing.amountCents === input.amountCents;
  return sameGift ? { kind: "replayed", donation: existing } : { kind: "conflict" };
}
