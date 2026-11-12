# Current Status — what's real, what's fake, what's broken

_Originally an audit of commit a70453a (2025-12-08). Updated 2026-11-11 at the end of Milestone 0 (stabilize). Update this file as items change._

## Summary

**Milestone 0 (stabilize) is done** except two items the owner deferred (separate preview database; moving Neon off Azure). Dependencies are current and patched (`pnpm audit --prod`: 0), lint/typecheck/build are clean, CI runs on every PR, and local development runs against a Neon `development` branch. No user-facing features changed.

The skeleton is better than it looks: routing, a real Postgres schema with migrations, working email/password auth, onboarding that saves interests, a feed driven by real DB queries, and a donation form that writes rows. What's missing is the part that makes it a product: real money movement, real charity data, and honest user-facing numbers. No crypto or smart-contract code exists yet, and Google sign-in is not implemented despite the project description saying so.

## Feature status

| Area | State | Notes |
|---|---|---|
| Sign up / sign in (email+password) | ✅ Real | bcrypt, NextAuth v4.24.15 Credentials, JWT sessions (staying on v4 — D-003). No rate limiting. |
| Google sign-in | ✅ Real | NextAuth Google provider; verified emails only; no automatic linking to an existing password account (shows a clear message instead). Works on production and localhost, not on preview URLs. |
| Onboarding (choose causes) | ✅ Real | Categories loaded from the DB; API accepts only existing category ids (zod, tested), uses `session.user.id`, saves in one transaction. One row per user+category (unique constraint). No location. |
| Organizations | 🟡 Seed only, schema ready | `prisma/seed.ts` — big-name orgs, no EIN, no verification. Seed wipes tables. Schema now has Every.org fields (`ein`, `everyOrgId`, `everyOrgSlug`, `isDisbursable`, …), admin verification (`verifiedAt`, `verifiedById`) and `status` (ACTIVE/HIDDEN), all unused until the admin tools land (Milestone 2, D-012). Server-side Every.org client (`src/lib/everyorg/`, zod-validated, fixture-tested) and category↔cause mapping (`src/lib/causes.ts`) exist; nothing calls them yet. |
| Charity search (`/api/charities`, `/charities`) | ❌ Mock | Three hardcoded fake charities with fake EINs. |
| Donate | 🟡 Records only | `/api/donate` records a PENDING donation in integer cents (`amountCents`, zod-validated, $1–$10,000, tested). No payment happens and the UI says so. Legacy `amount` float still written until the remove migration. Idempotent: the form sends a per-gift UUID; a double-click or retry returns the original donation (unique `(userId, idempotencyKey)`). |
| Dashboard | ✅ Real data | Given (COMPLETED only, $0 until Milestone 3), recorded-not-yet-paid (PENDING), causes followed, last 5 gifts; honest empty states. No dead links. |
| Feed | 🟡 Real query, real content possible | Pulls `NewsItem`s by followed categories, only ones with a `sourceUrl`. Admins post news at `/admin/news` (title, summary, required http(s) source link; only for active, verified organizations; removable). The old invented seeded headlines have no source and stay hidden. |
| Discover | ❌ Static | Category chips do nothing. Categories now have a `slug` for `?category=` links. A 9th, curated category "Highest Impact" exists (D-013), empty until an admin adds verified members. |
| Inbox | ⏸ Hidden | Fake page removed; returns to Milestone 3 with real partner receipts. |
| Penny Jar / round-ups | ❌ Missing | Core concept not started. |
| Crypto / smart contracts | ❌ Missing | Only `cryptoWalletBTC/ETH` text fields on `Organization`. No Tezos anything. |
| Admin | 🟡 Organizations done | `User.role` (USER/ADMIN), granted by hand in the Neon console. `/admin` is protected twice: the proxy (sign-in token) and a database role check in every page and Server Action (`src/lib/admin.ts`), so revoking is immediate; granting needs a fresh sign-in. Admins can search Every.org and import nonprofits (categories suggested from Every.org causes), link/refresh existing orgs by slug or EIN, verify (needs EIN + disbursable + active; re-linking to another EIN clears it), hide/show, and edit categories incl. Highest Impact. Users don't see the effect yet (Milestone 2, PR 5). News posting at `/admin/news`. |
| Tests | 🟡 Runner only | Vitest 5 + GitHub Actions CI (lint, typecheck, test, build on every PR). One wiring test; business-logic tests come with Milestone 1. |

## Technical debt and issues (priority order)

1. ~~**Outdated framework with security history.**~~ Now Next.js 16.4.6, React 19.3.1, next-auth 4.24.15 (D-007). Prisma 7.10.1 (D-007). `pnpm audit --prod` is clean. Remaining: ESLint 9 is marked unsupported upstream but Next's lint plugins don't support ESLint 10 yet (dev-only tool).
2. ~~**Public debug endpoint** `/api/debug/env`, explicitly exempted in middleware.~~ Deleted (Milestone 0).
3. **Money as `Float`**: half done. `amountCents Int`, `currency`, `status`, `externalId` added and backfilled; the app writes cents. Follow-up: make `amountCents` required, drop `amount` (rows with impossible legacy amounts are left NULL and must be handled there).
4. ~~**Fake data shown as real**~~ Dashboard uses real data; inbox hidden (Milestone 1).
5. ~~**Three ways to get a Prisma client**~~ Consolidated on `@/lib/prisma` (Milestone 0); the seed script uses it too.
6. ~~**`authOptions` imported from the route file**~~ All imports use `@/lib/auth`; the route file no longer re-exports it (Milestone 0).
7. ~~**Proxy protects only `/dashboard`.**~~ `src/proxy.ts` now protects dashboard, feed, inbox and onboarding (`lib/protected-routes.ts`, unit-tested). API handlers still check the session themselves.
8. ~~**Lint fails**~~ `pnpm lint` is clean (0 errors, 0 warnings) and there are no `any`s left in `src/`. Next 16 doesn't lint during `next build`, so CI must run `pnpm lint` separately.
9. **Unvalidated API input** in donate (onboarding now validated with zod). Several handlers still look the user up by email instead of using `session.user.id`.
10. ~~**`UserInterest`** has no unique constraint~~ Unique on `(userId, categoryId)`; migration removes exact duplicates first.
11. ~~**README** is the create-next-app default.~~ Real setup instructions + `.env.example` (Milestone 0).
12. Unused deps likely: zustand, TanStack Query (provider present?), react-hook-form, `Hero.tsx` mostly commented out.
13. Dev-only: 1 moderate advisory (`minimatch` <11 inside `eslint-plugin-import`, needs an upstream major bump). ESLint 9 is past upstream support until Next's lint plugins support ESLint 10.
14. Some Tailwind class strings in `BottomNav` are garbled (e.g. `" -400 hover:   hover:…"`), a leftover for the Milestone 5 brand pass.

## Infra

- Hosting: Vercel (live), Node 22. DB: Neon Postgres in Azure East US 2 (deprecated region — deferred move). Branches: production, `development` (local dev). Migrations from 2025-08 through 2025-11.
- CI: GitHub Actions (`.github/workflows/ci.yml`), no secrets or DB needed. Not yet a required check on `main` (owner setting).
- Vercel Preview deployments still use the **production** database (roadmap item 10, deferred).
