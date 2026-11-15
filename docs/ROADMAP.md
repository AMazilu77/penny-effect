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
- [ ] Separate dev/preview database from production (Neon branch); confirm Vercel env scoping — _deferred by owner. Local dev uses the Neon `development` branch; Vercel Preview still uses production._ Now a **blocking first item of Milestone 3** (steps there).
- [ ] _Deferred:_ Migrate Neon project off Azure East US 2 (Neon has deprecated Azure regions)
- [x] Replace README with real setup instructions

## Milestone 1 — Honest foundation

- [ ] Migrate `Donation.amount Float` → `amountCents Int` + `currency`; add `status` (pending/completed/failed) and `externalId` for partner reference — **add step done** (columns + backfill, app writes cents); remove step (drop `amount`, require `amountCents`) pending
- [x] Unique constraint on `UserInterest(userId, categoryId)`; onboarding accepts only existing category IDs (zod)
- [x] Remove the empty `UserLocation` upsert (location is out of scope) — upsert and "Enable location" button removed; table left in place
- [x] Middleware protects all signed-in routes — `src/proxy.ts` + `lib/protected-routes.ts` (tested)
- [x] Dashboard: real totals/history from the DB, or real empty states — paid vs "recorded, not yet paid" (D-011), causes followed, recent gifts
- [x] Inbox: real donation receipts only, or hide the route — hidden (page and nav links removed) until Milestone 3 receipts
- [x] Remove `console.log` of user data
- [x] Add Google sign-in — no automatic account linking; verified Google emails only

## Milestone 2 — Real nonprofits

- [x] Hide seeded placeholder news: the feed shows only `NewsItem`s with a `sourceUrl`, and the seed no longer invents headlines
- [x] Choose nonprofit data source (D-002); add EIN/registry fields to `Organization`, plus `verifiedAt` — Every.org (D-012); `ein`/`everyOrgId`/`everyOrgSlug`, `verifiedAt`/`verifiedById`, `status`, `User.role`, `CauseCategory.slug`, Highest Impact category (D-013)
- [x] Replace mock `/api/charities` with real search; wire Discover chips to category filtering — `/discover?category=<slug>&q=`, only verified orgs; `/charities` redirects
- [x] Admin-only area (role on `User`) to add/verify organizations and post `NewsItem`s — `/admin`: Every.org import/link/verify/hide/categories; news with a required source link (only for active, verified orgs)
- [x] Seed script: safe, idempotent, never deletes in production — upserts only, refuses `VERCEL_ENV=production`, real nonprofits with EINs, no news

## Milestone 3 — Real giving

- [ ] **BLOCKING: separate Vercel Preview database before any real payment testing.** Until this is checked off, no payment test (staging or real) runs on a Vercel Preview, and checkout stays off on Preview. Why: as of 2026-11-14 one `DATABASE_URL` in Vercel is scoped to **Production, Preview and Development**, so every PR preview reads and writes the **production** database, and `vercel env pull` would write the production URL into `.env.local`. A staging webhook hitting a preview would mark test-card gifts as Paid in production. Owner steps (about 20 minutes):
  1. **Neon → Branches → Create branch.** Name `preview`, parent = the production branch. If Neon offers **Schema only**, choose it (no user data copied). Otherwise it copies real users: treat it like production (don't share its URL, don't paste rows).
  2. On the new branch, click **Connect** and copy two strings: **pooled** (host contains `-pooler`) and **direct** (no `-pooler`). Put them in your password manager only, never in chat, a PR or an issue.
  3. **Vercel → penny-effect → Settings → Environment Variables → `DATABASE_URL` → Edit:** untick **Preview** and **Development**, leaving **Production** only. Save.
  4. **Add `DATABASE_URL`** with the `preview` **pooled** string, environment **Preview** only. Add **`DIRECT_URL`** with the `preview` **direct** string, **Preview** only.
  5. Point Vercel **Development** (used by `vercel env pull` / `vercel dev`) at the Neon `development` branch: add `DATABASE_URL` (pooled) for **Development** only. Then edit the existing Development-only `DIRECT_URL` and check it is the `development` branch's direct string (not production's).
  6. **Migrate the preview branch** from your laptop (preview builds never migrate, by design): `DIRECT_URL='<preview direct string>' pnpm prisma migrate deploy`. It should end with "All migrations have been successfully applied". Repeat this after every merged PR that adds a migration, until we automate it.
  7. If you want sample organizations there: `DIRECT_URL='<preview direct>' DATABASE_URL='<preview pooled>' pnpm prisma db seed`. Never against production.
  8. **Vercel → Deployments →** latest Preview → **⋯ → Redeploy** (untick "Use existing Build Cache"). Env changes only apply to new deployments.
  9. **Check:** on that preview, sign up with a throwaway address (e.g. `preview-check+1@<your domain>`). In the Neon SQL Editor, run `SELECT count(*) FROM "User" WHERE email = 'preview-check+1@<your domain>';` on **`preview`** (expect 1) and on **production** (expect 0).
  10. Tell me it's done. I'll then update the README, M3-PLAN ("Why not Vercel Preview?") and the env table, and add the preview-branch migration to the merge checklist.
  - Also worth checking while you're there: `NEXTAUTH_URL` is shared by Preview and Production. If it is the production URL, sign-in on a preview redirects to production. Leaving it unset for **Preview** lets NextAuth use the preview's own URL. Google sign-in on previews would also need the preview URL as an authorized redirect, so email sign-in is enough there.
- [ ] Integrate the chosen donation partner (D-001): checkout for a single gift
- [ ] Align gift limits with Every.org (currently $1 min / $10,000 max in `src/lib/money.ts`; D-011)
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
- [ ] Clear test donations and test accounts from production (owner's test data from Milestones 0–1, incl. duplicate PENDING donations recorded before the idempotency fix); confirm before deleting, never via the seed script
- [ ] End-to-end real donation on production verified
