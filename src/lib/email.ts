// Email addresses are matched case-insensitively ("Alice@Example.com" and
// "alice@example.com" are the same account) and new ones are stored
// lowercased. Older rows may still contain uppercase letters, so lookups
// compare lowercased values instead of relying on the stored form.

/** Trimmed and lowercased, the form we store for new accounts. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Picks the account for a typed email from the accounts whose email matches
 * it case-insensitively. Normally there is at most one. If older data holds
 * two accounts that differ only by case, use the one typed exactly; otherwise
 * refuse (null) rather than guess which account the person meant.
 */
export function pickAccountForEmail<T extends { email: string | null }>(candidates: T[], typedEmail: string): T | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const typed = typedEmail.trim();
  return candidates.find((c) => c.email === typed) ?? null;
}
