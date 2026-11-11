// Pages that require a signed-in user. `src/proxy.ts` redirects signed-out
// visitors on these paths (and anything under them) to /signin.
// API routes are not listed here: each handler checks the session itself.
export const PROTECTED_PREFIXES = ["/dashboard", "/feed", "/inbox", "/onboarding"] as const;

/** True for "/feed" and "/feed/anything", but not for look-alikes such as "/feedback". */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
