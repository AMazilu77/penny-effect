// app/following/page.tsx: every organization the signed-in user follows, with
// Unfollow buttons. The dashboard shows only the first few (DASHBOARD_PREVIEW).
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BRAND_NAME } from "@/lib/brand";
import { VISIBLE_ORGANIZATION_WHERE } from "@/lib/organizations";
import { Card, CardHeader } from "@/components/ui/Card";
import { buttonPrimary } from "@/components/ui/buttons";
import { FollowNotice } from "@/components/FollowButton";
import { FollowedOrgList } from "@/components/dashboard/lists";

export const dynamic = "force-dynamic";
export const metadata = { title: `Organizations you follow | ${BRAND_NAME}` };

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/signin?callbackUrl=%2Ffollowing");

  // Only organizations users can see (a hidden one reappears here if it's unhidden).
  const follows = await prisma.organizationFollow.findMany({
    where: { userId, organization: VISIBLE_ORGANIZATION_WHERE },
    orderBy: { organization: { name: "asc" } },
    select: { organization: { select: { id: true, name: true, everyOrgSlug: true, logoUrl: true } } },
  });
  const params = await searchParams;

  return (
    <div className="space-y-(--space-section)">
      <p>
        <Link href="/dashboard" className="font-medium text-link underline">
          ← Dashboard
        </Link>
      </p>
      <FollowNotice value={params.notice} />
      <Card>
        <CardHeader
          as="h1"
          title={`Organizations you follow (${follows.length})`}
          description="Their updates appear in your feed under Following. Only you can see this list."
        />
        {follows.length === 0 ? (
          <Card level="inset" as="div">
            <p>You don&apos;t follow any organizations yet. Follow one from Discover or its page.</p>
            <Link href="/discover" className={`${buttonPrimary} mt-3`}>
              Find organizations
            </Link>
          </Card>
        ) : (
          <FollowedOrgList orgs={follows.map((f) => f.organization)} returnTo="/following" />
        )}
      </Card>
    </div>
  );
}
