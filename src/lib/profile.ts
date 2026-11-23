// The private profile page (Milestone 3.5): validation rules for what a user
// can change about themselves, plus small display helpers. Pure and
// unit-tested; the route handlers in src/app/api/profile apply them.
import { z } from "zod";

/** Longest display name, in characters. */
export const NAME_MAX = 60;
/** Longest bio, in characters (the live counter on the page uses the same count). */
export const BIO_MAX = 500;

/**
 * Characters as a person counts them: an emoji is one, not two. Used by both
 * the live counter in the browser and the server check, so they always agree.
 */
export function charCount(text: string): number {
  return Array.from(text).length;
}

// Invisible or layout-changing characters nobody types on purpose: ASCII and
// C1 control characters (but not tab or newline), zero-width characters, and
// bidirectional overrides, which can make text display differently from
// what it contains.
const INVISIBLE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** A display name as stored: one line, single spaces, trimmed. */
export function normalizeName(raw: string): string {
  return raw.replace(/\r\n?|\n/g, " ").replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
}

/**
 * A bio as stored: plain text, Unix newlines, no invisible characters, at
 * most one blank line in a row, trimmed. It is never rendered as HTML or
 * markdown; React escapes it on output.
 */
export function normalizeBio(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(INVISIBLE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Raw input is capped well above the limits before normalizing, so a huge
// body can't make the server do much work.
const nameField = z
  .string()
  .max(1000)
  .transform(normalizeName)
  .refine((name) => name.length > 0, "Enter a display name.")
  .refine((name) => charCount(name) <= NAME_MAX, `Keep your name to ${NAME_MAX} characters.`);

const bioField = z
  .string()
  .max(10_000, `Keep your bio to ${BIO_MAX} characters.`)
  .transform(normalizeBio)
  .refine((bio) => charCount(bio) <= BIO_MAX, `Keep your bio to ${BIO_MAX} characters.`)
  // An empty bio is stored as "no bio".
  .transform((bio) => (bio === "" ? null : bio));

/**
 * Body of PATCH /api/profile. Every field is optional (each section of the
 * page saves on its own), but at least one must be sent. Strict: unknown
 * keys such as `userId` or `email` are refused, never silently ignored. The
 * user is always the one signed in, and the email can't be changed here.
 */
export const profileUpdateSchema = z
  .strictObject({
    name: nameField.optional(),
    bio: bioField.nullable().optional(),
    showNameInTotals: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), "Nothing to update.");

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

/** The first validation message, for `{ error }`. Our own messages are safe to show. */
export function firstIssue(error: z.ZodError, fallback = "Invalid request."): string {
  return error.issues[0]?.message ?? fallback;
}

export type SignInMethod = "password" | "google";

/**
 * How this user signs in: a password (credentials), Google, or both. Accounts
 * are never linked automatically, so "both" only happens if it was set up by
 * hand. Unknown OAuth providers are ignored.
 */
export function signInMethods(hasPassword: boolean, providers: readonly string[]): SignInMethod[] {
  const methods: SignInMethod[] = [];
  if (hasPassword) methods.push("password");
  if (providers.includes("google")) methods.push("google");
  return methods;
}

const METHOD_LABELS: Record<SignInMethod, string> = {
  password: "Email and password",
  google: "Google",
};

export function signInMethodLabel(methods: readonly SignInMethod[]): string {
  return methods.length === 0 ? "Unknown" : methods.map((m) => METHOD_LABELS[m]).join(" and ");
}

/**
 * Up to two initials for the default avatar: "Ada Lovelace" → "AL",
 * "plato" → "P", no name → the email's first letter, otherwise "?".
 */
export function initials(name: string | null | undefined, email?: string | null): string {
  const words = normalizeName(name ?? "")
    .split(" ")
    .map((w) => Array.from(w.replace(/[^\p{L}\p{N}]/gu, ""))[0])
    .filter((c): c is string => Boolean(c));
  if (words.length > 0) {
    const picked = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
    return picked.join("").toUpperCase();
  }
  const first = Array.from((email ?? "").replace(/[^\p{L}\p{N}]/gu, ""))[0];
  return first ? first.toUpperCase() : "?";
}

/** How many gifts and followed organizations the profile shows before "See all (N)". */
export const PROFILE_PREVIEW = 5;
