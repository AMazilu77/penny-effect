// Database access for the profile API (Milestone 3.5). Every function takes
// the signed-in user's id from the caller (the session), so a request can
// only ever touch its own row. Kept separate from the route handlers so
// their tests can replace it with spies.
import { prisma } from "@/lib/prisma";
import type { ProfileUpdate } from "@/lib/profile";

export const profileStore = {
  /** Applies the update; false if the user no longer exists (e.g. deleted in another tab). */
  async update(userId: string, data: ProfileUpdate): Promise<boolean> {
    const { count } = await prisma.user.updateMany({ where: { id: userId }, data });
    return count === 1;
  },
};
