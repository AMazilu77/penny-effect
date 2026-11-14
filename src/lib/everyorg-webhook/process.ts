// What a verified Every.org webhook does to our records (M3-PLAN §2).
// Runs only after the bearer token check passed (see ./auth.ts).
//
// Rules:
// - Only this code may set COMPLETED, REFUNDED or DISPUTED (D-001, D-011).
// - A donation event completes a gift only if it matches what we sent the
//   donor to pay: our checkoutToken (partnerDonationId), the nonprofit's EIN
//   (slug as fallback), the exact amount in cents, USD, one-time.
// - Idempotent: the donation's own state decides (externalId = chargeId is
//   unique, and the update only applies to a PENDING row), so a retried or
//   concurrent webhook changes nothing the second time.
// - Every authenticated event is recorded in PartnerEvent (without donor
//   data) with what happened and why.
//
// The store is an interface so this logic is tested without a database.
import {
  adjustmentEventSchema,
  classifyPartnerEvent,
  donationEventSchema,
  parseAbsoluteAmountCents,
  parseAmountCents,
  storedPayload,
  stringField,
  type PartnerEventKindName,
  type StoredPayload,
} from "./payload";
import { normalizeEin } from "@/lib/everyorg/parse";

export type DonationStatusName = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "DISPUTED";
export type PartnerEventStatusName = "APPLIED" | "DUPLICATE" | "REJECTED" | "IGNORED";

/** What we need to know about one of our donations to match a webhook. */
export type MatchableDonation = {
  id: string;
  status: DonationStatusName;
  amountCents: number;
  currency: string;
  checkoutToken: string | null;
  checkoutEin: string | null;
  checkoutSlug: string | null;
  externalId: string | null;
};

export type PartnerEventRecord = {
  kind: PartnerEventKindName;
  status: PartnerEventStatusName;
  reason: string | null;
  chargeId: string | null;
  partnerDonationId: string | null;
  donationId: string | null;
  payload: StoredPayload | null;
};

export type CompletionData = {
  chargeId: string;
  netAmountCents: number | null;
  paymentMethod: string | null;
  completedAt: Date;
};

export interface WebhookStore {
  findByCheckoutToken(checkoutToken: string): Promise<MatchableDonation | null>;
  findByChargeId(chargeId: string): Promise<MatchableDonation | null>;
  /** Sets COMPLETED only if the donation is still PENDING with no externalId. True if it changed. */
  complete(donationId: string, data: CompletionData): Promise<boolean>;
  /** Changes status only if it is currently one of `from`. True if it changed. */
  transition(donationId: string, from: DonationStatusName[], to: "REFUNDED" | "DISPUTED"): Promise<boolean>;
  /** Saves the audit row. A duplicate (provider, kind, chargeId) is silently skipped. */
  recordEvent(event: PartnerEventRecord): Promise<void>;
}

export type WebhookResult = Pick<PartnerEventRecord, "kind" | "status" | "reason" | "donationId">;

type Decision = { status: PartnerEventStatusName; reason: string | null; donationId: string | null };

const rejected = (reason: string, donationId: string | null = null): Decision => ({
  status: "REJECTED",
  reason,
  donationId,
});

/** Processes one authenticated webhook body. `body` is already JSON-parsed (or undefined if it wasn't JSON). */
export async function processPartnerWebhook(store: WebhookStore, body: unknown, now: Date): Promise<WebhookResult> {
  const kind = body === undefined ? "UNKNOWN" : classifyPartnerEvent(body);
  let decision: Decision;
  if (body === undefined) decision = rejected("body is not valid JSON");
  else if (kind === "DONATION") decision = await handleDonation(store, body, now);
  else if (kind === "REFUND" || kind === "DISPUTE") decision = await handleAdjustment(store, body, kind);
  else decision = { status: "IGNORED", reason: "unrecognised event (no known type, or a negative amount)", donationId: null };

  await store.recordEvent({
    kind,
    ...decision,
    chargeId: stringField(body, "chargeId"),
    partnerDonationId: stringField(body, "partnerDonationId"),
    payload: storedPayload(body),
  });
  return { kind, ...decision };
}

