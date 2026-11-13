// Post news from organizations, each linked to where they published it.
import { requireAdminPage } from "@/lib/admin";
import { safeExternalUrl } from "@/lib/feed";
import { prisma } from "@/lib/prisma";
import { Flash } from "../Flash";
import { removeNews } from "./actions";
import { NewsForm } from "./NewsForm";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const button = "inline-flex items-center justify-center gap-2 rounded-control border bg-card px-3 py-1.5 text-sm font-semibold text-fg hover:bg-inset";
const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

export default async function AdminNewsPage({ searchParams }: Props) {
  await requireAdminPage();
  const params = await searchParams;

  const [orgs, items, unsourced] = await Promise.all([
    prisma.organization.findMany({
      where: { status: "ACTIVE", verifiedAt: { not: null } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.newsItem.findMany({
      where: { sourceUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, title: true, sourceUrl: true, createdAt: true, organization: { select: { name: true } } },
    }),
    prisma.newsItem.count({ where: { sourceUrl: null } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">News</h1>
      <Flash params={params} />

      <section className="space-y-3 rounded-card border bg-card p-(--space-card) shadow-sm">
        <h2 className="font-semibold">Post an update</h2>
        <p className="text-sm text-muted">
          Only post what the organization itself published, and link to it. Donors who follow the organization&apos;s
          causes see it in their feed with your title, your summary and a link to the original.
        </p>
        {orgs.length === 0 ? (
          <p className="text-sm text-warn">No active, verified organizations yet. Verify one first.</p>
        ) : (
          <NewsForm orgs={orgs} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Posted ({items.length})</h2>
        <ul className="divide-y rounded-card border bg-card shadow-sm">
          {items.map((item) => {
            const href = safeExternalUrl(item.sourceUrl);
            return (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-muted">
                    {item.organization.name} · {dateFormat.format(item.createdAt)}
                    {href && (
                      <>
                        {" · "}
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-link underline">
                          source
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <form action={removeNews}>
                  <input type="hidden" name="newsItemId" value={item.id} />
                  <button className={button}>Remove</button>
                </form>
              </li>
            );
          })}
          {items.length === 0 && <li className="p-3 text-muted">Nothing posted yet.</li>}
        </ul>
        {unsourced > 0 && (
          <p className="text-sm text-muted">
            {unsourced} old placeholder items without a source are hidden from the feed and will be deleted in the
            Milestone 5 cleanup.
          </p>
        )}
      </section>
    </div>
  );
}
