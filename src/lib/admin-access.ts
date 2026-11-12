// Who may use the admin area. Kept free of database and NextAuth calls so it
// can be unit-tested; src/lib/admin.ts feeds it real data.

export type AdminAccess =
  | { ok: true; userId: string }
  | { ok: false; reason: "signed-out" | "not-admin" };

/**
 * Decides admin access from the session's user id and the role currently in
 * the database (not the role in the sign-in token, which can be stale).
 * `dbRole` is undefined when the user no longer exists.
 */
export function decideAdminAccess(userId: string | null | undefined, dbRole: string | null | undefined): AdminAccess {
  if (!userId) return { ok: false, reason: "signed-out" };
  if (dbRole !== "ADMIN") return { ok: false, reason: "not-admin" };
  return { ok: true, userId };
}
