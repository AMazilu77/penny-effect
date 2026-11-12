// Every page under /admin goes through this layout, which checks the user's
// role in the database (the proxy already filtered on the sign-in token).
// Pages check again themselves: layouts and pages can render in parallel.
// (No <main> here: the app shell already provides one.)
import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/organizations/import", label: "Import from Every.org" },
  { href: "/admin/news", label: "News" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminPage();
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <p className="text-xs uppercase tracking-wide opacity-60">Admin</p>
        <nav className="flex flex-wrap gap-2 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg border border-white/15 px-3 py-1 hover:bg-white/10">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
