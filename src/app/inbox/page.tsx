import { SectionCard } from "@/components/surface/SectionCard";


export default function InboxPage() {
return (
<div className="grid gap-4">
<SectionCard title="Inbox / Notifications">
<ul className="list-disc list-inside space-y-2 text-white/85">
<li>Receipt: $10 to Loggerhead Turtles (Aug 28)</li>
<li>New post from Coral Restoration Foundation</li>
<li>Alex followed "Reef Check"</li>
</ul>
</SectionCard>
</div>
);
}