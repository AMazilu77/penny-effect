# CLAUDE.md — The Penny Effect

Guidance for coding agents working in this repo. Read this first, then `docs/STATUS.md` (what actually exists today) and `docs/ROADMAP.md` (what to work on next).

**Private planning docs.** The MVP charter (`CHARTER.md`) and decisions log (`DECISIONS.md`) live in a separate private repo, `AMazilu77/penny-effect-docs`, checked out as a sibling folder: `../penny-effect-docs/`. Read both before starting a milestone. If that folder isn't there, ask the owner rather than guessing at scope. Never copy their contents into this public repo.

## What this is

The Penny Effect is a micro-giving web app: small donations ("pennies that add up") to vetted nonprofits, with a personal impact history and a feed of news from the causes a user follows. The logo is the Lorenz attractor — small inputs, large system effects. Crypto giving is part of the long-term vision, but **the MVP does not deploy smart contracts or custody funds** (see `../penny-effect-docs/DECISIONS.md`).

The owner is a solo developer who is new to React and Next.js and works mostly through agents. Explain non-obvious framework decisions briefly in PR/commit descriptions so the owner can follow along. Prefer boring, well-documented patterns over clever ones.

## Stack (Milestone 0 upgrades in progress, Nov 2026)

- Next.js 16.4.6 (App Router, `src/app`, Turbopack), React 19.3.1, TypeScript 5.9, Node 22 (`.nvmrc`, `engines`)
- Tailwind CSS v4 (`@tailwindcss/postcss`), shadcn-style setup (`components.json`, `cva`, `clsx`, `tailwind-merge`), lucide-react, framer-motion
- NextAuth v4 with Prisma adapter, **JWT sessions, Credentials provider only** (bcrypt). No Google provider yet despite the project description.
- Prisma 6 → Neon Postgres (`DATABASE_URL`)
- react-hook-form + zod, TanStack Query, zustand (installed; mostly unused)
- Hosted on Vercel. Package manager: **pnpm** (pinned in `packageManager`).

Target versions and the reasoning live in D-007 (`../penny-effect-docs/DECISIONS.md`). Prisma 7 is still to come in Milestone 0.

## Commands

```bash
pnpm install
pnpm dev                 # local dev server, http://localhost:3000
pnpm build               # prisma generate && next build --turbopack
pnpm lint
pnpm prisma migrate dev  # create/apply a migration locally
pnpm prisma db seed      # runs prisma/seed.ts (WIPES orgs, categories, news first)
pnpm prisma studio
```

Required env vars (`.env.local`, never committed): `DATABASE_URL` (Neon pooled), `DIRECT_URL` (Neon direct, used by the Prisma CLI for migrations), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Locally both database URLs must point at the Neon `development` branch, never production. `prisma.config.ts` loads `.env.local` then `.env` for the Prisma CLI. Google OAuth will add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

## Layout

```
src/app/            routes (App Router). Pages: /, about, signin, signup, onboarding/interests,
                    dashboard, feed, discover, charities, inbox
src/app/api/        route handlers: auth, register, donate, organizations, charities (mock),
                    onboarding/interests, user/status
src/components/     UI; nav/, surface/, actions/
src/lib/            auth.ts (authOptions), db.ts + prisma.ts (DUPLICATE clients — consolidate), utils.ts
src/proxy.ts        route protection (Next 16's name for middleware; currently only /dashboard)
prisma/             schema.prisma, migrations/, seed.ts
docs/               STATUS.md, ROADMAP.md (charter + decisions are in ../penny-effect-docs, private)
```

## Rules

**Money and trust**
- This app never holds, pools, or forwards donor money itself. Real payments go through a licensed donation partner (see D-001 in `../penny-effect-docs/DECISIONS.md`). Don't build custodial wallets, smart contracts that hold funds, or a "balance" users can top up unless the charter is explicitly changed.
- Store money as integer **cents** (`Int`), never `Float`. The current `Donation.amount Float` is a known bug to migrate.
- Never show fabricated numbers to a signed-in user as if they were theirs. The dashboard and inbox currently use hardcoded sample data — replace with real queries or clearly-labelled empty states.
- Every organization shown must be a real, verifiable registered nonprofit (EIN/registry ID). No placeholder charities in production.

**Code**
- One Prisma client: import `prisma` from a single module (`@/lib/prisma`). Never `new PrismaClient()` inside a route.
- Import `authOptions` from `@/lib/auth`, not from the NextAuth route file.
- Validate every API request body with zod. Return consistent `{ error }` JSON with correct status codes; don't leak `err.message` to clients.
- Get the user id from the session (`session.user.id`), not by re-querying by email.
- Server Components by default; add `"use client"` only where interactivity requires it.
- Use TypeScript properly — no new `any`. Fix existing ones when you touch the file.
- Don't add dependencies without a reason stated in the PR. Remove unused ones when sure.
- Don't re-enable `eslint.ignoreDuringBuilds` workarounds for new code; the goal is a clean lint and a clean build.

**Database**
- Schema changes go through `prisma migrate dev` with a descriptive migration name. Never edit an applied migration.
- The seed script deletes data. Never run it against the production database.
- Destructive migrations (dropping/retyping columns with data) need an explicit data-migration step and a note in the PR.

**Security**
- No debug endpoints that expose env or config (the old `/api/debug/env` was removed in Milestone 0).
- Protect every signed-in route in `src/proxy.ts` (dashboard, feed, inbox, onboarding), plus API handlers check the session themselves.
- Never log secrets, tokens, password hashes, or full user records. Remove `console.log` of user data.
- Rate-limit `/api/register` and credential sign-in before launch.

**Workflow**
- Work milestone by milestone from `docs/ROADMAP.md`. Small PRs, one concern each.
- After a change: `pnpm lint` and `pnpm build` must pass. Add tests for business logic (amount handling, donation recording, onboarding) once a test runner exists (Milestone 0).
- Update `docs/STATUS.md` when something moves from "fake/missing" to "real", and record any product or architecture choice in `../penny-effect-docs/DECISIONS.md` (commit it in that repo, not this one).
- If a task conflicts with the charter, stop and ask rather than quietly expanding scope.
