// Search Every.org and import nonprofits into our directory (D-012).
// The search runs on the server while this page renders (?q=...), so the
// Every.org key never reaches the browser.
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { createEveryOrgClient, EveryOrgError, type EveryOrgSearchResult } from "@/lib/everyorg/client";
import { prisma } from "@/lib/prisma";
import { Flash } from "../../Flash";
import { importOrganization } from "../actions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function search(q: string): Promise<EveryOrgSearchResult[] | "failed"> {
  try {
    return await createEveryOrgClient().searchNonprofits(q, { take: 25 });
  } catch (error) {
    if (error instanceof EveryOrgError) return "failed";
    throw error;
  }
}

export default async function ImportPage({ searchParams }: Props) {
  await requireAdminPage();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const results = q ? await search(q) : [];

  // Which results are already in the directory (matched by Every.org slug or EIN).
  const list = Array.isArray(results) ? results : [];
  const existing = list.length
    ? await prisma.organization.findMany({
        where: {
          OR: [
            { everyOrgSlug: { in: list.map((r) => r.slug) } },
            { ein: { in: list.flatMap((r) => (r.ein ? [r.ein] : [])) } },
          ],
        },
        select: { id: true, everyOrgSlug: true, ein: true },
      })
    : [];
  const existingFor = (r: EveryOrgSearchResult) =>
    existing.find((o) => o.everyOrgSlug === r.slug || (r.ein !== null && o.ein === r.ein));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Import from Every.org</h1>
      <Flash params={params} />
      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, e.g. Against Malaria"
          className="w-full max-w-md rounded-control border bg-inset px-3 py-2 text-fg"
        />
        <button className="inline-flex items-center justify-center gap-2 rounded-control border bg-card px-3 py-1.5 text-sm font-semibold text-fg hover:bg-inset">Search</button>
      </form>
      <p className="text-sm text-muted">
        Only nonprofits with an EIN that Every.org can send donations to can be verified. GiveWell&apos;s
        pass-through profiles (e.g. &quot;givewell-amf&quot;) have no EIN: import the charity&apos;s own profile instead.
      </p>

      {results === "failed" && (
        <p role="alert" className="rounded-control border border-danger bg-danger-soft p-3 text-sm text-danger">
          Couldn&apos;t reach Every.org, or it sent something unexpected. Try again.
        </p>
      )}
      {q && list.length === 0 && results !== "failed" && <p className="text-muted">No results.</p>}

      <ul className="divide-y rounded-card border bg-card shadow-sm">
        {list.map((r) => {
          const inDirectory = existingFor(r);
          return (
            <li key={r.slug} className="flex flex-wrap items-start justify-between gap-3 p-3">
              <div className="min-w-0 space-y-1">
                <div className="font-medium">{r.name}</div>
                <div className="text-sm text-muted">
                  {r.slug} · {r.ein ? `EIN ${r.ein}` : "no EIN"} · {r.isDisbursable ? "accepts donations" : "not disbursable"}
                  {r.profileUrl && (
                    <>
                      {" · "}
                      <a href={r.profileUrl} target="_blank" rel="noopener noreferrer" className="text-link underline">
                        Every.org profile
                      </a>
                    </>
                  )}
                </div>
                {r.description && <p className="text-sm text-fg">{r.description}</p>}
              </div>
              {inDirectory ? (
                <Link href={`/admin/organizations/${inDirectory.id}`} className="text-sm text-link underline">
                  In directory
                </Link>
              ) : (
                <form action={importOrganization}>
                  <input type="hidden" name="everyOrgSlug" value={r.slug} />
                  <button className="inline-flex items-center justify-center gap-2 rounded-control border bg-card px-3 py-1.5 text-sm font-semibold text-fg hover:bg-inset">Import</button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
