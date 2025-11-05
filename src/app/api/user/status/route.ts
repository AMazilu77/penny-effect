import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ hasCompletedOnboarding: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { hasCompletedOnboarding: true },
  });

  return NextResponse.json({
    hasCompletedOnboarding: user?.hasCompletedOnboarding ?? false,
  });
}
