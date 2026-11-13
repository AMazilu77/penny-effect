// Every page under /admin goes through this layout, which checks the user's
// role in the database (the proxy already filtered on the sign-in token).
// Pages check again themselves: layouts and pages can render in parallel.
// (No <main> here: the app shell already provides one.)
import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/admin";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminPage();
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">Admin</p>
        <AdminNav />
      </header>
      {children}
    </div>
  );
}
