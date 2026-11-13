"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Compass, PlusCircle, Shield, User } from "lucide-react";

const tabClass = (active: boolean) =>
  `flex flex-col items-center justify-center gap-1 rounded-control px-2 py-2 text-sm font-medium ${
    active ? "bg-accent-soft text-heading" : "text-muted hover:bg-inset hover:text-fg"
  }`;

// Declared outside BottomNav: a component defined inside another component is
// re-created on every render, which resets its state and wastes work.
function Tab({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link href={href} className={tabClass(active)} aria-current={active ? "page" : undefined}>
      {icon}
      <span className="leading-none">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (p: string) => pathname === p;
  // Only a convenience link: /admin itself checks the role in the database.
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t bg-card md:hidden">
      <div className={`mx-auto grid max-w-3xl gap-1 px-2 py-2 ${isAdmin ? "grid-cols-5" : "grid-cols-4"}`}>
        <Tab href="/feed" label="Feed" icon={<Home aria-hidden className="h-5 w-5" />} active={isActive("/feed")} />
        <Tab href="/discover" label="Discover" icon={<Compass aria-hidden className="h-5 w-5" />} active={isActive("/discover")} />
        <Tab href="/dashboard#give" label="Give" icon={<PlusCircle aria-hidden className="h-5 w-5" />} active={false} />
        <Tab href="/dashboard" label="Dashboard" icon={<User aria-hidden className="h-5 w-5" />} active={isActive("/dashboard")} />
        {isAdmin && (
          <Tab href="/admin" label="Admin" icon={<Shield aria-hidden className="h-5 w-5" />} active={pathname.startsWith("/admin")} />
        )}
      </div>
    </nav>
  );
}
