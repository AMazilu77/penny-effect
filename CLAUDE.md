# CLAUDE.md — The Penny Effect

Guidance for coding agents working in this repo. Read this first, then `docs/STATUS.md` (what actually exists today) and `docs/ROADMAP.md` (what to work on next).

**Private planning docs.** The MVP charter (`CHARTER.md`) and decisions log (`DECISIONS.md`) live in a separate private repo, `AMazilu77/penny-effect-docs`, checked out as a sibling folder: `../penny-effect-docs/`. Read both before starting a milestone. If that folder isn't there, ask the owner rather than guessing at scope. Never copy their contents into this public repo.

## What this is

The Penny Effect is a micro-giving web app: small donations ("pennies that add up") to vetted nonprofits, with a personal impact history and a feed of news from the causes a user follows. The logo is the Lorenz attractor — small inputs, large system effects. Crypto giving is part of the long-term vision, but **the MVP does not deploy smart contracts or custody funds** (see `../penny-effect-docs/DECISIONS.md`).

The owner is a solo developer who is new to React and Next.js and works mostly through agents. Explain non-obvious framework decisions briefly in PR/commit descriptions so the owner can follow along. Prefer boring, well-documented patterns over clever ones.

## Stack (after Milestone 0, Nov 2026)

- Next.js 16.4.6 (App Router, `src/app`, Turbopack), React 19.3.1, TypeScript 5.9, Node 22 (`.nvmrc`, `engines`)
- Tailwind CSS v4 (`@tailwindcss/postcss`), shadcn-style setup (`components.json`, `cva`, `clsx`, `tailwind-merge`), lucide-react, framer-motion
- NextAuth v4 with Prisma adapter, JWT sessions. Providers: Credentials (bcrypt) and Google (verified emails only, **no automatic account linking**; never enable `allowDangerousEmailAccountLinking`).
- Prisma 7 → Neon Postgres. Client is generated into `src/generated/prisma` (git-ignored; import it only via `@/lib/prisma`) and connects through the Neon driver adapter (`@prisma/adapter-neon`).
- react-hook-form + zod, TanStack Query, zustand (installed; mostly unused)
- Hosted on Vercel. Package manager: **pnpm** (pinned in `packageManager`).

Target versions and the reasoning live in D-007 (`../penny-effect-docs/DECISIONS.md`).

## Commands

```bash
pnpm install             # also runs `prisma generate` (postinstall)
pnpm dev                 # local dev server, http://localhost:3000
pnpm build               # prisma generate && next build
pnpm lint
pnpm typecheck           # tsc --noEmit
pnpm test                # vitest run (pnpm test:watch while editing)
pnpm prisma migrate dev  # create/apply a migration locally
pnpm prisma db seed      # runs prisma/seed.ts (WIPES orgs, categories, news first)
                         # Prisma 7: `migrate reset` no longer seeds automatically; run this after it
pnpm prisma studio
```

Required env vars (`.env.local`, never committed): `DATABASE_URL` (Neon pooled), `DIRECT_URL` (Neon direct, used by the Prisma CLI for migrations), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Locally both database URLs must point at the Neon `development` branch, never production. `prisma.config.ts` loads `.env.local` then `.env` for the Prisma CLI. Optional: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (the Google button appears only when both are set).

## Layout

```
src/app/            routes (App Router). Pages: /, about, signin, signup, onboarding/interests,
                    dashboard, feed, discover, charities, admin (inbox hidden until Milestone 3)
src/app/api/        route handlers: auth, register, donate, organizations, charities (mock),
                    onboarding/interests, user/status
src/components/     UI; nav/, surface/, actions/
src/lib/            auth.ts (authOptions), prisma.ts (the only Prisma client), utils.ts
src/types/          type declarations (next-auth.d.ts adds session.user.id)
src/proxy.ts        route protection (Next 16's name for middleware); protected paths in src/lib/protected-routes.ts
prisma/             schema.prisma, migrations/, seed.ts
docs/               STATUS.md, ROADMAP.md (charter + decisions are in ../penny-effect-docs, private)
```

## Rules