async function handleDonation(store: WebhookStore, body: unknown, now: Date): Promise<Decision> {
  const parsed = donationEventSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return rejected(`invalid donation payload: ${issue?.path.join(".") || "body"} ${issue?.message ?? ""}`.trim());
  }
  const event = parsed.data;
  if (!event.partnerDonationId) return rejected("no partnerDonationId (gift wasn't started from our site)");

  const donation = await store.findByCheckoutToken(event.partnerDonationId);
  if (!donation) return rejected("no donation with this partnerDonationId");

  // Already applied (a retry, or two deliveries racing): nothing to do.
  if (donation.externalId === event.chargeId) {
    return { status: "DUPLICATE", reason: null, donationId: donation.id };
  }
  if (donation.status !== "PENDING") return rejected(`donation is ${donation.status}, not PENDING`, donation.id);
  if (donation.externalId) return rejected("donation already matched a different chargeId", donation.id);

  // The nonprofit must be the one we sent the donor to.
  const ourEin = normalizeEin(donation.checkoutEin);
  if (ourEin) {
    if (normalizeEin(event.toNonprofit.ein) !== ourEin) return rejected("nonprofit EIN doesn't match", donation.id);
  } else if (!donation.checkoutSlug || donation.checkoutSlug !== event.toNonprofit.slug) {
    return rejected("nonprofit slug doesn't match", donation.id);
  }

  const cents = parseAmountCents(event.amount);
  if (cents === null) return rejected("amount isn't a plain dollar amount", donation.id);
  if (cents !== donation.amountCents) {
    return rejected(`amount ${cents} cents doesn't match the gift's ${donation.amountCents}`, donation.id);
  }
  if (event.currency.toUpperCase() !== donation.currency.toUpperCase()) {
    return rejected(`currency ${event.currency} doesn't match`, donation.id);
  }
  if (event.frequency !== "One-time") return rejected(`frequency ${event.frequency} isn't One-time`, donation.id);

  const net = event.netAmount ? parseAmountCents(event.netAmount) : null;
  const changed = await store.complete(donation.id, {
    chargeId: event.chargeId,
    // A net amount larger than the gift makes no sense; don't store it.
    netAmountCents: net !== null && net <= cents ? net : null,
    paymentMethod: event.paymentMethod ?? null,
    completedAt: now,
  });
  // Lost a race with an identical delivery: the other one applied it.
  if (!changed) return { status: "DUPLICATE", reason: "already applied concurrently", donationId: donation.id };
  return { status: "APPLIED", reason: null, donationId: donation.id };
}

async function handleAdjustment(store: WebhookStore, body: unknown, kind: "REFUND" | "DISPUTE"): Promise<Decision> {
  const parsed = adjustmentEventSchema.safeParse(body);
  if (!parsed.success) return rejected(`invalid ${kind.toLowerCase()} payload`);
  const event = parsed.data;

  // Refunds and disputes are about a payment that happened, so they find the
  // gift by Every.org's charge id, which our row only has once COMPLETED.
  const donation = await store.findByChargeId(event.chargeId);
  if (!donation) return rejected(`no completed donation with this chargeId`);
  if (event.partnerDonationId && event.partnerDonationId !== donation.checkoutToken) {
    return rejected("partnerDonationId doesn't match the charge", donation.id);
  }

  const target = kind === "REFUND" ? "REFUNDED" : "DISPUTED";
  if (donation.status === target) return { status: "DUPLICATE", reason: null, donationId: donation.id };

  if (kind === "REFUND" && event.amount !== undefined) {
    const cents = parseAbsoluteAmountCents(event.amount);
    if (cents === null) return rejected("refund amount isn't a plain dollar amount", donation.id);
    // We don't model partial refunds: an admin decides what's true.
    if (cents !== donation.amountCents) return rejected("partial refund: needs admin review", donation.id);
  }

  // A refund can follow a dispute (e.g. lost chargeback); a dispute only follows a completed gift.
  const from: DonationStatusName[] = kind === "REFUND" ? ["COMPLETED", "DISPUTED"] : ["COMPLETED"];
  if (!from.includes(donation.status)) return rejected(`donation is ${donation.status}`, donation.id);

  const changed = await store.transition(donation.id, from, target);
  if (!changed) return { status: "DUPLICATE", reason: "already changed concurrently", donationId: donation.id };
  return { status: "APPLIED", reason: null, donationId: donation.id };
}
