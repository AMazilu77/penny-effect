# Roadmap to MVP

Work top to bottom. Each milestone should leave the live site working. Check items off and update `docs/STATUS.md` as you go. D-numbers (D-001 etc.) refer to the private decisions log in `../penny-effect-docs/DECISIONS.md`.

## Milestone 0 — Stabilize (no new features) — ✅ done 2026-11-11 (two items deferred by owner)

- [x] Check current stable Next.js, React, NextAuth/Auth.js, Prisma, Tailwind versions and open security advisories; write the target versions into the private decisions log (`../penny-effect-docs/DECISIONS.md`) — done 2026-11-10, see D-007
- [x] Upgrade Next.js + React (follow official codemods/upgrade guides), align `eslint-config-next` — Next 16.4.6, React 19.3.1, Node 22
- [x] Decide NextAuth v4 vs Auth.js v5 (D-003) and do that migration if chosen — decided: stay on v4, patched to 4.24.15
- [x] Upgrade Prisma; regenerate client; confirm migrations apply cleanly to a fresh Neon branch — Prisma 7.10.1 + Neon adapter; all 6 migrations verified from empty on `development`
- [x] Delete `/api/debug/env` and its middleware exemption
- [x] Consolidate to one Prisma client (`@/lib/prisma`); delete `lib/db.ts`
- [x] Import `authOptions` only from `@/lib/auth`
- [x] Remove `ignoreDuringBuilds`; fix lint errors; remove `any`s in touched files — `pnpm lint` clean, no `any` left in `src/`
- [x] Add a test runner (Vitest) and CI (GitHub Actions: install, lint, typecheck, test, build)
- [ ] Separate dev/preview database from production (Neon branch); confirm Vercel env scoping — _deferred by owner. Local dev uses the Neon `development` branch; Vercel Preview still uses production._
- [ ] _Deferred:_ Migrate Neon project off Azure East US 2 (Neon has deprecated Azure regions)
- [x] Replace README with real setup instructions

## Milestone 1 — Honest foundation

- [ ] Migrate `Donation.amount Float` → `amountCents Int` + `currency`; add `status` (pending/completed/failed) and `externalId` for partner reference
- [ ] Unique constraint on `UserInterest(userId, categoryId)`; onboarding accepts only existing category IDs (zod)
- [ ] Remove the empty `UserLocation` upsert (location is out of scope)
- [ ] Middleware protects all signed-in routes
- [ ] Dashboard: real totals/history from the DB, or real empty states
- [ ] Inbox: real donation receipts only, or hide the route
- [ ] Remove `console.log` of user data
- [ ] Add Google sign-in

## Milestone 2 — Real nonprofits

- [ ] Choose nonprofit data source (D-002); add EIN/registry fields to `Organization`, plus `verifiedAt`
- [ ] Replace mock `/api/charities` with real search; wire Discover chips to category filtering
- [ ] Admin-only area (role on `User`) to add/verify organizations and post `NewsItem`s
- [ ] Seed script: safe, idempotent, never deletes in production

## Milestone 3 — Real giving

- [ ] Integrate the chosen donation partner (D-001): checkout for a single gift
- [ ] Record donation as pending on start; mark completed from partner confirmation (webhook or verified redirect) — never from client-side claims alone
- [ ] Receipts: link to partner receipt; show in history
- [ ] Crypto giving through the partner if supported
- [ ] Rate limiting on register, sign-in, donate

## Milestone 4 — Penny Jar

- [ ] Model: jar per user per cause/org, recurring intention amount + cadence, running tally, checkout threshold
- [ ] Weekly/monthly accrual (Vercel Cron) — tally only, no charges
- [ ] Nudge when threshold is reached; one-click checkout of the accumulated amount via the partner
- [ ] Show collective totals per cause ("everyone's pennies")

## Milestone 5 — Launch polish

- [ ] Brand pass using the Lorenz-attractor identity; mobile-first QA
- [ ] Privacy policy, terms, clear statement that donations are processed by the partner
- [ ] Error monitoring, basic analytics
- [ ] End-to-end real donation on production verified