**Money and trust**
- This app never holds, pools, or forwards donor money itself. Real payments go through a licensed donation partner (see D-001 in `../penny-effect-docs/DECISIONS.md`). Don't build custodial wallets, smart contracts that hold funds, or a "balance" users can top up unless the charter is explicitly changed.
- Store money as integer **cents** (`Int`), never `Float`. The current `Donation.amount Float` is a known bug to migrate.
- Never show fabricated numbers to a signed-in user as if they were theirs. The dashboard shows real data: "given" counts only COMPLETED donations; PENDING ones are labelled "recorded, not yet paid" (D-011).
- Every organization shown must be a real, verifiable registered nonprofit (EIN/registry ID). No placeholder charities in production.

**Code**
- One Prisma client: import `prisma` from a single module (`@/lib/prisma`). Never `new PrismaClient()` inside a route.
- Import `authOptions` from `@/lib/auth`, not from the NextAuth route file.
- Validate every API request body with zod. Return consistent `{ error }` JSON with correct status codes; don't leak `err.message` to clients.
- Get the user id from the session (`session.user.id`), not by re-querying by email.
- Anything that records money must be idempotent: the client sends a key (UUID per gift) and the DB enforces uniqueness (see `src/lib/record-donation.ts`). Reuse this pattern for the Milestone 3 partner checkout and webhook (partner event id as the key).
- Server Components by default; add `"use client"` only where interactivity requires it.
- Use TypeScript properly — no new `any`. Fix existing ones when you touch the file.
- Don't add dependencies without a reason stated in the PR. Remove unused ones when sure.
- Don't re-enable `eslint.ignoreDuringBuilds` workarounds for new code; the goal is a clean lint and a clean build.

**Database**
- Schema changes go through `prisma migrate dev` with a descriptive migration name. Never edit an applied migration.
- The seed script deletes data. Never run it against the production database.
- Destructive migrations (dropping/retyping columns with data) need an explicit data-migration step and a note in the PR.
- Production migrations run automatically in Vercel **production** builds (`scripts/migrate-on-production-build.mjs`, needs `DIRECT_URL` in Vercel Production). So every migration must be safe while the *previous* deployment is still live: **add-then-remove**. Add columns/tables (nullable or defaulted) and backfill in one PR; drop old columns in a later PR. Never rename or retype a column in place.
- Wrap hand-written or data-changing migrations in `BEGIN; … COMMIT;`. Prisma 7 does **not** roll back a migration that fails halfway; it leaves it half applied and blocks every later deploy (P3009) until someone runs `prisma migrate resolve`. Prefer `IF NOT EXISTS` so a retry can finish a half-applied database.
- Don't assume production data matches the `development` branch or the seed. Production has rows created by older code (e.g. lowercase legacy categories from the pre-#14 onboarding). Any backfill or new unique constraint must handle duplicates, odd values and legacy rows explicitly.
- Vercel Preview deployments use the production database and do *not* migrate, so previews of schema-changing PRs may break. Test schema PRs locally against the Neon `development` branch.

**Security**
- No debug endpoints that expose env or config (the old `/api/debug/env` was removed in Milestone 0).
- Protect every signed-in route in `src/proxy.ts` (dashboard, feed, inbox, onboarding, admin), plus API handlers check the session themselves.
- Admin pages call `requireAdminPage()` and `/api/admin` handlers call `requireAdminApi()` (`@/lib/admin`), which re-check the role in the database. Never trust the role in the JWT alone.
- Never log secrets, tokens, password hashes, or full user records. Remove `console.log` of user data.
- Rate-limit `/api/register` and credential sign-in before launch.

**Workflow**
- Work milestone by milestone from `docs/ROADMAP.md`. Small PRs, one concern each.
- After a change: `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` must pass (CI runs all four on every PR). Add Vitest tests (`*.test.ts` next to the code) for business logic: amount handling, donation recording, onboarding.
- Update `docs/STATUS.md` when something moves from "fake/missing" to "real", and record any product or architecture choice in `../penny-effect-docs/DECISIONS.md` (commit it in that repo, not this one).
- If a task conflicts with the charter, stop and ask rather than quietly expanding scope.
