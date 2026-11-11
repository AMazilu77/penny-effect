// Turns per-status donation totals into the dashboard's numbers (D-011):
// - "given" counts only COMPLETED donations: money the donation partner confirmed.
// - PENDING donations are shown separately as "recorded, not yet paid".
// Until the partner integration (Milestone 3) everything is PENDING, so
// "given" is honestly $0.

export type DonationStatusName = "PENDING" | "COMPLETED" | "FAILED";

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
    // FAILED donations count toward nothing.
  }
  return summary;
}

const STATUS_LABELS: Record<DonationStatusName, string> = {
  PENDING: "Recorded, not yet paid",
  COMPLETED: "Paid",
  FAILED: "Payment failed",
};

export function donationStatusLabel(status: DonationStatusName): string {
  return STATUS_LABELS[status];
}
