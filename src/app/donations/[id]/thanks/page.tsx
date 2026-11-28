// Where Every.org sends the donor back after checkout (success_url).
// Coming back here proves nothing: anyone can open this URL. So this page
// only ever says what our records say. A gift becomes "given" solely from
// Every.org's server-side confirmation (the partner webhook; D-001). While
// it's pending, the page re-reads our records every few seconds.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { buttonPrimary, buttonSecondary } from "@/components/ui/buttons";
import { authOptions } from "@/lib/auth";
import { giftStateLabel } from "@/lib/gift-state";
import { GIFT_ROW_SELECT, toGiftRow } from "@/lib/gift-rows";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { RefreshWhilePending } from "./RefreshWhilePending";

export const dynamic = "force-dynamic";

export default async function CheckoutThanksPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");
  const { id } = await params;

  // Only the donor's own gift; anyone else gets "not found".
  const row = await prisma.donation.findFirst({ where: { id, userId }, select: GIFT_ROW_SELECT });
  if (!row) notFound();
  const gift = toGiftRow(row, new Date());
  const money = (cents: number) => formatCents(cents, gift.currency);
  const org = gift.organization.name;

  return (
    <div className="mx-auto max-w-xl">
      <Card className="space-y-4">
        {gift.state === "COMPLETED" ? (
          <>
            <h1 className="text-2xl font-bold">Thank you</h1>
            <p className="text-lg">
              Every.org confirmed your <strong className="text-heading">{money(gift.amountCents)}</strong> gift to {org}.
            </p>
            {gift.requestedAmountCents !== null && (
              <p className="text-sm text-muted">
                You started with {money(gift.requestedAmountCents)} here; we record the amount Every.org confirmed.
              </p>
            )}
            {gift.netAmountCents !== null && (
              <p className="text-sm text-muted">
                After processing fees, {money(gift.netAmountCents)} goes to {org}.
              </p>
            )}
            <p>Your tax receipt comes from Every.org by email.</p>
          </>
        ) : gift.state === "PENDING" ? (
          <>
            <h1 className="text-2xl font-bold">Thanks! We&apos;ll confirm when Every.org does</h1>
            <p>
              Your {money(gift.amountCents)} gift to {org} is recorded. We count it as given only once Every.org confirms the
              payment to us directly. That usually takes a few minutes; bank transfers take longer.
            </p>
            <p className="text-sm text-muted">
              Every.org processes the payment and emails your tax receipt. We never see your card or bank details.
            </p>
            <RefreshWhilePending />
          </>
        ) : gift.state === "NOT_COMPLETED" ? (
          <>
            <h1 className="text-2xl font-bold">Not completed</h1>
            <p>
              Every.org hasn&apos;t confirmed a payment for your {money(gift.amountCents)} gift to {org} within 48 hours, so it
              isn&apos;t counted. If you did pay, it updates as soon as Every.org confirms; check your email for their receipt.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{giftStateLabel(gift.state)}</h1>
            <p>
              Your {money(gift.amountCents)} gift to {org} isn&apos;t counted as given. Every.org can tell you more in the
              receipt email.
            </p>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href="/donations" className={buttonPrimary}>
            Your gifts
          </Link>
          <Link href="/discover" className={buttonSecondary}>
            Discover more causes
          </Link>
        </div>
      </Card>
    </div>
  );
}
