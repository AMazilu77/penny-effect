import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { donationRequestSchema } from "@/lib/donations";
import { recordDonation } from "@/lib/record-donation";
import { prismaDonationStore } from "@/lib/donation-store";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { checkoutEnabled } from "@/lib/checkout";
import { startCheckout } from "@/lib/start-checkout";

// Records a donation the user intends to make. No payment is taken here: the
// row stays PENDING until the donation partner confirms it (Milestone 3).
// With checkout enabled (never on production yet), it also returns the
// Every.org Donate Link where the donor pays.
// Idempotent: the same idempotencyKey never creates two donations.
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
  const { organizationId, amountCents, message, idempotencyKey } = parsed.data;

  try {
    // Only organizations users can see may receive new gifts (D-012).
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, ...VISIBLE_ORGANIZATION_WHERE },
      select: { id: true },
    });
    if (!organization) {
      return NextResponse.json({ error: "This organization isn't available for donations." }, { status: 400 });
    }

    const result = await recordDonation(prismaDonationStore, {
      userId,
      organizationId,
      amountCents,
      message,
      idempotencyKey,
    });

    if (result.kind === "conflict") {
      return NextResponse.json(
        { error: "This request was already used for a different gift. Please reload and try again." },
        { status: 409 },
      );
    }
    const { id, amountCents: cents, currency, status, createdAt } = result.donation;
    const donation = { id, amountCents: cents, currency, status, createdAt };
    // Milestone 3 groundwork, behind a flag that is always off on production:
    // a link to pay on Every.org. The donation stays PENDING; only Every.org's
    // webhook (not built yet) may ever mark it completed.
    const checkoutUrl = checkoutEnabled() ? await startCheckout(id) : null;
    // 201 for a new donation; 200 when this exact request was already recorded
    // (double-click or retry): the original is returned and nothing new is created.
    return NextResponse.json(
      checkoutUrl ? { donation, checkoutUrl } : { donation },
      { status: result.kind === "created" ? 201 : 200 },
    );
  } catch (err) {
    console.error("Error recording donation:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
