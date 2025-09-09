import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
// IMPORTANT: update this import path to wherever you export your authOptions
// e.g. "@/app/api/auth/[...nextauth]/auth-options" or "@/lib/auth"
import { authOptions } from "@/lib/auth"; // <- adjust to your project


export default async function Page() {
const session = await getServerSession(authOptions);
if (session) redirect("/feed");
redirect("/signin");
}


// "use client";

// import Link from "next/link";
// import { useSession, signOut } from "next-auth/react";
// import { useMemo, useState } from "react";

// /** ---------- Page ---------- **/
// export default function DashboardPage() {
//   const { status, data } = useSession();
//   const authed = status === "authenticated";

//   if (!authed) {
//     return (
//       <main className="mx-auto max-w-3xl p-6">
//         <div className="rounded-2xl border border-[--outline] bg-[--surface] p-8 text-center">
//           <h1 className="text-2xl font-semibold">You’re not signed in</h1>
//           <p className="mt-2 text-[--muted]">
//             Please sign in to view your dashboard and start donating.
//           </p>
//           <Link
//             href="/signin?callbackUrl=%2Fdashboard"
//             className="mt-6 inline-block rounded-xl border border-[--outline] bg-[--accent] px-5 py-3 font-medium text-black hover:brightness-110"
//           >
//             Sign in
//           </Link>
//         </div>
//       </main>
//     );
//   }

//   return (
//     <div className="relative">
//       {/* Subtle animated background */}
//       <AttractorBG />

//       <main className="mx-auto max-w-6xl p-6 lg:p-10">
//         <Header userName={data?.user?.name ?? data?.user?.email ?? "You"} />

//         {/* Stats */}
//         <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//           <StatCard
//             label="Impact score"
//             value="1,284"
//             hint="+12 today"
//             delay={0}
//           />
//           <StatCard
//             label="Total given"
//             value="$127.40"
//             hint="avg $0.23 / gift"
//             delay={70}
//           />
//           <StatCard
//             label="Active streak"
//             value="5 days"
//             hint="keep the ripple"
//             delay={140}
//           />
//           <StatCard
//             label="Causes backed"
//             value="7"
//             hint="3 climate, 2 health…"
//             delay={210}
//           />
//         </section>

//         {/* Quick donate + Activity */}
//         <section className="mt-8 grid items-start gap-6 lg:grid-cols-3">
//           <div className="lg:col-span-2">
//             <QuickDonate />
//             <RecentActivity />
//           </div>

//           <div className="space-y-6">
//             <PrivacyMode />
//             <TipsCard />
//           </div>
//         </section>
//       </main>
//     </div>
//   );
// }

// /** ---------- Header ---------- **/
// function Header({ userName }: { userName: string }) {
//   return (
//     <header className="flex items-center justify-between rounded-2xl border border-[--outline] bg-[--surface] p-4 pl-5">
//       <div className="flex items-center gap-3">
//         <LogoMark />
//         <div>
//           <h2 className="text-lg font-semibold leading-5">The Penny Effect</h2>
//           <p className="text-xs text-[--muted]">Small nudges. Big change.</p>
//         </div>
//       </div>

//       <div className="flex items-center gap-2">
//         <ThemeToggle />
//         <div className="mx-1 h-6 w-px bg-[--outline]" />
//         <div className="flex items-center gap-3">
//           <div
//             className="grid h-9 w-9 place-items-center rounded-full border border-[--outline] bg-white/5 text-sm font-semibold"
//             title={userName}
//           >
//             {userName.slice(0, 1).toUpperCase()}
//           </div>
//           <button
//             onClick={() => signOut()}
//             className="rounded-lg border border-[--outline] px-3 py-2 text-sm hover:bg-white/5"
//           >
//             Log out
//           </button>
//         </div>
//       </div>
//     </header>
//   );
// }

