import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkoutPlan, donationRequestSchema } from "@/lib/donations";
import { recordDonation } from "@/lib/record-donation";
import { prismaDonationStore } from "@/lib/donation-store";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { checkoutEnabled } from "@/lib/checkout";
import { startCheckout } from "@/lib/start-checkout";
import { clientIp, RULES, type RateCheck } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-store";

// Records a donation as PENDING. No payment is taken here: the row stays
// PENDING until Every.org's verified webhook confirms it (Milestone 3).
// With checkout enabled (never on Vercel production or Preview yet) and a gift
// of at least $10 (D-017), it also returns the Every.org Donate Link where the
// donor pays. The Give page sends `checkout: true`: then a gift that can't go
// to Every.org is refused instead of recorded.
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
  const plan = checkoutPlan({ amountCents, requested: parsed.data.checkout === true, enabled: checkoutEnabled() });
  if (plan.kind === "error") return NextResponse.json({ error: plan.error }, { status: plan.status });

  try {
    // Rate limits (D-018). Starting a checkout is strict per user AND per IP
    // (card-testing risk flagged by Every.org); checked before anything is
    // recorded, so a refused request leaves no row behind.
    const ip = clientIp(req.headers);
    const checks: RateCheck[] = [{ rule: RULES.donateUser, identifier: userId }];
    if (plan.kind === "checkout") {
      checks.push(
        { rule: RULES.checkoutUserHour, identifier: userId },
        { rule: RULES.checkoutUserDay, identifier: userId },
        { rule: RULES.checkoutIpHour, identifier: ip },
        { rule: RULES.checkoutIpDay, identifier: ip },
      );
    }
    const limited = await rateLimitResponse(checks, "gifts in a short time");
    if (limited) return limited;

    // Only organizations users can see may receive new gifts (D-012).
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, ...VISIBLE_ORGANIZATION_WHERE },
      select: { id: true, everyOrgSlug: true },
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
    // A link to pay on Every.org. The donation stays PENDING; only Every.org's
    // verified webhook may ever mark it completed. Leaving Every.org without
    // paying returns the donor to where they started.
    const exitPath =
      parsed.data.checkout && organization.everyOrgSlug
        ? `/give/${encodeURIComponent(organization.everyOrgSlug)}?checkout=cancelled`
        : undefined;
    const checkoutUrl = plan.kind === "checkout" ? await startCheckout(id, exitPath) : null;
    // 201 for a new donation; 200 when this exact request was already recorded
    // (double-click or retry): the original is returned and nothing new is created.
    if (parsed.data.checkout && !checkoutUrl) {
      // Recorded, but no link (e.g. the organization has neither slug nor EIN
      // any more). A retry with the same key replays the gift and tries again.
      return NextResponse.json({ error: "We couldn't start Every.org checkout. Please try again." }, { status: 502 });
    }
    return NextResponse.json(
      checkoutUrl ? { donation, checkoutUrl } : { donation },
      { status: result.kind === "created" ? 201 : 200 },
    );
  } catch (err) {
    // The error's name only: messages can include query values.
    console.error("Error recording donation:", err instanceof Error ? err.name : "unknown error");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
