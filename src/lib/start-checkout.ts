// Starts Every.org checkout for a PENDING donation (Milestone 3 groundwork).
// Server-only. Gives the donation a checkoutToken exactly once (a retry or
// double-click reuses it), freezes which nonprofit the donor is sent to, and
// returns the Donate Link. Never changes the donation's status.
import { prisma } from "@/lib/prisma";
import { buildDonateLink, donateHost, newCheckoutToken, siteUrl } from "@/lib/checkout";

export async function startCheckout(donationId: string): Promise<string | null> {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    select: {
      status: true,
      amountCents: true,
      checkoutToken: true,
      checkoutEin: true,
      checkoutSlug: true,
      organization: { select: { ein: true, everyOrgSlug: true } },
    },
  });
  if (!donation || donation.status !== "PENDING") return null;

  let { checkoutToken, checkoutEin, checkoutSlug } = donation;
  if (!checkoutToken) {
    // Set only if still unset, so two simultaneous requests can't give one gift two tokens.
    await prisma.donation.updateMany({
      where: { id: donationId, checkoutToken: null },
      data: {
        checkoutToken: newCheckoutToken(),
        checkoutEin: donation.organization.ein,
        checkoutSlug: donation.organization.everyOrgSlug,
      },
    });
    const fresh = await prisma.donation.findUniqueOrThrow({
      where: { id: donationId },
      select: { checkoutToken: true, checkoutEin: true, checkoutSlug: true },
    });
    ({ checkoutToken, checkoutEin, checkoutSlug } = fresh);
  }
  const nonprofit = checkoutSlug ?? checkoutEin;
  if (!checkoutToken || !nonprofit) return null;

  const site = siteUrl();
  return buildDonateLink({
    host: donateHost(),
    nonprofit,
    amountCents: donation.amountCents,
    checkoutToken,
    successUrl: `${site}/donations/${donationId}/thanks`,
    exitUrl: `${site}/dashboard?checkout=cancelled`,
    webhookToken: process.env.EVERYORG_WEBHOOK_TOKEN || undefined,
  });
}
