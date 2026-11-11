import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { donationRequestSchema } from "@/lib/donations";

// Records a donation the user intends to make. No payment is taken here: the
// row stays PENDING until the donation partner confirms it (Milestone 3).
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

  const parsed = donationRequestSchema.safeParse(body);
  if (!parsed.success) {
    // Our own validation messages (e.g. "The minimum gift is $1.00.") are safe to show.
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { organizationId, amountCents, message } = parsed.data;

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!organization) {
      return NextResponse.json({ error: "Unknown organization" }, { status: 400 });
    }

    const donation = await prisma.donation.create({
      data: {
        userId,
        organizationId,
        amountCents,
        currency: "USD",
        status: "PENDING",
        // LEGACY float column: written only so the previous deployment can still
        // read new rows. Nothing in this code reads it. Dropped in the follow-up migration.
        amount: amountCents / 100,
        message: message ?? null,
      },
      select: { id: true, amountCents: true, currency: true, status: true, createdAt: true },
    });

    return NextResponse.json({ donation }, { status: 201 });
  } catch (err) {
    console.error("Error recording donation:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
