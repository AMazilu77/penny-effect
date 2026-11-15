"use server";
// Follow / unfollow an organization (Local plan L1, D-019). Called by the
// <FollowButton> form, so it works without JavaScript. Each action is a
// public POST endpoint under the hood, so it checks the session, validates
// input, rate-limits per user and only redirects to our own pages.
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { followForm, safeReturnPath, withNotice } from "@/lib/follows";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";
import { rateLimit, RULES } from "@/lib/rate-limit";
import { prismaRateLimitStore } from "@/lib/rate-limit-store";

async function prepare(formData: FormData) {
  const back = safeReturnPath(formData.get("returnTo"));
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect(`/signin?callbackUrl=${encodeURIComponent(back)}`);

  const input = followForm.safeParse({ organizationId: formData.get("organizationId") });
  if (!input.success) redirect(withNotice(back, "follow-unavailable"));

  const limited = await rateLimit(prismaRateLimitStore, [{ rule: RULES.followUser, identifier: userId }]);
  if (!limited.ok) redirect(withNotice(back, "follow-limited"));

  return { userId, organizationId: input.data.organizationId, back };
}

function finish(back: string, notice: "followed" | "unfollowed"): never {
  // The button's state shows on every page that lists organizations.
  for (const path of ["/feed", "/discover", "/dashboard"]) revalidatePath(path);
  revalidatePath("/org/[slug]", "page");
  redirect(withNotice(back, notice));
}

/** Follows a visible organization. Following twice is harmless. */
export async function followOrganization(formData: FormData) {
  const { userId, organizationId, back } = await prepare(formData);
  // Only organizations users can see (D-012); hidden or unverified ones can't be followed.
  const org = await prisma.organization.findFirst({
    where: { id: organizationId, ...VISIBLE_ORGANIZATION_WHERE },
    select: { id: true },
  });
  if (!org) redirect(withNotice(back, "follow-unavailable"));
  await prisma.organizationFollow.upsert({
    where: { userId_organizationId: { userId, organizationId } },
    create: { userId, organizationId },
    update: {},
  });
  finish(back, "followed");
}

/** Unfollows, whether or not the organization is still visible. Unfollowing twice is harmless. */
export async function unfollowOrganization(formData: FormData) {
  const { userId, organizationId, back } = await prepare(formData);
  await prisma.organizationFollow.deleteMany({ where: { userId, organizationId } });
  finish(back, "unfollowed");
}
