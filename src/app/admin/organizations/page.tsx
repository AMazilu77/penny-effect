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
        <h1 className="text-2xl font-semibold">Organizations ({orgs.length})</h1>
        <Link href="/admin/organizations/import" className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10">
          Import from Every.org
        </Link>
      </div>
      <Flash params={params} />
      <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
        {orgs.map((org) => (
          <li key={org.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
            <Link href={`/admin/organizations/${org.id}`} className="font-medium underline-offset-2 hover:underline">
              {org.name}
            </Link>
            <OrgBadges org={org} />
            <span className="text-xs opacity-60">
              {org.ein ? `EIN ${org.ein}` : "no EIN"}
              {org.categories.length > 0 && ` · ${org.categories.map((c) => c.name).join(", ")}`}
            </span>
          </li>
        ))}
        {orgs.length === 0 && <li className="p-3 opacity-70">No organizations yet. Import one from Every.org.</li>}
      </ul>
    </div>
  );
}
