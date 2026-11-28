// Give to one organization: /give/<every.org slug>. Signed-in only (proxy).
// The donor picks an amount ($10 minimum, Every.org's), we record a PENDING
// donation with our own id for it, and send them to Every.org's Donate Link
// to pay. Only Every.org's verified webhook marks the gift as given (D-001).
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { buttonPrimary, buttonSecondary, textLink } from "@/components/ui/buttons";
import { authOptions } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/brand";
import { checkoutEnabled } from "@/lib/checkout";
import { orgSlug } from "@/lib/feed";
import { CHECKOUT_MIN_CENTS, MAX_DONATION_CENTS } from "@/lib/money";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";
import { GiveForm } from "./GiveForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Give | ${BRAND_NAME}` };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GivePage({ params, searchParams }: Props) {
  const { slug: raw } = await params;
  const slug = orgSlug(raw);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/signin?callbackUrl=${encodeURIComponent(`/give/${slug ?? ""}`)}`);
  if (!slug) notFound();

  // Only organizations users can see may receive gifts (D-012).
  const org = await prisma.organization.findFirst({
    where: { everyOrgSlug: slug, ...VISIBLE_ORGANIZATION_WHERE },
    select: { id: true, name: true, everyOrgSlug: true, logoUrl: true },
  });
  if (!org) notFound();
  const cancelled = (await searchParams).checkout === "cancelled";
  const orgHref = `/org/${encodeURIComponent(slug)}`;

  return (
    <div className="mx-auto max-w-xl space-y-(--space-section)">
      <p>
        <Link href={orgHref} className={textLink}>
          ← {org.name}
        </Link>
      </p>
      {cancelled && (
        <p role="status" className="rounded-control border border-warn bg-warn-soft p-3 text-sm text-warn">
          You left Every.org without paying, so nothing was charged. You can try again below.
        </p>
      )}
      <Card className="space-y-5">
        <div className="flex items-center gap-3">
          <OrgLogo orgId={org.id} hasLogo={Boolean(org.logoUrl)} size={44} />
          <h1 className="text-2xl font-bold">Give to {org.name}</h1>
        </div>
        {checkoutEnabled() ? (
          <GiveForm
            organizationId={org.id}
            organizationName={org.name}
            minCents={CHECKOUT_MIN_CENTS}
            maxCents={MAX_DONATION_CENTS}
          />
        ) : (
          <div className="space-y-3">
            <p>Giving through Every.org isn&apos;t open yet. Nothing can be paid here for now.</p>
            <p className="text-sm text-muted">
              You can record an intention on your dashboard. It&apos;s labelled &ldquo;recorded, not yet paid&rdquo; and never
              counts as given.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/dashboard?give=${encodeURIComponent(org.id)}#give`} className={buttonPrimary}>
                Record an intention
              </Link>
              <Link href={orgHref} className={buttonSecondary}>
                Back
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
