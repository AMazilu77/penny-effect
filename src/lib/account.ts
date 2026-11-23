// Account settings on the profile page (Milestone 3.5): changing the password
// and deleting the account. The rules are pure and unit-tested; the database
// and bcrypt are passed in (src/lib/account-store.ts in the app, spies in
// tests).
import { z } from "zod";

/** Shortest new password. (Sign-up still accepts 6; raising that is a separate change.) */
export const PASSWORD_MIN = 8;
/** bcrypt cost, the same as sign-up. */
export const BCRYPT_COST = 12;
/** What the user types to confirm deleting their account. */
export const DELETE_CONFIRMATION = "delete my account";

export const passwordChangeSchema = z
  .strictObject({
    currentPassword: z.string().min(1, "Enter your current password.").max(200),
    newPassword: z
      .string()
      .min(PASSWORD_MIN, `Choose a new password of at least ${PASSWORD_MIN} characters.`)
      .max(200, "Choose a new password of at most 200 characters."),
    confirmPassword: z.string().max(200),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "The new passwords don't match.", path: ["confirmPassword"] })
  .refine((d) => d.newPassword !== d.currentPassword, { message: "Choose a password different from your current one.", path: ["newPassword"] });

export const accountDeletionSchema = z.strictObject({
  // Case and surrounding spaces don't matter; the words do.
  confirmation: z
    .string()
    .max(100)
    .refine((text) => text.trim().toLowerCase() === DELETE_CONFIRMATION, `Type “${DELETE_CONFIRMATION}” to confirm.`),
  // Required for accounts that have a password; Google-only accounts have none.
  password: z.string().max(200).optional(),
});

export interface PasswordHasher {
  compare(plain: string, hash: string): Promise<boolean>;
  hash(plain: string, cost: number): Promise<string>;
}

export interface AccountStore {
  /** The user's password hash and email, or null if the user doesn't exist. */
  findCredentials(userId: string): Promise<{ passwordHash: string | null; email: string | null } | null>;
  setPasswordHash(userId: string, passwordHash: string): Promise<void>;
  /** Deletes the user and their personal data, anonymizing their donations. */
  deleteUser(userId: string, email: string | null): Promise<void>;
}

export type AccountError = "not-found" | "no-password" | "wrong-password";

export const ACCOUNT_ERRORS: Record<AccountError, { status: number; error: string }> = {
  "not-found": { status: 404, error: "This account no longer exists." },
  "no-password": { status: 400, error: "Your account signs in with Google, so it has no password to change." },
  "wrong-password": { status: 400, error: "Your current password is incorrect." },
};

export type AccountResult = { ok: true } | { ok: false; reason: AccountError };

/** Changes the password of a user who has one, after checking the current one. */
export async function changePassword(
  store: AccountStore,
  hasher: PasswordHasher,
  userId: string,
  input: z.infer<typeof passwordChangeSchema>,
): Promise<AccountResult> {
  const user = await store.findCredentials(userId);
  if (!user) return { ok: false, reason: "not-found" };
  if (!user.passwordHash) return { ok: false, reason: "no-password" };
  if (!(await hasher.compare(input.currentPassword, user.passwordHash))) return { ok: false, reason: "wrong-password" };
  await store.setPasswordHash(userId, await hasher.hash(input.newPassword, BCRYPT_COST));
  return { ok: true };
}

/**
 * Deletes the account after the typed confirmation (checked by the schema)
 * and, for accounts with a password, the password. Google-only accounts
 * have no password to check; their proof is the signed-in session plus the
 * typed confirmation.
 */
export async function deleteAccount(
  store: AccountStore,
  hasher: PasswordHasher,
  userId: string,
  input: z.infer<typeof accountDeletionSchema>,
): Promise<AccountResult> {
  const user = await store.findCredentials(userId);
  if (!user) return { ok: false, reason: "not-found" };
  if (user.passwordHash) {
    if (!input.password || !(await hasher.compare(input.password, user.passwordHash))) {
      return { ok: false, reason: "wrong-password" };
    }
  }
  await store.deleteUser(userId, user.email);
  return { ok: true };
}
