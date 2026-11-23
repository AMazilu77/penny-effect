// Data for the LOCAL development seed (prisma/seed.ts). Kept separate so it
// can be unit-tested. Every organization is a real registered nonprofit;
// slugs and EINs were checked against the Every.org API on 2026-11-12. The
// Palm Beach County ones (D-028) were checked on 2026-11-22 against both
// ProPublica Nonprofit Explorer (EIN, IRS address) and Every.org (EIN,
// donations enabled); their volunteer links are their own sites' pages.

export type SeedCategory = { slug: string; name: string; description: string };
export type SeedOrganization = {
  /** Display name. Matches the name used by the old seed where there was one, so those rows get linked. */
  name: string;
  ein: string;
  everyOrgSlug: string;
  website: string;
  description: string;
  categorySlugs: string[];
  serviceArea: "LOCAL" | "REGIONAL" | "STATEWIDE" | "NATIONAL";
  /** Local ones only: where they are (county without "County") and volunteering. */
  location?: { city: string; state: string; zip: string; county: string };
  volunteerUrl?: string;
};

export const SEED_CATEGORIES: SeedCategory[] = [
  { slug: "humanitarian-aid", name: "Humanitarian Aid", description: "Disaster relief and food security." },
  { slug: "animal-welfare", name: "Animal Welfare", description: "Wildlife protection and animal shelters." },
  { slug: "environment", name: "Environment", description: "Climate, reforestation, and conservation." },
  { slug: "mental-health", name: "Mental Health", description: "Awareness and support for well-being." },
  { slug: "medical-research", name: "Medical Research", description: "Advancing cures and biotechnology." },
  { slug: "political-reform", name: "Political Reform", description: "Transparency, civil rights, and governance." },
  { slug: "education", name: "Education", description: "Access to learning and equal opportunities." },
  { slug: "space-science", name: "Space & Science", description: "Exploration and scientific progress." },
  // Curated by hand, not mapped to Every.org causes (D-013).
  {
    slug: "highest-impact",
    name: "Highest Impact",
    description: "Charities that GiveWell's research finds do the most good per dollar.",
  },
];