// /** ---------- Stat card ---------- **/
// function StatCard({
//   label,
//   value,
//   hint,
//   delay = 0,
// }: {
//   label: string;
//   value: string;
//   hint?: string;
//   delay?: number;
// }) {
//   return (
//     <div
//       className="animate-fade-in rounded-2xl border border-[--outline] bg-[--surface] p-5"
//       style={{ animationDelay: `${delay}ms` }}
//     >
//       <p className="text-xs uppercase tracking-wide text-[--muted]">{label}</p>
//       <div className="mt-2 flex items-baseline gap-2">
//         <span className="text-2xl font-semibold">{value}</span>
//         {hint && <span className="text-xs text-[--muted]">{hint}</span>}
//       </div>
//     </div>
//   );
// }

// /** ---------- Quick donate (demo UI only) ---------- **/
// function QuickDonate() {
//   const [amount, setAmount] = useState<number | "custom">(0.25);
//   const [custom, setCustom] = useState<string>("");
//   const [chain, setChain] = useState<"solana" | "base">("solana");
//   const [recipient, setRecipient] = useState("Clean Air Fund");

//   const displayAmount = useMemo(() => {
//     if (amount === "custom") {
//       const v = parseFloat(custom);
//       return isNaN(v) ? 0 : v;
//     }
//     return amount;
//   }, [amount, custom]);

//   return (
//     <div className="animate-fade-in rounded-2xl border border-[--outline] bg-[--surface] p-5" style={{ animationDelay: "120ms" }}>
//       <div className="flex items-center justify-between">
//         <h3 className="text-lg font-semibold">Quick donate</h3>
//         <span className="text-xs text-[--muted]">non-custodial • anonymous available</span>
//       </div>

//       <div className="mt-4 grid gap-4 sm:grid-cols-2">
//         {/* Amount chips */}
//         <div>
//           <p className="text-xs text-[--muted]">Amount</p>
//           <div className="mt-2 flex flex-wrap gap-2">
//             {([0.1, 0.25, 1, 5] as const).map((a) => (
//               <Chip
//                 key={a}
//                 active={amount !== "custom" && amount === a}
//                 label={`$${a}`}
//                 onClick={() => setAmount(a)}
//               />
//             ))}
//             <Chip
//               active={amount === "custom"}
//               label="Custom"
//               onClick={() => setAmount("custom")}
//             />
//           </div>
//           {amount === "custom" && (
//             <div className="mt-2">
//               <input
//                 inputMode="decimal"
//                 placeholder="Enter amount in USD"
//                 value={custom}
//                 onChange={(e) => setCustom(e.target.value)}
//                 className="w-full rounded-lg border border-[--outline] bg-transparent px-3 py-2 outline-none placeholder:text-[--muted]"
//               />
//             </div>
//           )}
//         </div>

//         {/* Chain + recipient */}
//         <div className="grid gap-3">
//           <div>
//             <p className="text-xs text-[--muted]">Chain</p>
//             <div className="mt-2 grid grid-cols-2 gap-2">
//               <SelectButton
//                 active={chain === "solana"}
//                 onClick={() => setChain("solana")}
//                 label="Solana"
//               />
//               <SelectButton
//                 active={chain === "base"}
//                 onClick={() => setChain("base")}
//                 label="Base (EVM)"
//               />
//             </div>
//           </div>

//           <div>
//             <p className="text-xs text-[--muted]">Recipient</p>
//             <select
//               value={recipient}
//               onChange={(e) => setRecipient(e.target.value)}
//               className="mt-2 w-full rounded-lg border border-[--outline] bg-transparent px-3 py-2 outline-none"
//             >
//               <option className="bg-[--surface]" value="Clean Air Fund">
//                 Clean Air Fund (allows anonymous)
//               </option>
//               <option className="bg-[--surface]" value="GiveDirectly">
//                 GiveDirectly
//               </option>
//               <option className="bg-[--surface]" value="Malaria Consortium">
//                 Malaria Consortium
//               </option>
//             </select>
//           </div>
//         </div>
//       </div>

