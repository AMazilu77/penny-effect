// app/profile/page.tsx: the signed-in user's own profile (Milestone 3.5).
// Private: only the signed-in user ever sees it (public profiles are out of
// scope, charter §6). Every list here comes from their own rows; no sample data.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BRAND_NAME } from "@/lib/brand";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { PROFILE_PREVIEW, initials, signInMethodLabel, signInMethods } from "@/lib/profile";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { buttonPrimary } from "@/components/ui/buttons";
import { SignOutButton } from "@/components/SignOutButton";
import { FollowNotice } from "@/components/FollowButton";
import { FollowedOrgList, GiftList, SeeAll } from "@/components/dashboard/lists";
import { DetailsForm } from "./DetailsForm";
import { PrivacyForm } from "./PrivacyForm";
import { CausesForm } from "./CausesForm";

export const dynamic = "force-dynamic";
export const metadata = { title: `Your profile | ${BRAND_NAME}` };

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

  const [user, providers, categories, interests, follows, followCount, gifts, giftCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      // The password hash is read only to say whether one exists; it never leaves this function.
      select: { name: true, email: true, image: true, bio: true, showNameInTotals: true, passwordHash: true },
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
      select: { id: true, amountCents: true, currency: true, status: true, createdAt: true, organization: { select: { name: true } } },
    }),
    prisma.donation.count({ where: { userId } }),
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
  // Default picture: the Google avatar for Google sign-ins, otherwise initials.
  const pictureSrc = methods.includes("google") && user.image?.startsWith("https://") ? user.image : null;
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
          <DetailsForm name={user.name ?? ""} bio={user.bio ?? ""} />
        </Card>

        <Card aria-labelledby="causes-heading">
          <CardHeader
            title={<span id="causes-heading">Your causes</span>}
            description="Your feed shows news from these under My causes."
          />
          <CausesForm categories={categories} selected={interests.map((i) => i.categoryId)} />
        </Card>
      </div>

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
              <GiftList gifts={gifts} />
              <SeeAll href="/donations" total={giftCount} shown={gifts.length} label="gifts" />
            </>
          )}
        </Card>
      </div>

      <Card aria-labelledby="privacy-heading">
        <CardHeader
          title={<span id="privacy-heading">Privacy</span>}
          description="Collective totals aren't live yet. Your choice is saved now and will apply when they are."
        />
        <PrivacyForm showNameInTotals={user.showNameInTotals} />
      </Card>

      <Card aria-labelledby="account-heading">
        <CardHeader title={<span id="account-heading">Account</span>} />
        <SignOutButton />
      </Card>
    </div>
  );
}
