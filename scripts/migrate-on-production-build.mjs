// Runs `prisma migrate deploy` during Vercel PRODUCTION builds only.
//
// Called from `pnpm build`. Vercel sets VERCEL_ENV to "production",
// "preview" or "development". Locally and in CI it is unset, so this does
// nothing there.
//
// Why during the build: the migration finishes before the new deployment
// goes live, while the previous deployment keeps serving traffic. That is
// only safe for ADDITIVE migrations (new tables/columns the old code
// ignores). Removing or retyping columns must happen in a later PR, once no
// live code uses them ("add-then-remove"; see CLAUDE.md).
//
// `migrate deploy` only applies pending migrations; it never resets data.
import { execFileSync } from "node:child_process";

const env = process.env.VERCEL_ENV;

if (env !== "production") {
  console.log(`[migrate] VERCEL_ENV=${env ?? "(unset)"}: skipping prisma migrate deploy`);
  process.exit(0);
}

// Migrations need Neon's direct (non-pooled) connection; prisma.config.ts
// reads it from DIRECT_URL. Fail the build rather than ship code without the
// schema it needs. A failed build leaves the previous deployment live.
if (!process.env.DIRECT_URL) {
  console.error(
    "[migrate] DIRECT_URL is not set for this Production build. Add Neon's direct " +
      "(non-pooled) production connection string in Vercel → Settings → Environment " +
      "Variables, scoped to Production only.",
  );
  process.exit(1);
}

console.log("[migrate] Production build: running prisma migrate deploy");
// Throws (and so fails the build) if any migration fails.
execFileSync("prisma", ["migrate", "deploy"], { stdio: "inherit" });
