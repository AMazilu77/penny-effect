# Current Status — what's real, what's fake, what's broken

_Audit of commit a70453a (2025-12-08, "security patch - upgrade Next.js to 15.5.7"). Update this file as items change._

## Summary

The skeleton is better than it looks: routing, a real Postgres schema with migrations, working email/password auth, onboarding that saves interests, a feed driven by real DB queries, and a donation form that writes rows. What's missing is the part that makes it a product: real money movement, real charity data, and honest user-facing numbers. No crypto or smart-contract code exists yet, and Google sign-in is not implemented despite the project description saying so.

## Feature status

| Area | State | Notes |
|---|---|---|
| Sign up / sign in (email+password) | ✅ Real | bcrypt, NextAuth v4.24.15 Credentials, JWT sessions (staying on v4 — D-003). No rate limiting. |
| Google sign-in | ❌ Missing | Described in project blurb; not in `lib/auth.ts`. |
| Onboarding (choose causes) | 🟡 Works, unsafe | Creates new `CauseCategory` rows from any client-supplied string (no zod yet). No longer leaks raw error messages. Location "upsert" stores an empty row. |
| Organizations | 🟡 Seed only | `prisma/seed.ts` — big-name orgs, no EIN, no verification. Seed wipes tables. |
| Charity search (`/api/charities`, `/charities`) | ❌ Mock | Three hardcoded fake charities with fake EINs. |
| Donate | 🟡 Records only | `/api/donate` writes a `Donation` row. No payment happens. `amount` is `Float`, no min/max/validation. |
| Dashboard | ❌ Fake data | Metrics ("$742.50 given", "4 months streak") and activity are hardcoded for every user. |
| Feed | ✅ Real query | Pulls `NewsItem`s by followed categories. Content is seeded. Logs user data with `console.log`. |
| Discover | ❌ Static | Category chips do nothing. |
| Inbox | ❌ Fake data | Hardcoded receipts/notifications. |
| Penny Jar / round-ups | ❌ Missing | Core concept not started. |
| Crypto / smart contracts | ❌ Missing | Only `cryptoWalletBTC/ETH` text fields on `Organization`. No Tezos anything. |
| Admin | ❌ Missing | |
| Tests | ❌ None | No test runner configured. |

## Technical debt and issues (priority order)

1. ~~**Outdated framework with security history.**~~ Now Next.js 16.4.6, React 19.3.1, next-auth 4.24.15 (D-007). Prisma 7.10.1 (D-007). `pnpm audit --prod` is clean. Remaining: ESLint 9 is marked unsupported upstream but Next's lint plugins don't support ESLint 10 yet (dev-only tool).
2. ~~**Public debug endpoint** `/api/debug/env`, explicitly exempted in middleware.~~ Deleted (Milestone 0).
3. **Money as `Float`** in `Donation.amount`. Migrate to `amountCents Int` (+ currency).
4. **Fake data shown as real** on dashboard and inbox.
5. ~~**Three ways to get a Prisma client**~~ Consolidated on `@/lib/prisma` (Milestone 0). `prisma/seed.ts` keeps its own client (standalone script).
6. ~~**`authOptions` imported from the route file**~~ All imports use `@/lib/auth`; the route file no longer re-exports it (Milestone 0).
7. **Proxy (formerly middleware, `src/proxy.ts`) protects only `/dashboard`.** Feed redirects itself; onboarding, inbox don't.
8. ~~**Lint fails**~~ `pnpm lint` is clean (0 errors, 0 warnings) and there are no `any`s left in `src/`. Next 16 doesn't lint during `next build`, so CI must run `pnpm lint` separately.
9. **Unvalidated API input** in donate and onboarding (no zod); onboarding returns raw `err.message`.
10. **`UserInterest`** has no unique constraint on `(userId, categoryId)`; `skipDuplicates` does nothing there.
11. **README** is the create-next-app default.
12. Unused deps likely: zustand, TanStack Query (provider present?), react-hook-form, `Hero.tsx` mostly commented out.

## Infra

- Hosting: Vercel (live), Node 22. DB: Neon Postgres in Azure East US 2 (deprecated region — deferred move). Branches: production, `development` (local dev). Migrations from 2025-08 through 2025-11.
- No CI. No preview-DB strategy (check whether Vercel previews point at production DB — they should not).
