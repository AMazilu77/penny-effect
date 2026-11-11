import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Landing page after Google sign-in: new users go to onboarding, returning
// users to their feed. (Email/password sign-in does the same check in the browser.)
export const dynamic = "force-dynamic";

export default async function AuthContinuePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasCompletedOnboarding: true },
  });
  if (!user) redirect("/signin");

  redirect(user.hasCompletedOnboarding ? "/feed" : "/onboarding/interests");
}
