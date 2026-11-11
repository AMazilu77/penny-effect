// Prisma CLI configuration (migrate, generate, seed, studio).
// Docs: https://www.prisma.io/docs/orm/reference/prisma-config-reference
import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Once this file exists, the Prisma CLI stops auto-loading `.env`, so we load
// env files ourselves, in the same order Next.js uses: `.env.local` first,
// then `.env`. Node's `process.loadEnvFile` never overwrites a variable that is
// already set, so the first file to define a variable wins, and real
// environment variables (e.g. on Vercel, where neither file exists) win over both.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Used by CLI commands that talk to the database (migrate, studio, db pull).
  // Migrations need Neon's *direct* connection, not the pooled one.
  // `prisma generate` doesn't need it, so builds without DIRECT_URL still work.
  datasource: {
    url: process.env.DIRECT_URL,
  },
  migrations: {
    path: "prisma/migrations",
    // Wipes organizations, categories and news before re-seeding. Never run against production.
    seed: "tsx prisma/seed.ts",
  },
});
