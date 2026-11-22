// Saving the causes (cause categories) a user follows. Shared by onboarding
// (POST /api/onboarding/interests) and the profile page
// (PUT /api/profile/causes), so both apply the same rule: only existing
// category ids, validated by `interestsRequestSchema` (src/lib/onboarding.ts).
import { prisma } from "@/lib/prisma";
import { findUnknownIds } from "@/lib/onboarding";

export type SaveInterestsResult = { ok: true } | { ok: false; reason: "unknown-category" };

/**
 * Replaces the user's causes with `categoryIds` and marks onboarding done,
 * in one transaction, so a failure can't leave them with no causes. Refuses
 * (and changes nothing) if any id isn't an existing category.
 */
export async function saveInterests(userId: string, categoryIds: readonly string[]): Promise<SaveInterestsResult> {
  const existing = await prisma.causeCategory.findMany({
    where: { id: { in: [...categoryIds] } },
    select: { id: true },
  });
  if (findUnknownIds(categoryIds, existing.map((c) => c.id)).length > 0) {
    return { ok: false, reason: "unknown-category" };
  }

  await prisma.$transaction([
    prisma.userInterest.deleteMany({ where: { userId } }),
    prisma.userInterest.createMany({
      data: categoryIds.map((categoryId) => ({ userId, categoryId })),
      skipDuplicates: true,
    }),
    prisma.user.update({ where: { id: userId }, data: { hasCompletedOnboarding: true } }),
  ]);
  return { ok: true };
}
