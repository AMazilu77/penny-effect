// The one Prisma client for the app. Always `import { prisma } from "@/lib/prisma"`;
// never call `new PrismaClient()` in a route — each instance opens its own
// connection pool, which exhausts database connections on serverless hosts.
import { PrismaClient } from "@prisma/client";

// In development, Next.js hot-reloads modules on every save. Without this,
// each reload would create a new client (and new connections). Stashing the
// client on `globalThis` lets reloads reuse it. In production modules load
// once, so this is skipped.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Don't log every SQL query: noisy, and production logs end up in Vercel.
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
