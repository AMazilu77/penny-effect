// Prisma-backed WebhookStore for ./process.ts. Server-only.
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { WebhookStore } from "./process";

const matchFields = {
  id: true,
  status: true,
  amountCents: true,
  currency: true,
  checkoutToken: true,
  checkoutEin: true,
  checkoutSlug: true,
  externalId: true,
} as const;

export const prismaWebhookStore: WebhookStore = {
  findByCheckoutToken(checkoutToken) {
    return prisma.donation.findUnique({ where: { checkoutToken }, select: matchFields });
  },

  findByChargeId(chargeId) {
    return prisma.donation.findUnique({ where: { externalId: chargeId }, select: matchFields });
  },

  async complete(donationId, data) {
    try {
      // Conditional update: only a still-PENDING, unmatched row changes, so
      // two deliveries racing can't both apply.
      const { count } = await prisma.donation.updateMany({
        where: { id: donationId, status: "PENDING", externalId: null },
        data: {
          status: "COMPLETED",
          externalId: data.chargeId,
          completedAt: data.completedAt,
          netAmountCents: data.netAmountCents,
          paymentMethod: data.paymentMethod,
        },
      });
      return count === 1;
    } catch (err) {
      // P2002: this chargeId is already on another donation. Treat as not applied.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
      throw err;
    }
  },

  async transition(donationId, from, to) {
    const { count } = await prisma.donation.updateMany({
      where: { id: donationId, status: { in: from } },
      data: { status: to },
    });
    return count === 1;
  },

  async recordEvent(event) {
    try {
      await prisma.partnerEvent.create({
        data: {
          provider: "EVERYORG",
          kind: event.kind,
          status: event.status,
          reason: event.reason?.slice(0, 500) ?? null,
          chargeId: event.chargeId,
          partnerDonationId: event.partnerDonationId,
          donationId: event.donationId,
          payload: event.payload ?? Prisma.JsonNull,
        },
      });
    } catch (err) {
      // A retried delivery: the first one is already in the log.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
      throw err;
    }
  },
};
