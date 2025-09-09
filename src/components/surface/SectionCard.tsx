import React from "react";


export function SectionCard({ title, children }: { title: string; children?: React.ReactNode }) {
return (
<div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-sm">
<h3 className="text-sm font-semibold text-white/90 mb-2">{title}</h3>
<div className="text-sm text-white/80">{children}</div>
</div>
);
}