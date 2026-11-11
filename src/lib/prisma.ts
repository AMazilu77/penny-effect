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
  });
}

// In development, Next.js hot-reloads modules on every save. Without this,
// each reload would create a new client (and new connections). Stashing the
// client on `globalThis` lets reloads reuse it. In production modules load
// once, so this is skipped.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
