# The Penny Effect

Micro-giving for small, frequent gifts to verified nonprofits: "pennies that add up". Users pick causes, follow organizations' news, give small amounts, and see an honest running record of their impact. The logo is the Lorenz attractor: small inputs, large system effects.

> **Status: pre-MVP.** Sign-up, onboarding, the cause feed and donation *recording* work. **No real money moves yet.** Payments will go through a licensed donation partner; this app never holds or forwards donor funds. See [`docs/STATUS.md`](docs/STATUS.md) for what's real today and [`docs/ROADMAP.md`](docs/ROADMAP.md) for what's next.

## Stack

- [Next.js 16](https://nextjs.org/docs) (App Router, Turbopack) · React 19 · TypeScript
- Tailwind CSS 4 · lucide-react · framer-motion
- [NextAuth v4](https://next-auth.js.org/) (email + password, JWT sessions)
- [Prisma 7](https://www.prisma.io/docs) with the Neon driver adapter → [Neon](https://neon.tech/docs) Postgres
- Vitest · ESLint · GitHub Actions CI · hosted on Vercel

## Prerequisites

- **Node.js 22** (see `.nvmrc`; with nvm: `nvm use`)
- **pnpm 9**: run `corepack enable` once and the version pinned in `package.json` is used automatically
- A **Neon** Postgres database for development. Use a separate Neon *branch* (e.g. `development`), **never production**.

## Setup

```bash
git clone https://github.com/AMazilu77/penny-effect.git
cd penny-effect
pnpm install                 # also generates the Prisma client
cp .env.example .env.local   # then fill in the values (see below)
```

### Environment variables (`.env.local`, never committed)

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (host contains `-pooler`). Used by the app. |
| `DIRECT_URL` | Neon **direct** connection string (same branch, no `-pooler`). Used by Prisma CLI commands such as migrations. |
| `NEXTAUTH_SECRET` | Random secret for signing sessions: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` locally |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | *Optional.* Google OAuth client. The "Continue with Google" button appears only when both are set. The OAuth client needs the redirect URI `http://localhost:3000/api/auth/callback/google` for local use. |

Both database URLs must point at your **development** branch. Next.js and the Prisma CLI (via `prisma.config.ts`) both read `.env.local`.

### Database

```bash
pnpm prisma migrate deploy   # apply all migrations to your dev database
pnpm prisma db seed          # local only: 9 categories + 12 real nonprofits (no news); safe to re-run
```

The seed never deletes anything and refuses to run when `VERCEL_ENV=production`. It marks its organizations as verified so local pages look like a reviewed directory, so still never point it at production. ⚠️ `prisma migrate reset` **wipes the whole database**: never run it against production. In Prisma 7 it no longer re-seeds, so run `pnpm prisma db seed` after it.

## Run it

```bash
pnpm dev
```

Open http://localhost:3000, create an account at `/signup`, pick a few causes, and you'll land on the feed.

## Checks

CI runs all four on every pull request; run them locally before pushing:

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript, no build
pnpm test        # Vitest (pnpm test:watch while editing)
pnpm build       # production build
```

## Project layout

```
src/app/          pages and API routes (App Router)
src/components/   UI components
src/lib/          auth config (auth.ts), the Prisma client (prisma.ts), helpers
src/proxy.ts      route protection (Next 16's name for middleware)
prisma/           schema, migrations, seed
docs/             STATUS.md (current state), ROADMAP.md (plan)
```

## Database changes

1. Edit `prisma/schema.prisma`.
2. `pnpm prisma migrate dev --name describe_the_change` creates and applies a migration on your dev branch.
3. Commit the new folder under `prisma/migrations/`. Never edit a migration that has already been applied.

**Production** migrations run automatically: on Vercel **production** builds only, `pnpm build` runs `prisma migrate deploy` (`scripts/migrate-on-production-build.mjs`) before the new deployment goes live. Preview builds, CI and local builds skip it. Because the old deployment keeps serving traffic until the new one is ready, migrations must be **additive** ("add-then-remove"):

1. **Add:** new tables/columns (nullable or with defaults), plus any data backfill. Code may start using them.
2. **Remove:** in a *later* PR, once no deployed code reads the old column, drop it.

`migrate deploy` only applies pending migrations; it never resets data. Vercel's Instant Rollback doesn't roll back the database, so don't roll back to a deployment older than a "remove" migration.

### Before any schema change: checklist

Added after the 2026-11-11 incident: a migration passed on `development` but failed in production on data that `development` didn't have (lowercase legacy categories). Prisma 7 left it half applied, which blocked every deploy until it was resolved by hand. So, for **every** migration:

1. **Check production's data shape with a read-only query.** The owner runs it in the Neon SQL Editor on the **production** branch. Look for anything the change could trip on: duplicates under a new unique key, NULLs in a column becoming required, impossible values in a backfill, and rows created by older code. Return counts, not personal data.
2. **Reset `development` from production** so local testing sees real data. In the Neon console: **Branches → `development` → Reset from parent**.
   - This **replaces everything** on `development` with a fresh copy of production. Test users, sample organizations, and migrations applied from unmerged branches are all lost. Re-run `pnpm prisma db seed` afterwards if you want the sample directory back.
   - It copies **real user data** (emails, password hashes) into `development`. Treat that branch like production: don't share its connection string, don't paste rows anywhere, and don't log user records.
   - It only mirrors production if `development` was created from the production branch, which is how it was set up. The Neon console shows each branch's parent.
3. **Write the migration defensively:**
   - wrap it in `BEGIN; … COMMIT;`, because Prisma 7 does **not** roll back a failed migration;
   - use `IF NOT EXISTS` / guarded `DO` blocks so a retry can finish a half-applied database;
   - handle legacy rows explicitly, or stop with a clear `RAISE EXCEPTION` rather than guess or delete;
   - keep it add-then-remove.
4. **Apply it to `development`:** `pnpm prisma migrate deploy`, then `pnpm prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` should print "empty migration".
5. **Deploy-window check.** Run the *current* `main` code (or its queries) against the migrated `development` database: sign up, onboard, record a donation. The old deployment keeps serving while the new one builds.
6. **For risky changes, rehearse a failure:** temporarily add `SELECT 1/0;` before `COMMIT`, confirm nothing was left behind, then `prisma migrate resolve --rolled-back <name>` and remove it.
7. **In the PR,** say what the deploy log will show, and give the recovery steps if it fails: the last good deployment keeps serving, then `migrate resolve --rolled-back` (or the equivalent `UPDATE "_prisma_migrations" SET rolled_back_at = now() …`), fix, redeploy.
8. **After merge,** check the Vercel production deploy log for `Applying migration …` / "All migrations have been successfully applied", then check the live site.

## Logo and icons

The logo is one file, and the browser icons are generated from it.

| File | What it is |
|---|---|
| `public/brand/logo.svg` | **The logo** for light backgrounds (today: the Lorenz attractor in brand green). Shown in the top bar next to the wordmark "The Penny Effect". |
| `src/lib/brand.ts` | `LOGO_SRC` (the logo's path) and `BRAND_NAME` (the wordmark). |
| `src/app/favicon.ico`, `src/app/icon.png`, `src/app/apple-icon.png` | **Generated** browser tab, app and iPhone home-screen icons. Next.js serves them automatically. Don't edit them by hand. |
| `public/brand/lorenz-pattern.svg` | The faint Lorenz pattern used as decoration (watermarks, image placeholders). Not the logo; it stays when the logo changes. |

**To change the logo:**
1. Put the new logo in `public/brand/`, either as an SVG (best) or a PNG at least 512 px tall, made for a light background.
   - If you keep the name `logo.svg`, just overwrite the file.
   - If it's a PNG or has another name (e.g. `logo.png`), change `LOGO_SRC` in `src/lib/brand.ts` to match.
2. Regenerate the icons from the same file:
   ```bash
   pnpm icons                          # uses public/brand/logo.svg
   pnpm icons public/brand/logo.png    # or name the source file
   ```
   This rewrites `src/app/favicon.ico` (16/32/48 px), `src/app/icon.png` (512 px) and `src/app/apple-icon.png` (180 px on white).
3. Check it with `pnpm dev`: the top bar, the browser tab, and (optionally) "Add to Home Screen" on a phone. Commit the logo and the three generated icons together.

If the new logo has a separate small "mark" that works better at 16 px, run `pnpm icons` on that file instead. The icons and the top-bar logo don't have to be the same file.

## Deployment

Vercel deploys `main` to production and builds a preview for every pull request. Environment variables are set in the Vercel project settings.

## Contributing

Small pull requests, one concern each, with `lint`, `typecheck`, `test` and `build` passing. Coding agents: read [`CLAUDE.md`](CLAUDE.md) and [`AGENTS.md`](AGENTS.md) first.
