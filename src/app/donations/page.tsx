// app/donations/page.tsx: all of the signed-in user's gifts, newest first,
// GIFTS_PER_PAGE at a time. The dashboard shows only the latest few.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BRAND_NAME } from "@/lib/brand";
import { GIFTS_PER_PAGE, pageCount, parsePage } from "@/lib/dashboard";
import { GIFT_ROW_SELECT, toGiftRow } from "@/lib/gift-rows";
import { Card, CardHeader } from "@/components/ui/Card";
import { buttonPrimary, buttonSecondary } from "@/components/ui/buttons";
import { GiftList } from "@/components/dashboard/lists";

export const dynamic = "force-dynamic";
export const metadata = { title: `Your gifts | ${BRAND_NAME}` };

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/signin?callbackUrl=%2Fdonations");

  const total = await prisma.donation.count({ where: { userId } });
  const pages = pageCount(total, GIFTS_PER_PAGE);
  const page = Math.min(parsePage((await searchParams).page), pages);

  const gifts = await prisma.donation.findMany({
    where: { userId },
    // id breaks ties so paging is stable when two gifts share a timestamp.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * GIFTS_PER_PAGE,
    take: GIFTS_PER_PAGE,
    select: GIFT_ROW_SELECT,
  });
  const now = new Date();

  return (
    <div className="space-y-(--space-section)">
      <p>
        <Link href="/dashboard" className="font-medium text-link underline">
          ← Dashboard
        </Link>
      </p>
      <Card>
        <CardHeader
          as="h1"
          title={`Your gifts (${total})`}
          description="Newest first. Only gifts Every.org confirms are marked Paid. Every.org emails each tax receipt."
        />
        {total === 0 ? (
          <Card level="inset" as="div">
            <p>No gifts recorded yet.</p>
            <Link href="/dashboard#give" className={`${buttonPrimary} mt-3`}>
              Record a donation
            </Link>
          </Card>
        ) : (
          <GiftList gifts={gifts.map((d) => toGiftRow(d, now))} />
        )}
        {pages > 1 && (
          <nav aria-label="Pages of gifts" className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {page > 1 ? (
              <Link href={`/donations?page=${page - 1}`} className={buttonSecondary}>
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted">
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link href={`/donations?page=${page + 1}`} className={buttonSecondary}>
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </Card>
    </div>
  );
}
