"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, PlusCircle, Bell, User } from "lucide-react";


export function BottomNav({ onOpenActions }: { onOpenActions: () => void }) {
const pathname = usePathname();
const isActive = (p: string) => pathname === p;


const Tab = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => (
<Link href={href} className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition ${isActive(href) ? "bg-gray-900/80 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800/50"}`}>
<div className="h-5 w-5">{icon}</div>
<span className="text-[11px] leading-none">{label}</span>
</Link>
);


return (
<nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-neutral-950/80 backdrop-blur">
<div className="mx-auto max-w-3xl px-3 py-2 grid grid-cols-5 gap-1">
<Tab href="/feed" label="Feed" icon={<Home className="h-5 w-5" />} />
<Tab href="/discover" label="Discover" icon={<Compass className="h-5 w-5" />} />
<button onClick={onOpenActions} className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl text-gray-100 hover:bg-gray-800/50">
<PlusCircle className="h-6 w-6" />
<span className="text-[11px] leading-none">Actions</span>
</button>
<Tab href="/inbox" label="Inbox" icon={<Bell className="h-5 w-5" />} />
<Tab href="/dashboard" label="Dashboard" icon={<User className="h-5 w-5" />} />
</div>
</nav>
);
}