export const SEED_ORGANIZATIONS: SeedOrganization[] = [
  // Highest Impact (D-013): the charities' own Every.org profiles, not GiveWell's EIN-less pass-throughs.
  { name: "The Against Malaria Foundation", ein: "203069841", everyOrgSlug: "againstmalaria", website: "https://www.againstmalaria.com/", description: "Funds long-lasting insecticidal nets to protect people from malaria.", categorySlugs: ["medical-research", "highest-impact"], serviceArea: "NATIONAL" },
  // GiveWell's cash-transfer benchmark, not on its Top Charities list (D-013).
  { name: "GiveDirectly", ein: "271661997", everyOrgSlug: "givedirectly", website: "https://www.givedirectly.org/", description: "Sends unconditional cash directly to people living in extreme poverty.", categorySlugs: ["humanitarian-aid", "highest-impact"], serviceArea: "NATIONAL" },
  { name: "Malaria Consortium", ein: "980627052", everyOrgSlug: "malaria-consortium", website: "https://www.malariaconsortium.org/", description: "Prevention, control and treatment of malaria and other communicable diseases.", categorySlugs: ["medical-research", "highest-impact"], serviceArea: "NATIONAL" },
  { name: "Helen Keller International", ein: "135562162", everyOrgSlug: "hki", website: "https://www.hki.org/", description: "Vitamin A supplementation and other programs against preventable blindness and malnutrition.", categorySlugs: ["humanitarian-aid", "medical-research", "highest-impact"], serviceArea: "NATIONAL" },
  { name: "New Incentives", ein: "452368993", everyOrgSlug: "newincentives", website: "https://www.newincentives.org/", description: "Small cash incentives for caregivers who get their children vaccinated in Nigeria.", categorySlugs: ["medical-research", "highest-impact"], serviceArea: "NATIONAL" },
  // Thematic categories
  { name: "World Wildlife Fund", ein: "521693387", everyOrgSlug: "wwf", website: "https://www.worldwildlife.org/", description: "Conserving nature and reducing threats to life on Earth.", categorySlugs: ["animal-welfare", "environment"], serviceArea: "NATIONAL" },
  { name: "Best Friends Animal Society", ein: "237147797", everyOrgSlug: "bestfriends", website: "https://bestfriends.org/", description: "Animal rescue, sanctuary and adoption.", categorySlugs: ["animal-welfare"], serviceArea: "NATIONAL" },
  { name: "National Alliance on Mental Illness (NAMI)", ein: "431201653", everyOrgSlug: "nami", website: "https://www.nami.org/", description: "Advocacy, education and support for people affected by mental illness.", categorySlugs: ["mental-health"], serviceArea: "NATIONAL" },
  { name: "Electronic Frontier Foundation", ein: "043091431", everyOrgSlug: "eff", website: "https://www.eff.org/", description: "Defending civil liberties in the digital world.", categorySlugs: ["political-reform"], serviceArea: "NATIONAL" },
  { name: "Room to Read", ein: "912003533", everyOrgSlug: "roomtoread", website: "https://www.roomtoread.org/", description: "Literacy and girls' education in low-income communities.", categorySlugs: ["education"], serviceArea: "NATIONAL" },
  { name: "Planetary Society", ein: "953423566", everyOrgSlug: "planetary-society", website: "https://www.planetary.org/", description: "Advancing space science and exploration.", categorySlugs: ["space-science"], serviceArea: "NATIONAL" },
  { name: "SETI Institute", ein: "942951356", everyOrgSlug: "seti-institute", website: "https://www.seti.org/", description: "Research on the origin and prevalence of life in the universe.", categorySlugs: ["space-science"], serviceArea: "NATIONAL" },
  // Palm Beach County (D-028): small and local nonprofits, first-class in Discover.
  { name: "The Lord's Place", ein: "592240502", everyOrgSlug: "the-lords-place", website: "https://thelordsplace.org/", description: "Housing, jobs and support to end homelessness in Palm Beach County.", categorySlugs: ["humanitarian-aid"], serviceArea: "REGIONAL", location: { city: "West Palm Beach", state: "FL", zip: "33407", county: "Palm Beach" }, volunteerUrl: "https://thelordsplace.org/make-a-difference/volunteer/" },
  { name: "Peggy Adams Animal Rescue League of the Palm Beaches", ein: "590637811", everyOrgSlug: "peggy-adams-animal-rescue-league-of-the-palm-beaches", website: "https://peggyadams.org/", description: "Animal shelter, adoption and veterinary care in the Palm Beaches.", categorySlugs: ["animal-welfare"], serviceArea: "REGIONAL", location: { city: "West Palm Beach", state: "FL", zip: "33409", county: "Palm Beach" }, volunteerUrl: "https://peggyadams.org/help/get-involved/become-a-volunteer/" },
  { name: "Palm Beach County Food Bank", ein: "900788707", everyOrgSlug: "palm-beach-county-food-bank", website: "https://www.pbcfoodbank.org/", description: "Collects and distributes food to partner agencies across Palm Beach County.", categorySlugs: ["humanitarian-aid"], serviceArea: "REGIONAL", location: { city: "Lake Worth", state: "FL", zip: "33461", county: "Palm Beach" }, volunteerUrl: "https://www.pbcfoodbank.org/volunteer/" },
  { name: "Boys and Girls Clubs of Palm Beach County", ein: "237060561", everyOrgSlug: "bgcpbc", website: "https://bgcpbc.org/", description: "After-school and summer programs for young people across Palm Beach County.", categorySlugs: ["education"], serviceArea: "REGIONAL", location: { city: "West Palm Beach", state: "FL", zip: "33407", county: "Palm Beach" }, volunteerUrl: "https://bgcpbc.org/volunteer/" },
];

/**
 * The seed must never run against production: it writes made-up review
 * state (verifiedAt) and is meant for local databases only.
 */
export function seedBlockedReason(env: Record<string, string | undefined>): string | null {
  if (env.VERCEL_ENV === "production") return "VERCEL_ENV is production";
  return null;
}
