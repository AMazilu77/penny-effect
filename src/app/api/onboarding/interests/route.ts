import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findUnknownIds, interestsRequestSchema } from "@/lib/onboarding";

// Saves the causes a user picked during onboarding and marks onboarding done.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = interestsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { categoryIds } = parsed.data;

  try {
    // Only existing categories can be followed.
    const existing = await prisma.causeCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    });
    const unknown = findUnknownIds(
      categoryIds,
      existing.map((c) => c.id),
    );
    if (unknown.length > 0) {
      return NextResponse.json({ error: "Unknown category" }, { status: 400 });
    }

    // Replace the user's interests and finish onboarding in one transaction,
    // so a failure can't leave them with no interests.
    await prisma.$transaction([
      prisma.userInterest.deleteMany({ where: { userId } }),
      prisma.userInterest.createMany({
        data: categoryIds.map((categoryId) => ({ userId, categoryId })),
        skipDuplicates: true,
      }),
      prisma.user.update({
        where: { id: userId },
        data: { hasCompletedOnboarding: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Onboarding error:", err);
    // Don't send internal error details to the browser.
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
