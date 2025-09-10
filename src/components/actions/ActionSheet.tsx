"use client";


export function ActionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
return (
<div className={`fixed inset-0 z-40 ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
<div
className={`absolute inset-0 bg-black/60 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
onClick={onClose}
/>
<div
className={`absolute left-1/2 -translate-x-1/2 bottom-4 w-[min(640px,92vw)] rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-2xl transition-all ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
role="dialog"
aria-modal
aria-label="Quick actions"
>
<h3 className="  font-semibold mb-3">Quick actions</h3>
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
{[{ label: "Donate", desc: "Give now to a cause" },{ label: "Pledge", desc: "Schedule a gift" },{ label: "Share", desc: "Spread the word" },{ label: "Volunteer", desc: "Offer time" }].map((a) => (
<button key={a.label} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-left p-3 transition">
<div className="  font-medium">{a.label}</div>
<div className="text-xs  /70">{a.desc}</div>
</button>
))}
</div>
<div className="flex justify-end mt-4">
<button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md bg-white/10 hover:bg-white/20  ">Close</button>
</div>
</div>
</div>
);
}