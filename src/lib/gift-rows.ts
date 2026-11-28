// The gift rows shown in history (dashboard, /donations, profile): one Prisma
// select and one mapper, so every list shows the same state, and the
// checkoutToken (our id at Every.org) never leaves the server.
import { giftState, type GiftStateName } from "@/lib/gift-state";
import type { DonationStatusName } from "@/lib/dashboard";

export const GIFT_ROW_SELECT = {
  id: true,
  amountCents: true,
  requestedAmountCents: true,
  netAmountCents: true,
  currency: true,
  status: true,
  legacy: true,
  checkoutToken: true,
  createdAt: true,
  completedAt: true,
  organization: { select: { name: true } },
} as const;

export type GiftRowSource = {
  id: string;
  amountCents: number;
  requestedAmountCents: number | null;
  netAmountCents: number | null;
  currency: string;
  status: DonationStatusName;
  legacy: boolean;
  checkoutToken: string | null;
  createdAt: Date;
  completedAt: Date | null;
  organization: { name: string };
};

export type GiftRow = {
  id: string;
  amountCents: number;
  /** Set only when Every.org confirmed a different amount than the donor chose here. */
  requestedAmountCents: number | null;
  netAmountCents: number | null;
  currency: string;
  state: GiftStateName;
  createdAt: Date;
  completedAt: Date | null;
  organization: { name: string };
};

export function toGiftRow(row: GiftRowSource, now: Date): GiftRow {
  const state = giftState(
    { status: row.status, legacy: row.legacy, checkoutStarted: row.checkoutToken !== null, createdAt: row.createdAt },
    now,
  );
  const confirmed = row.completedAt !== null;
  return {
    id: row.id,
    amountCents: row.amountCents,
    requestedAmountCents:
      confirmed && row.requestedAmountCents !== null && row.requestedAmountCents !== row.amountCents ? row.requestedAmountCents : null,
    netAmountCents: confirmed ? row.netAmountCents : null,
    currency: row.currency,
    state,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    organization: row.organization,
  };
}
