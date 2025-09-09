"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, PlusCircle, Search } from "lucide-react";


export function TopNav({ onOpenActions }: { onOpenActions: () => void }) {
const pathname = usePathname();
const isActive = (p: string) => pathname === p;


return (
<header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/70 backdrop-blur">
<div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
<Link href="/feed" className="font-semibold tracking-tight">Penny Effect</Link>


{/* Desktop center search */}
<div className="hidden md:flex flex-1 justify-center">
<div className="w-full max-w-xl relative">
<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
<input
className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none text-sm placeholder:text-white/40"
placeholder="Search causes, orgs, posts…"
/>
</div>
</div>


{/* Desktop right actions */}
<div className="hidden md:flex items-center gap-2">
<button onClick={onOpenActions} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 px-3 py-2 text-sm font-medium text-white shadow">
<PlusCircle className="h-4 w-4" /> Donate / Action
</button>
<Link href="/inbox" className={`p-2 rounded-lg hover:bg-white/10 ${isActive("/inbox") ? "bg-white/10" : ""}`}>
<Bell className="h-5 w-5" />
</Link>
<Link href="/dashboard" className={`px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-sm ${isActive("/dashboard") ? "bg-white/10" : ""}`}>Dashboard</Link>
</div>
</div>


{/* Mobile page title + search */}
<div className="md:hidden px-4 pb-3 space-y-2">
<div className="relative">
<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
<input
className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none text-sm placeholder:text-white/40"
placeholder="Search causes, orgs, posts…"
/>
</div>
</div>
</header>
);
}