// Finds a user by email, ignoring case (see src/lib/email.ts).
import { prisma } from "@/lib/prisma";
import { normalizeEmail, pickAccountForEmail } from "@/lib/email";

/**
 * The id of the account for this email, or null when there's none or the
 * match is ambiguous.
 *
 * Plain parameterized SQL on purpose: Prisma's `mode: "insensitive"` uses
 * ILIKE, where "_" and "%" in an email would act as wildcards.
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const candidates = await prisma.$queryRaw<{ id: string; email: string | null }[]>`
    SELECT "id", "email" FROM "User" WHERE lower(trim("email")) = ${normalized} LIMIT 5`;
  return pickAccountForEmail(candidates, email)?.id ?? null;
}