//       <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
//         <div className="text-sm text-[--muted]">
//           Estimated fee: <span className="text-[--text]">{chain === "solana" ? "~$0.002" : "~$0.05"}</span>
//         </div>
//         <Link
//           href={`/donate/anonymous?chain=${chain}&to=${encodeURIComponent(
//             recipient
//           )}&amount=${displayAmount}`}
//           className="animate-glow rounded-xl border border-[--outline] bg-[--accent] px-5 py-3 font-medium text-black hover:brightness-110"
//         >
//           Get address & QR
//         </Link>
//       </div>
//     </div>
//   );
// }

// /** ---------- Recent activity (stubbed) ---------- **/
// function RecentActivity() {
//   const rows = [
//     { id: 1, to: "Clean Air Fund", chain: "Solana", amount: "$0.25", when: "2h ago", tx: "8t…Qm" },
//     { id: 2, to: "GiveDirectly", chain: "Base", amount: "$1.00", when: "1d ago", tx: "0x9a…f1" },
//     { id: 3, to: "Malaria Consortium", chain: "Solana", amount: "$0.10", when: "3d ago", tx: "5p…2K" },
//   ];

//   return (
//     <div className="mt-6 rounded-2xl border border-[--outline] bg-[--surface]">
//       <div className="flex items-center justify-between p-5">
//         <h3 className="text-lg font-semibold">Recent activity</h3>
//         <Link href="#" className="text-sm text-[--muted] hover:text-[--text]">
//           View all
//         </Link>
//       </div>
//       <div className="divide-y divide-[--outline]">
//         {rows.map((r) => (
//           <div key={r.id} className="grid grid-cols-2 items-center gap-2 p-5 sm:grid-cols-5">
//             <div className="font-medium">{r.to}</div>
//             <div className="text-sm text-[--muted]">{r.chain}</div>
//             <div className="text-sm">{r.amount}</div>
//             <div className="text-sm text-[--muted]">{r.when}</div>
//             <div className="text-sm">
//               <span className="rounded border border-[--outline] px-2 py-0.5 text-[--muted]">
//                 {r.tx}
//               </span>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// /** ---------- Privacy mode card (stub) ---------- **/
// function PrivacyMode() {
//   const [mode, setMode] = useState<"anonymous" | "private" | "identified">("anonymous");

//   return (
//     <div className="animate-fade-in rounded-2xl border border-[--outline] bg-[--surface] p-5" style={{ animationDelay: "180ms" }}>
//       <h3 className="text-lg font-semibold">Default privacy</h3>
//       <p className="mt-1 text-sm text-[--muted]">
//         Choose your default mode. You can override per donation.
//       </p>
//       <div className="mt-3 grid gap-2">
//         {([
//           { k: "anonymous", t: "Anonymous", d: "No PII; tx only" },
//           { k: "private", t: "Private", d: "You’re signed in but we don’t share PII with orgs" },
//           { k: "identified", t: "Identified", d: "Share name/email for receipts" },
//         ] as const).map((opt) => (
//           <label key={opt.k} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[--outline] p-3 hover:bg-white/5">
//             <input
//               type="radio"
//               name="privacy"
//               checked={mode === opt.k}
//               onChange={() => setMode(opt.k as any)}
//               className="mt-1"
//             />
//             <div>
//               <div className="font-medium">{opt.t}</div>
//               <div className="text-sm text-[--muted]">{opt.d}</div>
//             </div>
//           </label>
//         ))}
//       </div>
//     </div>
//   );
// }

// /** ---------- Tips card ---------- **/
// function TipsCard() {
//   return (
//     <div className="animate-fade-in rounded-2xl border border-[--outline] bg-[--surface] p-5" style={{ animationDelay: "240ms" }}>
//       <h3 className="text-lg font-semibold">Make it effortless</h3>
//       <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[--muted]">
//         <li>Pin the donate page in your wallet’s favorites.</li>
//         <li>Use small amounts—nudges compound over time.</li>
//         <li>Prefer Solana for tiny fees; use Base for EVM reach.</li>
//       </ul>
//       <Link href="/donate/anonymous" className="mt-4 inline-block rounded-lg border border-[--outline] px-3 py-2 text-sm hover:bg-white/5">
//         Go to anonymous donate
//       </Link>
//     </div>
//   );
// }

