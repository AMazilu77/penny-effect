// Rules for the admin organization tools (D-012). Kept free of database and
// network calls so they can be unit-tested; the Server Actions in
// src/app/admin/organizations/actions.ts apply them.
import { z } from "zod";
import type { EveryOrgNonprofit } from "@/lib/everyorg/parse";
import { orgLocationFields, stateCode } from "@/lib/everyorg/address";
import { SERVICE_AREAS, normalizeCountyName, type ServiceAreaName } from "@/lib/area";
import { VERIFICATION_NOTE_MAX, VERIFICATION_NOTE_MIN } from "@/lib/verification-guide";

/**
 * The Organization fields that come from Every.org. Used when importing a
 * new organization and when linking or refreshing an existing one. Our own
 * `name` is set only on import, so an admin's chosen display name survives
 * a refresh. So does an address an admin entered by hand
 * (`keepLocation`, from Organization.locationManual).
 */
export function everyOrgFields(np: EveryOrgNonprofit, now: Date, { keepLocation = false }: { keepLocation?: boolean } = {}) {
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
    // City, state, ZIP. Left out (existing values kept) when the address can't be read.
    ...(keepLocation ? {} : orgLocationFields(np.locationAddress)),
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
  serviceArea: ServiceAreaName | null;
};

export type VerifyBlocker = "no-everyorg" | "no-ein" | "not-disbursable" | "hidden" | "no-service-area";

/**
 * Why an admin can't verify this organization yet, or null if they can.
 * Users only ever see organizations that pass all of these (D-012).
 */
export function verifyBlocker(org: VerifiableOrg): VerifyBlocker | null {
  if (!org.everyOrgId) return "no-everyorg";
  if (!org.ein) return "no-ein";
  if (!org.isDisbursable) return "not-disbursable";
  if (org.status !== "ACTIVE") return "hidden";
  // Discover separates local from national organizations, so an admin says which before it's listed (D-028).
  if (!org.serviceArea) return "no-service-area";
  return null;
}

// ---- Form input (FormData from the admin pages) ----

const id = z.string().trim().min(1).max(64);

export const orgIdForm = z.object({ organizationId: id });

/** Verifying needs a note saying what the admin checked (shown to other admins). */
export const verifyForm = z.object({
  organizationId: id,
  verificationNote: z.string().trim().min(VERIFICATION_NOTE_MIN).max(VERIFICATION_NOTE_MAX),
});

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

// Location and volunteering (D-028), set by an admin on the organization's page.
const optional = (schema: z.ZodType<string>) => z.union([z.literal("").transform(() => null), schema]);
const CITY = /^[\p{L} .'-]{1,80}$/u;

export const locationForm = z
  .object({
    organizationId: id,
    locationCity: optional(z.string().trim().regex(CITY)).prefault(""),
    locationState: optional(
      z
        .string()
        .trim()
        .transform((s, ctx) => stateCode(s) ?? (ctx.addIssue({ code: "custom", message: "state" }), z.NEVER)),
    ).prefault(""),
    locationZip: optional(z.string().trim().regex(/^\d{5}$/)).prefault(""),
    locationCounty: optional(
      z
        .string()
        .trim()
        .regex(/^[\p{L} .'-]{1,60}$/u)
        .transform(normalizeCountyName)
        .refine((c) => c.length > 0),
    ).prefault(""),
    serviceArea: z.union([z.literal("").transform(() => null), z.enum(SERVICE_AREAS)]).prefault(""),
    acceptsVolunteers: z
      .literal("on")
      .optional()
      .transform((v) => v === "on"),
    volunteerUrl: optional(
      z
        .string()
        .trim()
        .max(500)
        .refine((u) => {
          try {
            const url = new URL(u);
            return url.protocol === "https:" || url.protocol === "http:";
          } catch {
            return false;
          }
        }),
    ).prefault(""),
  })
  // A city or county means nothing without its state.
  .refine((f) => f.locationState !== null || (f.locationCity === null && f.locationCounty === null));

export type LocationInput = z.infer<typeof locationForm>;

/**
 * The Organization update for the location form. If the admin changed the
 * city, state or ZIP from what's stored (usually Every.org's), the address
 * is marked as entered by hand so the weekly Every.org refresh keeps it.
 */
export function locationUpdate(
  input: LocationInput,
  current: { locationCity: string | null; locationState: string | null; locationZip: string | null; locationManual: boolean },
) {
  const changed =
    input.locationCity !== current.locationCity || input.locationState !== current.locationState || input.locationZip !== current.locationZip;
  return {
    locationCity: input.locationCity,
    locationState: input.locationState,
    locationZip: input.locationZip,
    locationCounty: input.locationCounty,
    locationManual: current.locationManual || changed,
    serviceArea: input.serviceArea,
    acceptsVolunteers: input.acceptsVolunteers,
    volunteerUrl: input.volunteerUrl,
  };
}

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

// ---- Messages shown after an admin action (passed as ?notice= / ?error= codes) ----
// Shared by all admin pages (organizations and news).

export const NOTICES = {
  imported: "Imported from Every.org. Review it, pick categories, then verify.",
  linked: "Linked to Every.org and refreshed.",
  "linked-unverified": "Linked to a different nonprofit (new EIN), so verification was cleared. Review and verify again.",
  verified: "Verified, with your note. Donors see it as long as it stays active and can receive gifts.",
  unverified: "Verification removed.",
  hidden: "Hidden from users.",
  shown: "Active again (users see it only if it is also verified).",
  "moved-hidden": "Hidden from users. It's now in the Hidden tab.",
  "moved-shown": "Unhidden. It's back in Needs review, or in Live if it is verified.",
  categories: "Categories saved.",
  location: "Location and volunteering saved.",
  "location-everyorg": "The address will come from Every.org again. Press Refresh from Every.org to fill it now.",
  "region-created": "Region created.",
  "region-saved": "Region saved.",
  "region-deleted": "Region deleted. Anyone who had it as My area now has no area set.",
  "cn-saved": "Charity Navigator rating saved, dated today.",
  "cn-removed": "Charity Navigator rating removed.",
  "news-posted": "News posted. It appears in the feed of everyone following this organization's categories.",
  "news-removed": "News item removed.",
  "news-image-saved": "Image saved.",
  "news-image-removed": "Image removed. The feed shows the organization's cover image or a placeholder instead.",
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
  "no-service-area": "Set who it serves (local, regional, statewide or national) under Location and volunteering first.",
  "location-invalid": "Location not saved: check the state (a US state), city (letters only), 5-digit ZIP, county, and that the volunteer link is a full http(s):// address. A city or county needs a state.",
  "region-invalid": "Region not saved: it needs a name (3–60 characters) and at least one county, one per line, written like “Palm Beach, FL”.",
  "region-taken": "Another region already has that name or web address.",
  "region-not-found": "That region no longer exists.",
  "cn-invalid": "Rating not saved: the score must be a whole number from 0 to 100, stars (if shown) from 0 to 4, and the profile link must be this organization's Charity Navigator page (charitynavigator.org/ein/<its EIN>).",
  "note-required": `Write a verification note (${VERIFICATION_NOTE_MIN}–${VERIFICATION_NOTE_MAX} characters) saying what you checked, e.g. "IRS status current; 990 for 2024 on ProPublica; EIN in website footer".`,
  "news-invalid": "That news request wasn't valid. Reload the page and try again.",
  "news-org": "News can only be posted for an organization that is active and verified.",
  "news-not-found": "That news item no longer exists.",
  "news-image-invalid": "Image not saved: it needs a full https:// image link and a description of 5–200 characters.",
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
