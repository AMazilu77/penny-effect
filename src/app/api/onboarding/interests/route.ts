import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { causes, locationAllowed } = body as {
      causes: string[];
      locationAllowed?: boolean;
    };

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const selectAll = causes.includes("all");

    // Delete any old interests
    await prisma.userInterest.deleteMany({
      where: { userId: user.id },
    });

    if (!selectAll) {
      // Find existing cause categories
      const existingCategories = await prisma.causeCategory.findMany({
        where: { name: { in: causes } },
      });

      // Create any that are missing
      const existingNames = existingCategories.map((c) => c.name);
      const missing = causes.filter((name) => !existingNames.includes(name));

      if (missing.length > 0) {
        await prisma.causeCategory.createMany({
          data: missing.map((name) => ({ name })),
        });
      }

      // Fetch all categories again
      const allCategories = await prisma.causeCategory.findMany({
        where: { name: { in: causes } },
      });

      // Create user interests
      await prisma.userInterest.createMany({
        data: allCategories.map((cat) => ({
          userId: user.id,
          categoryId: cat.id,
        })),
      });
    }

    // Update the user's onboarding flag
    await prisma.user.update({
      where: { id: user.id },
      data: {
        hasCompletedOnboarding: true,
        // optionally create a blank location record
        location: locationAllowed
          ? {
              upsert: {
                create: {},
                update: {},
              },
            }
          : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
