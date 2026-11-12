// Rules for the admin organization tools (D-012). Kept free of database and
// network calls so they can be unit-tested; the Server Actions in
// src/app/admin/organizations/actions.ts apply them.
import { z } from "zod";
import type { EveryOrgNonprofit } from "@/lib/everyorg/parse";

/**
 * The Organization fields that come from Every.org. Used when importing a
 * new organization and when linking or refreshing an existing one. Our own
 * `name` is set only on import, so an admin's chosen display name survives
 * a refresh.
 */
export function everyOrgFields(np: EveryOrgNonprofit, now: Date) {
  return {
    ein: np.ein,
    everyOrgId: np.everyOrgId,
    everyOrgSlug: np.slug,
    isDisbursable: np.isDisbursable,
    nteeCode: np.nteeCode,
    description: np.description,
    website: np.websiteUrl,
    logoUrl: np.logoUrl,
    coverImageUrl: np.coverImageUrl,
    lastSyncedAt: now,
  };
}

/**
 * Re-linking an organization to a *different* registered nonprofit (another
 * EIN) means the earlier admin review no longer applies.
 */
export function linkClearsVerification(currentEin: string | null, newEin: string | null): boolean {
  return currentEin !== null && currentEin !== newEin;
}

type VerifiableOrg = {
  ein: string | null;
  everyOrgId: string | null;
  isDisbursable: boolean;
  status: "ACTIVE" | "HIDDEN";
};

export type VerifyBlocker = "no-everyorg" | "no-ein" | "not-disbursable" | "hidden";

/**
 * Why an admin can't verify this organization yet, or null if they can.
 * Users only ever see organizations that pass all of these (D-012).
 */
export function verifyBlocker(org: VerifiableOrg): VerifyBlocker | null {
  if (!org.everyOrgId) return "no-everyorg";
  if (!org.ein) return "no-ein";
  if (!org.isDisbursable) return "not-disbursable";
  if (org.status !== "ACTIVE") return "hidden";
  return null;
}

// ---- Form input (FormData from the admin pages) ----

const id = z.string().trim().min(1).max(64);

export const orgIdForm = z.object({ organizationId: id });

/** An Every.org slug, 9-digit EIN (dash allowed) or Every.org id. */
export const everyOrgRefForm = z.object({
  organizationId: id,
  everyOrgRef: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9-]+$/),
});

export const importForm = z.object({
  everyOrgSlug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9-]+$/),
});

export const categoriesForm = z.object({
  organizationId: id,
  categoryIds: z.array(id).max(50),
});

/** Reads a FormData into a plain object (repeated keys become arrays). */
export function formDataToObject(formData: FormData, arrayKeys: readonly string[] = []) {
  const result: Record<string, string | string[]> = {};
  for (const key of arrayKeys) result[key] = [];
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (arrayKeys.includes(key)) (result[key] as string[]).push(value);
    else result[key] = value;
  }
  return result;
}

// ---- Messages shown after an action (passed as ?notice= / ?error= codes) ----

export const NOTICES = {
  imported: "Imported from Every.org. Review it, pick categories, then verify.",
  linked: "Linked to Every.org and refreshed.",
  "linked-unverified": "Linked to a different nonprofit (new EIN), so verification was cleared. Review and verify again.",
  verified: "Verified. Users will see it once it is active.",
  unverified: "Verification removed.",
  hidden: "Hidden from users.",
  shown: "Active again (users see it only if it is also verified).",
  categories: "Categories saved.",
} as const;

export const ERRORS = {
  invalid: "That request wasn't valid.",
  "not-found": "Organization not found.",
  "everyorg-not-found": "Every.org has no nonprofit with that slug, EIN or id.",
  "everyorg-failed": "Couldn't reach Every.org, or it sent something unexpected. Try again.",
  "already-imported": "That nonprofit is already in the directory.",
  "ein-taken": "Another organization in the directory already has that EIN, Every.org record or name.",
  "name-taken": "An organization with this name is already in the directory (shown here). If it's the same nonprofit, link it to Every.org below.",
  "no-everyorg": "Link it to Every.org first.",
  "no-ein": "Every.org has no EIN for it, so it can't be verified (D-012).",
  "not-disbursable": "Every.org can't currently send donations to it, so it can't be verified.",
  hidden: "Make it active before verifying.",
} as const;

export type NoticeCode = keyof typeof NOTICES;
export type ErrorCode = keyof typeof ERRORS;

/** The message for a ?notice= or ?error= value, or null for anything unknown. */
export function messageFor(
  kind: "notice" | "error",
  code: string | string[] | undefined,
): string | null {
  if (typeof code !== "string") return null;
  const table: Record<string, string> = kind === "notice" ? NOTICES : ERRORS;
  return Object.hasOwn(table, code) ? table[code] : null;
}
