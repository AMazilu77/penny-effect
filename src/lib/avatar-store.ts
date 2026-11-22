// Database access for uploaded profile pictures (UserAvatar). Every function
// takes the signed-in user's id from the caller. Replaced by spies in tests.
import { prisma } from "@/lib/prisma";

export const avatarStore = {
  async get(userId: string): Promise<{ data: Uint8Array; updatedAt: Date } | null> {
    return prisma.userAvatar.findUnique({ where: { userId }, select: { data: true, updatedAt: true } });
  },
  /** Saves or replaces the picture; returns its new version (for cache-busting URLs). */
  async save(userId: string, data: Uint8Array): Promise<Date> {
    // Prisma's Bytes field wants a Uint8Array backed by a plain ArrayBuffer.
    const bytes = new Uint8Array(data);
    const row = await prisma.userAvatar.upsert({
      where: { userId },
      create: { userId, data: bytes },
      update: { data: bytes },
      select: { updatedAt: true },
    });
    return row.updatedAt;
  },
  async remove(userId: string): Promise<void> {
    await prisma.userAvatar.deleteMany({ where: { userId } });
  },
};

/** The URL of the user's own uploaded picture, changing whenever it's replaced. */
export function avatarUrl(updatedAt: Date): string {
  return `/api/profile/avatar?v=${updatedAt.getTime()}`;
}
