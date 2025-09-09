// // app/components/Hero.tsx
// "use client";
// import Link from "next/link";

// export default function Hero() {
//   return (
//     <section className="relative overflow-hidden rounded-2xl border border-[--outline] bg-[--surface] px-6 py-16 sm:px-10 sm:py-24">
//       {/* subtle gradient glow */}
//       <div
//         aria-hidden
//         className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(60%_50%_at_20%_10%,rgba(45,212,191,0.20),transparent_50%),radial-gradient(40%_40%_at_80%_20%,rgba(201,143,90,0.18),transparent_50%)]"
//       />

//       {/* lorenz-like line with css animation (no framer-motion) */}
//       <svg
//         aria-hidden
//         className="pointer-events-none absolute -right-28 -top-24 h-[520px] w-[520px] opacity-30 blur-[1px]"
//         viewBox="0 0 600 600"
//         fill="none"
//       >
//         <path
//           className="animate-[trace_6s_ease-in-out_infinite_alternate]"
//           d="M180 300c40-120 260-140 260-40s-160 80-220 140 60 160 160 80 40-180-40-220-140 40-160 80 20 60 60 40"
//           stroke="url(#lg)"
//           strokeWidth="1"
//           strokeLinecap="round"
//           strokeLinejoin="round"
//           style={{
//             strokeDasharray: 1200,
//             strokeDashoffset: 1200,
//           }}
//         />
//         <defs>
//           <linearGradient id="lg" x1="0" x2="1">
//             <stop offset="0%" stopColor="#2DD4BF" />
//             <stop offset="100%" stopColor="#C98F5A" />
//           </linearGradient>
//         </defs>
//       </svg>

//       <div className="relative z-10 max-w-2xl">
//         <h1 className="text-balance text-4xl font-semibold text-[--text] sm:text-6xl">
//           Small nudges. <span className="text-[--accent]">Big change.</span>
//         </h1>
//         <p className="mt-4 max-w-prose text-pretty text-[--muted]">
//           The Penny Effect turns micro-donations into meaningful impact. Give in seconds,
//           keep your privacy, and watch order emerge from tiny acts.
//         </p>

//         <div className="mt-8 flex flex-wrap gap-3">
//           <Link
//             href="/donate/anonymous"
//             className="rounded-xl border border-[--outline] bg-[--accent] px-5 py-3 font-medium text-black shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[--accent]"
//           >
//             Donate anonymously
//           </Link>
//           <Link
//             href="/signin"
//             className="rounded-xl border border-[--outline] bg-transparent px-5 py-3 font-medium text-[--text] backdrop-blur transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[--outline]"
//           >
//             Sign in for receipts
//           </Link>
//         </div>
//       </div>

//       {/* local keyframes (scoped) */}
//       <style jsx>{`
//         @keyframes trace {
//           from { stroke-dashoffset: 1200; }
//           to   { stroke-dashoffset: 0; }
//         }
//         @media (prefers-reduced-motion: reduce) {
//           :global(.animate-[trace_6s_ease-in-out_infinite_alternate]) {
//             animation: none !important;
//             stroke-dashoffset: 0 !important;
//           }
//         }
//       `}</style>
//     </section>
//   );
// }
