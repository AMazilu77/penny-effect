// Every page under /admin goes through this layout, which checks the user's
// role in the database (the proxy already filtered on the sign-in token).
import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminPage();
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide opacity-60">Admin</p>
      </header>
      {children}
    </main>
  );
}
