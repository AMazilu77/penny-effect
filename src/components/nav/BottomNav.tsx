"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Compass, PlusCircle, Shield, User } from "lucide-react";

// Declared outside BottomNav: a component defined inside another component is
// re-created on every render, which resets its state and wastes work.
function Tab({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition ${active ? "bg-gray-900/80   " : " -400 hover:   hover:bg-gray-800/50"}`}>
      <div className="h-5 w-5">{icon}</div>
      <span className="text-[11px] leading-none">{label}</span>
    </Link>
  );
}

export function BottomNav({ onOpenActions }: { onOpenActions: () => void }) {
  const pathname = usePathname();
  const isActive = (p: string) => pathname === p;
  // Only a convenience link: /admin itself checks the role in the database.
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-neutral-950/80 backdrop-blur">
      <div className={`mx-auto max-w-3xl px-3 py-2 grid gap-1 ${isAdmin ? "grid-cols-5" : "grid-cols-4"}`}>
        <Tab href="/feed" label="Feed" icon={<Home className="h-5 w-5" />} active={isActive("/feed")} />
        <Tab href="/discover" label="Discover" icon={<Compass className="h-5 w-5" />} active={isActive("/discover")} />
        <button onClick={onOpenActions} className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl  -100 hover:bg-gray-800/50">
          <PlusCircle className="h-6 w-6" />
          <span className="text-[11px] leading-none">Actions</span>
        </button>
        <Tab href="/dashboard" label="Dashboard" icon={<User className="h-5 w-5" />} active={isActive("/dashboard")} />
        {isAdmin && (
          <Tab href="/admin" label="Admin" icon={<Shield className="h-5 w-5" />} active={pathname.startsWith("/admin")} />
        )}
      </div>
    </nav>
  );
}
