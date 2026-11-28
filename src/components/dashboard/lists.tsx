// The gift list and the followed-organizations list, shared by the dashboard
// (first few, with "See all (N)") and their own pages (/donations, /following).
import Link from "next/link";
import { formatCents } from "@/lib/money";
import { giftStateLabel } from "@/lib/gift-state";
import type { GiftRow } from "@/lib/gift-rows";
import { FollowButton } from "@/components/FollowButton";
import { OrgLogo } from "@/components/ui/OrgLogo";

// Dates are shown in UTC so server and browser render the same text.
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** One line under a gift saying what Every.org confirmed, or why it isn't counted. */
function GiftDetail({ gift }: { gift: GiftRow }) {
  const money = (cents: number) => formatCents(cents, gift.currency);
  switch (gift.state) {
    case "COMPLETED":
      return (
        <>
          Confirmed by Every.org{gift.completedAt ? ` on ${dateFormat.format(gift.completedAt)}` : ""}
          {gift.requestedAmountCents !== null && ` (you chose ${money(gift.requestedAmountCents)} here)`}
          {gift.netAmountCents !== null && ` · ${money(gift.netAmountCents)} reached them after processing fees`}
          {" · Every.org emails the tax receipt"}
        </>
      );
    case "NOT_COMPLETED":
      return <>Every.org hasn&apos;t confirmed a payment within 48 hours. Not counted; if you did pay, it updates when they confirm.</>;
    case "LEGACY":
      return <>Recorded before real payments started. Never charged, and not counted in any total.</>;
    case "REFUNDED":
    case "DISPUTED":
    case "FAILED":
      return <>Not counted as given.</>;
    case "PENDING":
      return null;
  }
}

export function GiftList({ gifts }: { gifts: readonly GiftRow[] }) {
  return (
    <ul className="divide-y rounded-control border bg-inset">
      {gifts.map((d) => (
        <li key={d.id} className="space-y-1 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span>
              <span className="font-semibold text-heading">{formatCents(d.amountCents, d.currency)}</span> to{" "}
              {d.organization.name}
              <span className="ms-2 inline-flex rounded-full border px-2 py-0.5 text-sm text-muted">{giftStateLabel(d.state)}</span>
            </span>
            <time dateTime={d.createdAt.toISOString()} className="text-sm text-muted">
              {dateFormat.format(d.createdAt)}
            </time>
          </div>
          {d.state !== "PENDING" && (
            <p className="text-sm text-muted">
              <GiftDetail gift={d} />
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export type FollowedOrg = { id: string; name: string; everyOrgSlug: string | null; logoUrl: string | null };

/** Followed organizations, each with an Unfollow button that comes back to `returnTo`. */
export function FollowedOrgList({ orgs, returnTo }: { orgs: readonly FollowedOrg[]; returnTo: "/dashboard" | "/following" | "/profile" }) {
  return (
    <ul className="divide-y rounded-control border bg-inset">
      {orgs.map((org) => (
        <li key={org.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="flex min-w-0 items-center gap-2">
            <OrgLogo orgId={org.id} hasLogo={Boolean(org.logoUrl)} size={28} />
            {org.everyOrgSlug ? (
              <Link href={`/org/${encodeURIComponent(org.everyOrgSlug)}`} className="font-semibold text-fg hover:underline">
                {org.name}
              </Link>
            ) : (
              <span className="font-semibold text-fg">{org.name}</span>
            )}
          </span>
          <FollowButton organizationId={org.id} organizationName={org.name} following signedIn returnTo={returnTo} />
        </li>
      ))}
    </ul>
  );
}

/** "See all (N)", shown under a shortened list only when there's more to see. */
export function SeeAll({ href, total, shown, label }: { href: string; total: number; shown: number; label: string }) {
  if (total <= shown) return null;
  return (
    <p className="mt-3 text-end">
      <Link href={href} className="font-medium text-link underline" aria-label={`See all ${total} ${label}`}>
        See all ({total})
      </Link>
    </p>
  );
}
