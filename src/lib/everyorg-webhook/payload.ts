// Parses Every.org partner webhook bodies (docs.every.org/docs/webhooks/partner-webhook).
// Pure functions, unit-tested against fixtures in ./fixtures.
//
// What's documented: one payload shape, sent when a donation completes.
// What isn't (yet): refund and dispute events. Every.org's CTO said they
// exist and is enabling them on our staging account; their shape is unknown.
// So classification is deliberately fail-safe:
// - an event counts as a refund/dispute only when a type-like field says so;
// - a negative amount with no such field is UNKNOWN (stored, never applied);
// - everything else is parsed strictly as a donation and must match our records.
// When real refund/dispute payloads arrive from staging, save them in
// ./fixtures and adjust `classifyPartnerEvent` (and its tests) only.
import { z } from "zod";
import { parseDollarsToCents } from "@/lib/money";

export type PartnerEventKindName = "DONATION" | "REFUND" | "DISPUTE" | "UNKNOWN";

// Field names Every.org might use to say what an event is. None of these
// appear in the documented donation payload.
const TYPE_FIELDS = ["eventType", "type", "event", "status"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Decides what kind of event a (JSON-parsed) body is. */
export function classifyPartnerEvent(body: unknown): PartnerEventKindName {
  if (!isRecord(body)) return "UNKNOWN";
  for (const field of TYPE_FIELDS) {
    const value = body[field];
    if (typeof value !== "string") continue;
    if (/refund/i.test(value)) return "REFUND";
    if (/dispute|chargeback/i.test(value)) return "DISPUTE";
  }
  // A negative amount without a type field could be a refund in a format we
  // haven't seen. Don't guess: keep it for review.
  if (typeof body.amount === "string" && body.amount.trim().startsWith("-")) return "UNKNOWN";
  return "DONATION";
}

/** "1000.00" → 100000. Strict: no signs, symbols, separators or more than 2 decimals. */
export function parseAmountCents(amount: string): number | null {
  return parseDollarsToCents(amount);
}

/** Like parseAmountCents, but accepts a leading minus (refund amounts) and returns the absolute value. */
export function parseAbsoluteAmountCents(amount: string): number | null {
  return parseDollarsToCents(amount.trim().replace(/^-/, ""));
}

const id = z.string().trim().min(1).max(200);

// Extra fields are allowed (Every.org may add some); the ones we use are strict.
export const donationEventSchema = z.object({
  chargeId: id,
  partnerDonationId: id.optional(),
  toNonprofit: z.object({
    slug: z.string().trim().min(1).max(200),
    ein: z.string().trim().max(20).nullish(),
    name: z.string().max(500).optional(),
  }),
  amount: z.string().trim().min(1).max(20),
  netAmount: z.string().trim().max(20).nullish(),
  currency: z.string().trim().min(3).max(3),
  frequency: z.string().trim().max(20),
  donationDate: z.string().max(40).optional(),
  paymentMethod: z.string().trim().max(50).nullish(),
});
export type DonationEvent = z.infer<typeof donationEventSchema>;

// Refund/dispute shape is a guess until Every.org sends real ones: the
// charge id is required (it's how we find the gift); the rest is optional.
export const adjustmentEventSchema = z.object({
  chargeId: id,
  partnerDonationId: id.optional(),
  amount: z.string().trim().min(1).max(20).optional(),
  currency: z.string().trim().min(3).max(3).optional(),
});
export type AdjustmentEvent = z.infer<typeof adjustmentEventSchema>;

// Only these fields are ever stored (PartnerEvent.payload). Everything else,
// including the donor's name, email, address, testimony and private note, is
// dropped before anything is saved. An allowlist rather than a blocklist, so
// a new PII field from Every.org isn't stored by accident.
const STORED_FIELDS = [
  "chargeId",
  "partnerDonationId",
  "amount",
  "netAmount",
  "currency",
  "frequency",
  "donationDate",
  "paymentMethod",
  ...TYPE_FIELDS,
] as const;

export type StoredPayload = Record<string, string | { slug?: string; ein?: string | null; name?: string }>;

/** The part of a webhook body we keep for the audit log: no donor data. */
export function storedPayload(body: unknown): StoredPayload | null {
  if (!isRecord(body)) return null;
  const out: StoredPayload = {};
  for (const field of STORED_FIELDS) {
    const value = body[field];
    if (typeof value === "string") out[field] = value.slice(0, 200);
  }
  const np = body.toNonprofit;
  if (isRecord(np)) {
    out.toNonprofit = {
      ...(typeof np.slug === "string" ? { slug: np.slug.slice(0, 200) } : {}),
      ...(typeof np.ein === "string" || np.ein === null ? { ein: np.ein as string | null } : {}),
      ...(typeof np.name === "string" ? { name: np.name.slice(0, 200) } : {}),
    };
  }
  return out;
}

/** Reads a string field if present (for audit columns on payloads that failed validation). */
export function stringField(body: unknown, field: string): string | null {
  if (!isRecord(body)) return null;
  const value = body[field];
  return typeof value === "string" && value.length > 0 ? value.slice(0, 200) : null;
}
