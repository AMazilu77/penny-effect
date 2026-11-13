// Where Every.org sends the donor back after checkout (success_url).
// Coming back here proves nothing: anyone can open this URL. So this page
// only ever says what our records say. A gift becomes "given" solely from
// Every.org's server-side confirmation (the webhook, a later PR; D-001).
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { buttonPrimary, buttonSecondary } from "@/components/ui/buttons";
import { authOptions } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CheckoutThanksPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");
  const { id } = await params;

  // Only the donor's own gift; anyone else gets "not found".
  const donation = await prisma.donation.findFirst({
    where: { id, userId },
    select: { amountCents: true, currency: true, status: true, organization: { select: { name: true } } },
  });
  if (!donation) notFound();
  const amount = formatCents(donation.amountCents, donation.currency);

  return (
    <div className="mx-auto max-w-xl">
      <Card className="space-y-4">
        {donation.status === "COMPLETED" ? (
          <>
            <h1 className="text-2xl font-bold">Thank you</h1>
            <p>
              Every.org confirmed your {amount} gift to {donation.organization.name}. Your receipt comes from Every.org by
              email.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Waiting for Every.org to confirm</h1>
            <p>
              Your {amount} gift to {donation.organization.name} is recorded. We count it as given only once Every.org
              confirms the payment to us directly, which can take a few minutes (longer for bank transfers).
            </p>
            <p className="text-sm text-muted">
              Every.org processes the payment and emails your tax receipt. We never see your card or bank details.
            </p>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className={buttonPrimary}>
            Back to your dashboard
          </Link>
          <Link href="/discover" className={buttonSecondary}>
            Discover more causes
          </Link>
        </div>
      </Card>
    </div>
  );
}
