// Every organization in the directory, including hidden and unverified ones.
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Flash } from "../Flash";
import { OrgBadges } from "../badges";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminOrganizationsPage({ searchParams }: Props) {
  await requireAdminPage();
  const params = await searchParams;

  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      ein: true,
      everyOrgId: true,
      isDisbursable: true,
      status: true,
      verifiedAt: true,
      categories: { select: { name: true }, orderBy: { name: "asc" } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Organizations ({orgs.length})</h1>
        <Link href="/admin/organizations/import" className="inline-flex items-center justify-center gap-2 rounded-control border bg-card px-3 py-1.5 text-sm font-semibold text-fg hover:bg-inset">
          Import from Every.org
        </Link>
      </div>
      <Flash params={params} />
      <ul className="divide-y rounded-card border bg-card shadow-sm">
        {orgs.map((org) => (
          <li key={org.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
            <Link href={`/admin/organizations/${org.id}`} className="font-medium underline-offset-2 hover:underline">
              {org.name}
            </Link>
            <OrgBadges org={org} />
            <span className="text-sm text-muted">
              {org.ein ? `EIN ${org.ein}` : "no EIN"}
              {org.categories.length > 0 && ` · ${org.categories.map((c) => c.name).join(", ")}`}
            </span>
          </li>
        ))}
        {orgs.length === 0 && <li className="p-3 text-muted">No organizations yet. Import one from Every.org.</li>}
      </ul>
    </div>
  );
}
