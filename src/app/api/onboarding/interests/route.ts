import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { causes, locationAllowed } = body as {
      causes: string[];
      locationAllowed?: boolean;
    };

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const selectAll = causes.includes("all");

    // Clear existing interests
    await prisma.userInterest.deleteMany({ where: { userId: user.id } });

    if (!selectAll) {
      // 1️⃣ Find existing categories
      const existing = await prisma.causeCategory.findMany({
        where: { name: { in: causes } },
        select: { name: true },
      });
      const existingNames = existing.map((c) => c.name);
      const missing = causes.filter((n) => !existingNames.includes(n));

      // 2️⃣ Try to create missing ones, skip if duplicates found mid-transaction
      if (missing.length > 0) {
        try {
          await prisma.causeCategory.createMany({
            data: missing.map((name) => ({ name })),
            skipDuplicates: true, // ✅ the important part
          });
        } catch (err: any) {
          console.warn("⚠️ Skipping duplicate cause creation:", err.message);
        }
      }

      // 3️⃣ Fetch all again and link
      const categories = await prisma.causeCategory.findMany({
        where: { name: { in: causes } },
        select: { id: true },
      });

      await prisma.userInterest.createMany({
        data: categories.map((cat) => ({
          userId: user.id,
          categoryId: cat.id,
        })),
        skipDuplicates: true,
      });
    }

    // 4️⃣ Mark onboarding complete
    await prisma.user.update({
      where: { id: user.id },
      data: {
        hasCompletedOnboarding: true,
        location: locationAllowed
          ? { upsert: { create: {}, update: {} } }
          : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Onboarding error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
