// Pages that require a signed-in user. `src/proxy.ts` redirects signed-out
// visitors on these paths (and anything under them) to /signin.
// API routes are not listed here: each handler checks the session itself.
export const PROTECTED_PREFIXES = ["/dashboard", "/feed", "/inbox", "/onboarding", "/admin"] as const;

// Pages only admins may open. `src/proxy.ts` shows signed-in non-admins a
// 404, so the area doesn't advertise itself. The pages check the database
// role again (src/lib/admin.ts); the proxy only sees the sign-in token.
export const ADMIN_PREFIXES = ["/admin"] as const;

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** True for "/feed" and "/feed/anything", but not for look-alikes such as "/feedback". */
export function isProtectedPath(pathname: string): boolean {
  return matchesPrefix(pathname, PROTECTED_PREFIXES);
}

/** True for "/admin" and "/admin/anything", but not for "/administrator". */
export function isAdminPath(pathname: string): boolean {
  return matchesPrefix(pathname, ADMIN_PREFIXES);
}
