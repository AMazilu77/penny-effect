import { SectionCard } from "@/components/surface/SectionCard";


export default function DiscoverPage() {
return (
<div className="grid gap-4">
<SectionCard title="Discover Causes">
<p>Browse categories, trending orgs, and recommendations based on your interests.</p>
</SectionCard>
<div className="flex flex-wrap gap-2">
{["Animals","Oceans","Humanitarian","Education","Health","Environment"].map((c)=> (
<button key={c} className="px-3 py-1.5 rounded-full text-sm bg-white/10 hover:bg-white/20 border border-white/10">{c}</button>
))}
</div>
</div>
);
}