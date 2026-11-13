"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle, Search, Shield } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Logo } from "@/components/brand/Logo";
import { buttonPrimary } from "@/components/ui/buttons";

const navLink = (active: boolean) =>
  `inline-flex items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold ${
    active ? "bg-accent-soft text-heading" : "text-fg hover:bg-inset"
  }`;

export function TopNav({ onOpenActions }: { onOpenActions: () => void }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  // Only a convenience link: /admin itself checks the role in the database.
  const isAdmin = session?.user?.role === "ADMIN";
  const isActive = (p: string) => pathname === p || pathname.startsWith(`${p}/`);

  const handleAuthClick = () => {
    if (status === "authenticated") signOut({ callbackUrl: "/" });
    else signIn();
  };

  const search = (
    <form action="/discover" method="get" role="search" className="relative w-full">
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        name="q"
        aria-label="Search organizations"
        placeholder="Search organizations…"
        maxLength={100}
        className="w-full rounded-control border bg-inset py-2 pl-9 pr-3 text-sm text-fg"
      />
    </form>
  );

  return (
    <header className="sticky top-0 z-30 border-b bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link href="/feed" className="me-2" aria-label="The Penny Effect, home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          <Link href="/feed" className={navLink(isActive("/feed"))}>Feed</Link>
          <Link href="/discover" className={navLink(isActive("/discover"))}>Discover</Link>
          <Link href="/dashboard" className={navLink(isActive("/dashboard"))}>Dashboard</Link>
          <Link href="/about" className={navLink(isActive("/about"))}>About</Link>
          {isAdmin && (
            <Link href="/admin" className={navLink(isActive("/admin"))}>
              <Shield aria-hidden className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>
        <div className="mx-2 hidden max-w-xs flex-1 lg:block">{search}</div>
        <div className="ms-auto hidden items-center gap-2 md:flex">
          {status === "authenticated" && (
            <button onClick={onOpenActions} className={buttonPrimary}>
              <PlusCircle aria-hidden className="h-4 w-4" />
              Give
            </button>
          )}
          <button onClick={handleAuthClick} className={navLink(false)}>
            {status === "authenticated" ? "Sign out" : "Sign in"}
          </button>
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">{search}</div>
    </header>
  );
}
