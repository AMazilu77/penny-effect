import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ hasCompletedOnboarding: false }, { status: 401 });
  }

  // By id from the session, not by email (emails may differ in case).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasCompletedOnboarding: true },
  });

  return NextResponse.json({
    hasCompletedOnboarding: user?.hasCompletedOnboarding ?? false,
  });
}
