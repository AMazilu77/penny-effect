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
pnpm prisma db seed          # load sample categories, organizations and news
```

⚠️ The seed script **deletes** organizations, categories and news before re-creating them. Never run it, or `prisma migrate reset`, against production. `migrate reset` wipes the whole database; in Prisma 7 it no longer re-seeds, so run `pnpm prisma db seed` after it.

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

**Production** migrations are applied deliberately by the maintainer after the PR is merged, with production's *direct* connection string passed on the command line:

```bash
DIRECT_URL="<production direct connection string>" pnpm prisma migrate deploy
```

`migrate deploy` only applies new migrations; it never resets data. Prisma prints the target host first, so check it.

## Deployment

Vercel deploys `main` to production and builds a preview for every pull request. Environment variables are set in the Vercel project settings.

## Contributing

Small pull requests, one concern each, with `lint`, `typecheck`, `test` and `build` passing. Coding agents: read [`CLAUDE.md`](CLAUDE.md) and [`AGENTS.md`](AGENTS.md) first.
