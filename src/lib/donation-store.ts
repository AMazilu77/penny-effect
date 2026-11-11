// Prisma-backed DonationStore for lib/record-donation.ts. Server-only.
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { DuplicateIdempotencyKeyError, type DonationStore } from "@/lib/record-donation";

const donationFields = {
  id: true,
  organizationId: true,
  amountCents: true,
  currency: true,
  status: true,
  createdAt: true,
} as const;

export const prismaDonationStore: DonationStore = {
  async create(input) {
    try {
      return await prisma.donation.create({
        data: {
          userId: input.userId,
          organizationId: input.organizationId,
          amountCents: input.amountCents,
          currency: "USD",
          status: "PENDING",
          idempotencyKey: input.idempotencyKey,
          // LEGACY float column: written only so the previous deployment can still
          // read new rows. Nothing reads it. Dropped in the follow-up migration.
          amount: input.amountCents / 100,
          message: input.message ?? null,
        },
        select: donationFields,
      });
    } catch (err) {
      // P2002 = unique constraint violation. The only unique field this insert
      // sets is (userId, idempotencyKey); recordDonation double-checks by
      // looking the original up.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new DuplicateIdempotencyKeyError();
      }
      throw err;
    }
  },

  findByIdempotencyKey(userId, idempotencyKey) {
    return prisma.donation.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      select: donationFields,
    });
  },
};
