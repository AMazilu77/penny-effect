import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { organizationId, amount, message } = body;

    if (!organizationId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create the donation
    const donation = await prisma.donation.create({
      data: {
        userId: user.id,
        organizationId,
        amount: parseFloat(amount),
        message: message || null,
      },
    });

    return NextResponse.json({ success: true, donation }, { status: 201 });
  } catch (error) {
    console.error("Error creating donation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
