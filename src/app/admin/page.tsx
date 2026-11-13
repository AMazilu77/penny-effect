// Admin overview: where the organization directory stands (D-012).
// Layouts and pages render in parallel in the App Router, so this page
// checks the role itself too instead of relying on the layout alone.
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-control border bg-inset p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="text-2xl font-bold text-heading">{value}</div>
      {note && <div className="mt-1 text-sm text-muted">{note}</div>}
    </div>
  );
}

export default async function AdminPage() {
  await requireAdminPage();

  const [total, linked, verified, hidden] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { everyOrgId: { not: null } } }),
    prisma.organization.count({ where: { verifiedAt: { not: null }, status: "ACTIVE" } }),
    prisma.organization.count({ where: { status: "HIDDEN" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Organizations</h1>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="All" value={total} />
        <Stat label="Linked to Every.org" value={linked} />
        <Stat label="Verified and active" value={verified} />
        <Stat label="Hidden" value={hidden} />
      </section>
      <p className="text-sm text-muted">
        <Link href="/admin/organizations" className="text-link underline">Review organizations</Link> or{" "}
        <Link href="/admin/organizations/import" className="text-link underline">import from Every.org</Link>.
      </p>
    </div>
  );
}
