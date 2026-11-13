// The Highest Impact category's rule (D-013, owner wording 2026-11-13).
// Used on Discover, in the admin category editor and in the verification
// guide, so the wording is the same everywhere.

export const HIGHEST_IMPACT_SLUG = "highest-impact";

/** Exactly who belongs in Highest Impact. */
export const HIGHEST_IMPACT_RULE = "GiveWell Top Charities, plus GiveDirectly as GiveWell's cash-transfer benchmark.";

/** GiveDirectly's EIN (Every.org: givedirectly). */
export const GIVEDIRECTLY_EIN = "271661997";

/**
 * A label for an organization shown under Highest Impact, or null.
 * GiveDirectly is the documented exception and is labelled as such; it must
 * never be presented as a GiveWell Top Charity.
 */
export function highestImpactLabel(org: { ein: string | null; categorySlugs: string[] }): string | null {
  if (!org.categorySlugs.includes(HIGHEST_IMPACT_SLUG)) return null;
  return org.ein === GIVEDIRECTLY_EIN ? "GiveWell's cash-transfer benchmark" : null;
}
