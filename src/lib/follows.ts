// Following organizations (Local plan L1, D-019). Pure rules, unit-tested;
// the Server Actions in src/app/actions/follow.ts apply them.
import { z } from "zod";

/** Where a Follow / Unfollow form may send the user back to. */
const RETURN_PATHS = [/^\/org\/[a-z0-9][a-z0-9-]{0,99}$/, /^\/discover$/, /^\/feed$/, /^\/dashboard$/, /^\/following$/];

/**
 * The page to return to after following, if it's one of ours; otherwise
 * /dashboard. Keeps the query string (e.g. Discover's filters) but never
 * allows another host, a protocol-relative URL or a fragment.
 */
export function safeReturnPath(raw: unknown): string {
  const fallback = "/dashboard";
  if (typeof raw !== "string" || raw.length > 300 || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return fallback;
  }
  let url: URL;
  try {
    url = new URL(raw, "https://penny.invalid");
  } catch {
    return fallback;
  }
  if (url.origin !== "https://penny.invalid" || !RETURN_PATHS.some((re) => re.test(url.pathname))) return fallback;
  return `${url.pathname}${url.search}`;
}

export const followForm = z.object({
  organizationId: z.string().trim().min(1).max(40).regex(/^[a-z0-9]+$/i),
});

/** Adds ?notice=<code> (or &notice=) to a return path. */
export function withNotice(path: string, notice: "followed" | "unfollowed" | "follow-limited" | "follow-unavailable"): string {
  const url = new URL(path, "https://penny.invalid");
  url.searchParams.set("notice", notice);
  return `${url.pathname}${url.search}`;
}

export const FOLLOW_NOTICES = {
  followed: "Following. Its updates appear in your feed under Following.",
  unfollowed: "Unfollowed.",
  "follow-limited": "Too many follow changes in a short time. Try again in a few minutes.",
  "follow-unavailable": "That organization isn't available to follow.",
} as const;

/** The message for a ?notice= value from a follow action, or null. */
export function followNotice(value: unknown): string | null {
  return typeof value === "string" && value in FOLLOW_NOTICES ? FOLLOW_NOTICES[value as keyof typeof FOLLOW_NOTICES] : null;
}
