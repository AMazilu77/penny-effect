// Maps our cause categories (by `CauseCategory.slug`) to Every.org cause
// slugs (M2-PLAN). Used only to *suggest* categories when an admin imports
// an organization; the admin can change them.
//
// Every.org cause slugs checked against the live API on 2026-11-11.

export const CATEGORY_EVERYORG_CAUSES = {
  "humanitarian-aid": ["humans", "poverty", "food-security", "refugees", "housing", "immigrants"],
  "animal-welfare": ["animals", "wildlife", "dogs", "cats"],
  environment: ["environment", "climate", "conservation", "oceans", "water", "parks"],
  "mental-health": ["mental-health"],
  "political-reform": ["votingrights", "justice", "freepress", "legal", "racial-justice"],
  "medical-research": ["research", "cancer", "disease", "womens-health"],
  education: ["education", "libraries", "youth"],
  "space-science": ["space", "science"],
} as const satisfies Record<string, readonly string[]>;

/**
 * Categories an admin fills by hand, never suggested from Every.org causes.
 * "Highest Impact" follows GiveWell's research, not Every.org tags (D-013).
 */
export const CURATED_CATEGORY_SLUGS = ["highest-impact"] as const;

/**
 * Our category slugs suggested for an organization with these Every.org
 * causes, in the order of CATEGORY_EVERYORG_CAUSES. Never suggests a curated
 * category.
 */
export function suggestCategorySlugs(everyOrgCauses: readonly string[]): string[] {
  const causes = new Set(everyOrgCauses.map((c) => c.trim().toLowerCase()));
  return Object.entries(CATEGORY_EVERYORG_CAUSES)
    .filter(([, mapped]) => mapped.some((cause) => causes.has(cause)))
    .map(([slug]) => slug);
}
