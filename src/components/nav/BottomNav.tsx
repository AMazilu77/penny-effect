"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, PlusCircle, User } from "lucide-react";

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

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto max-w-3xl px-3 py-2 grid grid-cols-4 gap-1">
        <Tab href="/feed" label="Feed" icon={<Home className="h-5 w-5" />} active={isActive("/feed")} />
        <Tab href="/discover" label="Discover" icon={<Compass className="h-5 w-5" />} active={isActive("/discover")} />
        <button onClick={onOpenActions} className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl  -100 hover:bg-gray-800/50">
          <PlusCircle className="h-6 w-6" />
          <span className="text-[11px] leading-none">Actions</span>
        </button>
        <Tab href="/dashboard" label="Dashboard" icon={<User className="h-5 w-5" />} active={isActive("/dashboard")} />
      </div>
    </nav>
  );
}
