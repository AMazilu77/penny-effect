// app/profile/page.tsx: the signed-in user's own profile (Milestone 3.5).
// Private: only the signed-in user ever sees it (public profiles are out of
// scope, charter §6). Every list here comes from their own rows; no sample data.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BRAND_NAME } from "@/lib/brand";
import { VISIBLE_ORGANIZATION_WHERE, isVisibleOrganization } from "@/lib/organizations";
import { topSupported, type OrgGiving, type Supported } from "@/lib/top-supported";
import { formatCents } from "@/lib/money";
import { PROFILE_PREVIEW, initials, signInMethodLabel, signInMethods } from "@/lib/profile";
import { avatarUrl } from "@/lib/avatar-store";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { buttonPrimary } from "@/components/ui/buttons";
import { SignOutButton } from "@/components/SignOutButton";
import { FollowNotice } from "@/components/FollowButton";
import { FollowedOrgList, GiftList, SeeAll } from "@/components/dashboard/lists";
import { GIFT_ROW_SELECT, toGiftRow } from "@/lib/gift-rows";
import { DetailsForm } from "./DetailsForm";
import { PrivacyForm } from "./PrivacyForm";
import { CausesForm } from "./CausesForm";
import { AvatarForm } from "./AvatarForm";
import { PasswordForm } from "./PasswordForm";
import { DeleteAccountForm } from "./DeleteAccountForm";
import { AreaForm } from "./AreaForm";
import { stateOptions } from "@/lib/everyorg/address";

export const dynamic = "force-dynamic";
export const metadata = { title: `Your profile | ${BRAND_NAME}` };

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** One "Most supported" line: the organization or cause, total given, number of gifts. */
function SupportedTile({ label, item, href }: { label: string; item: Supported; href: string | null }) {
  return (
    <div className="min-w-0 rounded-control border bg-inset p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold text-heading">
        {href ? (
          <Link href={href} className="hover:underline">
            {item.name}
          </Link>
        ) : (
          item.name
        )}
      </p>
      <p className="mt-1">
        <span className="font-semibold text-heading">{formatCents(item.totalCents)}</span> given in{" "}
        {plural(item.gifts, "gift", "gifts")}
      </p>
    </div>
  );
}

/**
 * The organization and the cause this user has given the most to, from
 * COMPLETED donations only (src/lib/top-supported.ts).
 */
async function loadTopSupported(userId: string) {
  const groups = await prisma.donation.groupBy({
    by: ["organizationId"],
    // Every donation is in USD today; filtering keeps the sum honest if that changes.
    // Legacy rows (before real payments) never count, whatever their status.
    where: { userId, status: "COMPLETED", currency: "USD", legacy: false },
    _sum: { amountCents: true },
    _count: { _all: true },
  });
  if (groups.length === 0) return topSupported([]);
  const orgs = await prisma.organization.findMany({
    where: { id: { in: groups.map((g) => g.organizationId) } },
    select: {
      id: true,
      name: true,
      everyOrgSlug: true,
      status: true,
      verifiedAt: true,
      ein: true,
      isDisbursable: true,
      categories: { select: { id: true, name: true, slug: true } },
    },
  });
  const byId = new Map(orgs.map((o) => [o.id, o]));
  const rows: OrgGiving[] = [];
  for (const g of groups) {
    const org = byId.get(g.organizationId);
    if (!org) continue;
    rows.push({
      organization: {
        id: org.id,
        name: org.name,
        // Link to the organization's page only while users can see it.
        slug: isVisibleOrganization(org) ? org.everyOrgSlug : null,
        categories: org.categories,
      },
      totalCents: g._sum.amountCents ?? 0,
      gifts: g._count._all,
    });
  }
  return topSupported(rows);
}