// /** ---------- Small UI bits ---------- **/
// function Chip({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
//   return (
//     <button
//       onClick={onClick}
//       className={[
//         "rounded-full border px-3 py-1.5 text-sm",
//         active
//           ? "border-[--accent] bg-[--accent] text-black"
//           : "border-[--outline] hover:bg-white/5",
//       ].join(" ")}
//     >
//       {label}
//     </button>
//   );
// }

// function SelectButton({
//   label,
//   active,
//   onClick,
// }: {
//   label: string;
//   active?: boolean;
//   onClick?: () => void;
// }) {
//   return (
//     <button
//       onClick={onClick}
//       className={[
//         "rounded-lg border px-3 py-2 text-sm",
//         active
//           ? "border-[--accent] bg-[--accent] text-black"
//           : "border-[--outline] hover:bg-white/5",
//       ].join(" ")}
//     >
//       {label}
//     </button>
//   );
// }

// /** ---------- Theme toggle (light/dark via data attribute) ---------- **/
// function ThemeToggle() {
//   const [isLight, setIsLight] = useState<boolean>(() => {
//     if (typeof window === "undefined") return false;
//     return document.documentElement.getAttribute("data-color-scheme") === "light";
//   });

//   return (
//     <button
//       className="rounded-lg border border-[--outline] px-3 py-2 text-sm hover:bg-white/5"
//       onClick={() => {
//         const next = !isLight;
//         setIsLight(next);
//         const el = document.documentElement;
//         if (next) el.setAttribute("data-color-scheme", "light");
//         else el.removeAttribute("data-color-scheme");
//       }}
//       title="Toggle theme"
//     >
//       {isLight ? "Light" : "Dark"}
//     </button>
//   );
// }

// /** ---------- Logo mark ---------- **/
// function LogoMark() {
//   return (
//     <div className="grid h-10 w-10 place-items-center rounded-xl border border-[--outline] bg-white/5">
//       <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
//         <path d="M5 12c2-6 12-7 12-2s-7 4-10 7 3 8 8 4 2-9-2-11-7 2-8 4 1 3 3 2" stroke="url(#g)" strokeWidth="1.5" strokeLinecap="round" />
//         <defs>
//           <linearGradient id="g" x1="0" x2="1">
//             <stop offset="0%" stopColor="#2DD4BF" />
//             <stop offset="100%" stopColor="#C98F5A" />
//           </linearGradient>
//         </defs>
//       </svg>
//     </div>
//   );
// }

// /** ---------- Background attractor (subtle) ---------- **/
// function AttractorBG() {
//   return (
//     <svg
//       aria-hidden
//       className="pointer-events-none absolute -right-20 -top-28 h-[560px] w-[560px] opacity-30 blur-[1px]"
//       viewBox="0 0 600 600"
//       fill="none"
//     >
//       <path
//         className="animate-[trace_7s_ease-in-out_infinite_alternate]"
//         d="M180 300c40-120 260-140 260-40s-160 80-220 140 60 160 160 80 40-180-40-220-140 40-160 80 20 60 60 40"
//         stroke="url(#lg)"
//         strokeWidth="1"
//         strokeLinecap="round"
//         style={{ strokeDasharray: 1200, strokeDashoffset: 1200 }}
//       />
//       <defs>
//         <linearGradient id="lg" x1="0" x2="1">
//           <stop offset="0%" stopColor="#2DD4BF" />
//           <stop offset="100%" stopColor="#C98F5A" />
//         </linearGradient>
//       </defs>
//     </svg>
//   );
// }
