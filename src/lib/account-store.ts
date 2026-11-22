// Database side of account settings (src/lib/account.ts). Server-only.
import { compare, hash } from "bcrypt";
import { prisma } from "@/lib/prisma";
import type { AccountStore, PasswordHasher } from "@/lib/account";

export const bcryptHasher: PasswordHasher = { compare, hash };

export const prismaAccountStore: AccountStore = {
  async findCredentials(userId) {
    return prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, email: true } });
  },

  async setPasswordHash(userId, passwordHash) {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },

  /**
   * Account deletion, in one transaction (all or nothing):
   * 1. Donations are kept for accounting but anonymized: `userId` is cleared,
   *    `userDeletedAt` set, and the donor's free-text `message` removed (it
   *    could contain personal details). Amount, organization, status, dates
   *    and the partner's ids stay, so totals and reconciliation with
   *    Every.org still add up.
   * 2. Personal rows without a cascade are deleted: chosen causes, the old
   *    location row, and any email verification tokens.
   * 3. The user row is deleted. The database cascades to sign-in accounts
   *    (Google link), sessions, followed organizations and the uploaded
   *    picture, and clears `verifiedById` on organizations an admin verified
   *    (their verification note and date stay).
   * Rate-limit counters hold only keyed hashes, never the user id, and
   * expire on their own.
   */
  async deleteUser(userId, email) {
    await prisma.$transaction([
      prisma.donation.updateMany({
        where: { userId },
        data: { userId: null, userDeletedAt: new Date(), message: null },
      }),
      prisma.userInterest.deleteMany({ where: { userId } }),
      prisma.userLocation.deleteMany({ where: { userId } }),
      ...(email ? [prisma.verificationToken.deleteMany({ where: { identifier: email } })] : []),
      prisma.user.delete({ where: { id: userId } }),
    ]);
  },
};
