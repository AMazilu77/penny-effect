import { SectionCard } from "@/components/surface/SectionCard";


export default function FeedPage() {
return (
<div className="grid gap-4">
<SectionCard title="Personalized Feed">
<p>Updates from followed orgs, calls to action, and friends' activity.</p>
</SectionCard>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<SectionCard title="Loggerhead Turtles · 2h">
<div className="space-y-2">
<p>Beach hatchlings released last night. Volunteers needed for Friday sunrise patrol.</p>
<div className="flex gap-2">
<button className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500">Donate</button>
<button className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20">Follow</button>
<button className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20">Share</button>
</div>
</div>
</SectionCard>
<SectionCard title="Coral Restoration Foundation · 1d">
<p>New nursery frames installed. See our latest impact map.</p>
</SectionCard>
</div>
</div>
);
}