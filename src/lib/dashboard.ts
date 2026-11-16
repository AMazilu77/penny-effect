// Turns per-status donation totals into the dashboard's numbers (D-011):
// - "given" counts only COMPLETED donations: money the donation partner confirmed.
// - PENDING donations are shown separately as "recorded, not yet paid".
// Until the partner integration (Milestone 3) everything is PENDING, so
// "given" is honestly $0.

export type DonationStatusName = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "DISPUTED";

/** One row of `prisma.donation.groupBy({ by: ["status"], _sum: { amountCents }, _count })`. */
export type DonationStatusGroup = {
  status: DonationStatusName;
  _sum: { amountCents: number | null };
  _count: { _all: number };
};

export type DonationSummary = {
  givenCents: number;
  givenCount: number;
  pendingCents: number;
  pendingCount: number;
};

export function summarizeDonations(groups: readonly DonationStatusGroup[]): DonationSummary {
  const summary: DonationSummary = { givenCents: 0, givenCount: 0, pendingCents: 0, pendingCount: 0 };
  for (const group of groups) {
    const cents = group._sum.amountCents ?? 0;
    if (group.status === "COMPLETED") {
      summary.givenCents += cents;
      summary.givenCount += group._count._all;
    } else if (group.status === "PENDING") {
      summary.pendingCents += cents;
      summary.pendingCount += group._count._all;
    }
    // FAILED, REFUNDED and DISPUTED donations count toward nothing: the money
    // didn't reach the nonprofit, or may be taken back.
  }
  return summary;
}

const STATUS_LABELS: Record<DonationStatusName, string> = {
  PENDING: "Recorded, not yet paid",
  COMPLETED: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
  DISPUTED: "Payment disputed",
};

export function donationStatusLabel(status: DonationStatusName): string {
  return STATUS_LABELS[status];
}

/** How many gifts and followed organizations the dashboard shows before "See all (N)". */
export const DASHBOARD_PREVIEW = 5;

/** Gifts per page on /donations. */
export const GIFTS_PER_PAGE = 50;

/** A ?page= value as a page number from 1; anything else (missing, 0, "abc", "2.5", huge) is page 1. */
export function parsePage(raw: unknown): number {
  if (typeof raw !== "string" || !/^[1-9][0-9]{0,4}$/.test(raw)) return 1;
  return Number(raw);
}

/** The number of pages for `total` items (at least 1, so an empty list still has a page). */
export function pageCount(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage));
}
