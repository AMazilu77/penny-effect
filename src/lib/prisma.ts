// The one Prisma client for the app. Always `import { prisma } from "@/lib/prisma"`;
// never call `new PrismaClient()` in a route — each instance opens its own
// connection pool, which exhausts database connections on serverless hosts.
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 talks to the database through a "driver adapter". The Neon adapter
// uses Neon's serverless driver with the pooled DATABASE_URL.
// Nothing connects until the first query, so `next build` (which imports this
// module) still works without DATABASE_URL, e.g. in CI.
function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
    // Don't log every SQL query: noisy, and production logs end up in Vercel.
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Never read the legacy crypto wallet columns, even when a query returns
    // whole rows (e.g. `update` without `select`). A later migration drops
    // them, and the deployment still live during that migration must not
    // ask for them (add-then-remove; see CLAUDE.md). Removed with the columns.
    omit: { organization: { cryptoWalletBTC: true, cryptoWalletETH: true } },
  });
}

// In development, Next.js hot-reloads modules on every save. Without this,
// each reload would create a new client (and new connections). Stashing the
// client on `globalThis` lets reloads reuse it. In production modules load
// once, so this is skipped.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