function Empty({ text, href, action }: { text: string; href: string; action: string }) {
  return (
    <Card level="inset" as="div">
      <p>{text}</p>
      <Link href={href} className={`${buttonPrimary} mt-3`}>
        {action}
      </Link>
    </Card>
  );
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/signin?callbackUrl=%2Fprofile");

  const now = new Date();
  const [user, providers, categories, interests, follows, followCount, gifts, giftCount, top, regions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      // The password hash is read only to say whether one exists; it never leaves this function.
      select: {
        name: true,
        email: true,
        image: true,
        bio: true,
        showNameInTotals: true,
        passwordHash: true,
        avatar: { select: { updatedAt: true } },
        areaCity: true,
        areaState: true,
        areaRegion: { select: { slug: true } },
      },
    }),
    prisma.account.findMany({ where: { userId }, select: { provider: true } }),
    prisma.causeCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.userInterest.findMany({ where: { userId }, select: { categoryId: true } }),
    prisma.organizationFollow.findMany({
      where: { userId, organization: VISIBLE_ORGANIZATION_WHERE },
      orderBy: { organization: { name: "asc" } },
      take: PROFILE_PREVIEW,
      select: { organization: { select: { id: true, name: true, everyOrgSlug: true, logoUrl: true } } },
    }),
    prisma.organizationFollow.count({ where: { userId, organization: VISIBLE_ORGANIZATION_WHERE } }),
    prisma.donation.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PROFILE_PREVIEW,
      select: GIFT_ROW_SELECT,
    }),
    prisma.donation.count({ where: { userId } }),
    loadTopSupported(userId),
    prisma.region.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  // Signed in with a token for an account that's gone (deleted in another tab or device).
  if (!user) {
    return (
      <Card>
        <CardHeader as="h1" title="This account no longer exists" description="Sign out to finish." />
        <SignOutButton />
      </Card>
    );
  }

  const methods = signInMethods(Boolean(user.passwordHash), providers.map((p) => p.provider));
  // The uploaded picture; otherwise the Google avatar for Google sign-ins; otherwise initials.
  const googlePicture = methods.includes("google") && user.image?.startsWith("https://") ? user.image : null;
  const pictureSrc = user.avatar ? avatarUrl(user.avatar.updatedAt) : googlePicture;
  const displayName = user.name ?? user.email ?? "You";
  const params = await searchParams;

  return (
    <div className="space-y-(--space-section)">
      {/* Identity */}
      <Card className="relative overflow-hidden">
        <span aria-hidden className="lorenz-mark pointer-events-none absolute -right-6 -top-10 h-56 w-52 opacity-15" />
        <div className="relative flex flex-wrap items-center gap-4">
          <Avatar src={pictureSrc} initials={initials(user.name, user.email)} size={88} />
          <div className="min-w-0 space-y-1">
            <h1 className="text-3xl font-bold break-words">{displayName}</h1>
            <p className="text-sm text-muted">Only you can see this page.</p>
          </div>

        </div>
        <dl className="relative mt-5 grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-control border bg-inset p-3">
            <dt className="text-sm font-medium text-muted">Email</dt>
            <dd className="break-words font-semibold text-heading">{user.email ?? "None"}</dd>
          </div>
          <div className="rounded-control border bg-inset p-3">
            <dt className="text-sm font-medium text-muted">Sign-in method</dt>
            <dd className="font-semibold text-heading">{signInMethodLabel(methods)}</dd>
          </div>
        </dl>
        {user.bio && (
          // Plain text, exactly as typed: React escapes it; line breaks are kept.
          <p className="relative mt-4 whitespace-pre-line break-words">{user.bio}</p>
        )}
      </Card>

      <FollowNotice value={params.notice} />

      <div className="grid items-start gap-(--space-section) lg:grid-cols-2">
        <Card aria-labelledby="about-heading">
          <CardHeader title={<span id="about-heading">About you</span>} description="Your email can't be changed here." />
          <div className="mb-5 border-b pb-5">
            <h3 className="mb-2 text-sm font-semibold text-heading">Profile picture</h3>
            <AvatarForm hasUpload={Boolean(user.avatar)} fallbackText={googlePicture ? "your Google picture" : "your initials"} />
          </div>
          <DetailsForm name={user.name ?? ""} bio={user.bio ?? ""} />
        </Card>

        <Card aria-labelledby="causes-heading">
          <CardHeader
            title={<span id="causes-heading" className="scroll-mt-28">Your causes</span>}
            description="Your feed shows news from these under My causes."
          />
          <CausesForm categories={categories} selected={interests.map((i) => i.categoryId)} />
        </Card>
      </div>

      <Card aria-labelledby="top-heading">
        <CardHeader
          title={<span id="top-heading">Most supported</span>}
          description="From gifts our donation partner confirmed as paid."
        />
        {top.organization ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <SupportedTile
              label="Top organization"
              item={top.organization}
              href={top.organization.slug ? `/org/${encodeURIComponent(top.organization.slug)}` : null}
            />
            {top.cause ? (
              <SupportedTile label="Top cause" item={top.cause} href={`/discover?category=${encodeURIComponent(top.cause.slug ?? "")}`} />
            ) : (
              <div className="rounded-control border bg-inset p-4">
                <p className="text-sm font-medium text-muted">Top cause</p>
                <p className="mt-1">The organizations you&apos;ve given to aren&apos;t listed under a cause yet.</p>
              </div>
            )}
          </div>
        ) : (
          <Card level="inset" as="div">
            <p>Your top organization will show here after your first gift.</p>
            {giftCount > 0 && (
              <p className="mt-2 text-sm text-muted">Gifts count here once Every.org confirms they&apos;re paid.</p>
            )}
          </Card>
        )}
      </Card>

      <div className="grid items-start gap-(--space-section) lg:grid-cols-2">
        <Card aria-labelledby="following-heading">
          <CardHeader
            title={<span id="following-heading">Organizations you follow</span>}
            description="Their updates appear in your feed under Following. Only you can see this list."
          />
          {follows.length === 0 ? (
            <Empty text="You don't follow any organizations yet. Follow one from Discover or its page." href="/discover" action="Find organizations" />
          ) : (
            <>
              <FollowedOrgList orgs={follows.map((f) => f.organization)} returnTo="/profile" />
              <SeeAll href="/following" total={followCount} shown={follows.length} label="organizations you follow" />
            </>
          )}
        </Card>

        <Card aria-labelledby="history-heading">
          <CardHeader
            title={<span id="history-heading">Giving history</span>}
            description="Only gifts our donation partner confirms are marked Paid. Every.org emails the tax receipt for each paid gift."
          />
          {gifts.length === 0 ? (
            <Empty text="No gifts recorded yet." href="/dashboard#give" action="Record a donation" />
          ) : (
            <>
              <GiftList gifts={gifts.map((d) => toGiftRow(d, now))} />
              <SeeAll href="/donations" total={giftCount} shown={gifts.length} label="gifts" />
            </>
          )}
        </Card>
      </div>

      <Card aria-labelledby="area-heading">
        <CardHeader
          title={<span id="area-heading" className="scroll-mt-28">Your area</span>}
          description="Optional. Your feed gets a Near me tab with news from nonprofits serving it, and Discover can filter by it."
        />
        <AreaForm
          regions={regions}
          states={stateOptions()}
          current={
            user.areaRegion
              ? { kind: "region", regionSlug: user.areaRegion.slug }
              : user.areaCity && user.areaState
                ? { kind: "city", state: user.areaState, city: user.areaCity }
                : { kind: "none" }
          }
        />
      </Card>

      <Card aria-labelledby="privacy-heading">
        <CardHeader
          title={<span id="privacy-heading">Privacy</span>}
          description="Collective totals aren't live yet. Your choice is saved now and will apply when they are."
        />
        <PrivacyForm showNameInTotals={user.showNameInTotals} />
      </Card>

      <div className="grid items-start gap-(--space-section) lg:grid-cols-2">
        <Card aria-labelledby="account-heading">
          <CardHeader
            title={<span id="account-heading">Password</span>}
            description={methods.includes("password") ? undefined : "You sign in with Google, so there's no password here to change."}
          />
          {methods.includes("password") ? <PasswordForm /> : null}
          <div className={methods.includes("password") ? "mt-5 border-t pt-5" : undefined}>
            <SignOutButton />
          </div>
        </Card>

        <Card aria-labelledby="delete-heading">
          <CardHeader title={<span id="delete-heading">Delete account</span>} />
          <DeleteAccountForm hasPassword={methods.includes("password")} />
        </Card>
      </div>
    </div>
  );
}
