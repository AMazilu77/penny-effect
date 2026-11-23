// What a gift is, as shown to the donor, and which gifts any total may count.
// Pure (no database), so it's unit-tested; the dashboard, /donations, the
// profile and the thanks page all use it.
//
// - COMPLETED ("Paid") is set only by Every.org's verified webhook (D-001).
// - A gift sent to Every.org checkout that hasn't been confirmed after
//   CHECKOUT_PENDING_HOURS is shown as "Not completed". Display only: the row
//   stays PENDING and is never deleted, so a late webhook still completes it.
// - Legacy rows (recorded before real payments, D-011) are listed but never
//   counted, whatever their status.
import type { DonationStatusName } from "@/lib/dashboard";

/** How long a checkout may wait for Every.org's confirmation before it reads "Not completed". */
export const CHECKOUT_PENDING_HOURS = 48;

export type GiftStateName = DonationStatusName | "NOT_COMPLETED" | "LEGACY";

export type GiftStateInput = {
  status: DonationStatusName;
  legacy: boolean;
  /** Whether the donor was sent to Every.org (the row has a checkoutToken). */
  checkoutStarted: boolean;
  createdAt: Date;
};

/** The moment before which an unconfirmed checkout counts as not completed. */
export function staleCheckoutCutoff(now: Date): Date {
  return new Date(now.getTime() - CHECKOUT_PENDING_HOURS * 60 * 60 * 1000);
}

export function giftState(gift: GiftStateInput, now: Date): GiftStateName {
  if (gift.legacy) return "LEGACY";
  if (gift.status === "PENDING" && gift.checkoutStarted && gift.createdAt < staleCheckoutCutoff(now)) {
    return "NOT_COMPLETED";
  }
  return gift.status;
}

const LABELS: Record<GiftStateName, string> = {
  PENDING: "Recorded, not yet paid",
  COMPLETED: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
  DISPUTED: "Payment disputed",
  NOT_COMPLETED: "Not completed",
  LEGACY: "Before real payments, not counted",
};

export function giftStateLabel(state: GiftStateName): string {
  return LABELS[state];
}

/**
 * The donations a user's totals may include (dashboard tiles): never legacy
 * rows, and not checkouts that have waited too long. COMPLETED-only sums
 * ("given", "Most supported") filter further by status. A Prisma `where`,
 * built here so the rule lives in one tested place.
 */
export function countedDonationsWhere(userId: string, now: Date) {
  return {
    userId,
    legacy: false,
    NOT: { status: "PENDING" as const, checkoutToken: { not: null }, createdAt: { lt: staleCheckoutCutoff(now) } },
  };
}
