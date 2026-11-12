// Turns raw Every.org Nonprofits API responses into our own small types.
// Pure functions (no network), so they're unit-tested against saved
// fixtures of real responses in ./fixtures.
//
// Every.org's API is external input: we validate it with zod and keep only
// the fields we use, so a change on their side fails loudly here instead of
// putting bad data into our database.
import { z } from "zod";
import { safeExternalUrl } from "@/lib/feed";

/** One nonprofit's details (`GET /nonprofit/:id`). */
export type EveryOrgNonprofit = {
  everyOrgId: string;
  slug: string;
  name: string;
  /** 9 digits, no dash, or null when Every.org has no EIN for it. */
  ein: string | null;
  /** Every.org can send donations to it (see `isDisbursableFrom`). */
  isDisbursable: boolean;
  description: string | null;
  descriptionLong: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  profileUrl: string | null;
  nteeCode: string | null;
  locationAddress: string | null;
  /** Every.org cause slugs, e.g. ["poverty", "humans"]. */
  causes: string[];
};

/** One row of search results (`GET /search/:term`). */
export type EveryOrgSearchResult = {
  slug: string;
  name: string;
  ein: string | null;
  isDisbursable: boolean;
  description: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  profileUrl: string | null;
};

/**
 * Normalizes an EIN to 9 digits ("27-1661997" → "271661997"). Returns null
 * for anything that isn't exactly 9 digits once dashes and spaces are removed.
 */
export function normalizeEin(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[\s-]/g, "");
  return /^\d{9}$/.test(digits) ? digits : null;
}

const optionalText = z.string().nullish();

// Every.org documents `isDisbursable`, but the live API (checked 2026-11-11)
// returns `donationsEnabled` instead. Accept either; prefer the documented one.
const disbursableFields = {
  isDisbursable: z.boolean().nullish(),
  donationsEnabled: z.boolean().nullish(),
};

function isDisbursableFrom(raw: { isDisbursable?: boolean | null; donationsEnabled?: boolean | null }) {
  return raw.isDisbursable ?? raw.donationsEnabled ?? false;
}

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const nonprofitResponseSchema = z.object({
  data: z.object({
    nonprofit: z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      primarySlug: z.string().min(1),
      ein: optionalText,
      description: optionalText,
      descriptionLong: optionalText,
      websiteUrl: optionalText,
      logoUrl: optionalText,
      coverImageUrl: optionalText,
      profileUrl: optionalText,
      nteeCode: optionalText,
      locationAddress: optionalText,
      ...disbursableFields,
    }),
    nonprofitTags: z.array(z.object({ tagName: z.string().min(1) })).nullish(),
  }),
});

/** Parses a `GET /nonprofit/:id` response body. Throws if the shape is wrong. */
export function parseNonprofitResponse(body: unknown): EveryOrgNonprofit {
  const { data } = nonprofitResponseSchema.parse(body);
  const n = data.nonprofit;
  return {
    everyOrgId: n.id,
    slug: n.primarySlug,
    name: n.name.trim(),
    ein: normalizeEin(n.ein),
    isDisbursable: isDisbursableFrom(n),
    description: text(n.description),
    descriptionLong: text(n.descriptionLong),
    websiteUrl: safeExternalUrl(n.websiteUrl),
    logoUrl: safeExternalUrl(n.logoUrl),
    coverImageUrl: safeExternalUrl(n.coverImageUrl),
    profileUrl: safeExternalUrl(n.profileUrl),
    nteeCode: text(n.nteeCode),
    locationAddress: text(n.locationAddress),
    causes: (data.nonprofitTags ?? []).map((t) => t.tagName),
  };
}

const searchResponseSchema = z.object({
  nonprofits: z.array(
    z.object({
      slug: z.string().min(1),
      name: z.string().min(1),
      ein: optionalText,
      description: optionalText,
      websiteUrl: optionalText,
      logoUrl: optionalText,
      profileUrl: optionalText,
      ...disbursableFields,
    }),
  ),
});

/** Parses a `GET /search/:term` response body. Throws if the shape is wrong. */
export function parseSearchResponse(body: unknown): EveryOrgSearchResult[] {
  return searchResponseSchema.parse(body).nonprofits.map((n) => ({
    slug: n.slug,
    name: n.name.trim(),
    ein: normalizeEin(n.ein),
    isDisbursable: isDisbursableFrom(n),
    description: text(n.description),
    websiteUrl: safeExternalUrl(n.websiteUrl),
    logoUrl: safeExternalUrl(n.logoUrl),
    profileUrl: safeExternalUrl(n.profileUrl),
  }));
}
