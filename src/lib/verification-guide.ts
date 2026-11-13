// The "How to verify a nonprofit" checklist, shared by the guide page
// (/admin/guide/verify) and the inline checklist on each organization's
// admin page. Pure data and functions, so it's unit-tested.
//
// Link formats checked against the live sites on 2026-11-13 with
// GiveDirectly (EIN 27-1661997): ProPublica and Candid load the right
// profile by EIN; Charity Navigator's /ein/ page loads the right
// organization. The IRS search blocks direct links, so we link to the
// search page and show the EIN to paste.

export type ChecklistLink = { label: string; href: string };
export type ChecklistItem = {
  id: string;
  title: string;
  /** What to look for, in plain language. */
  check: string;
  links: ChecklistLink[];
};

type OrgRef = { ein: string | null; everyOrgSlug: string | null; website: string | null };

/** "271661997" → "27-1661997" (how the IRS and most sites print an EIN). */
export function formatEin(ein: string): string {
  return /^\d{9}$/.test(ein) ? `${ein.slice(0, 2)}-${ein.slice(2)}` : ein;
}

export const IRS_SEARCH_URL = "https://apps.irs.gov/app/eos/";
export const GIVEWELL_TOP_CHARITIES_URL = "https://www.givewell.org/charities/top-charities";

/** The five checks, with links prefilled for this organization where the site allows it. */
export function verificationChecklist(org: OrgRef): ChecklistItem[] {
  const ein = org.ein && /^\d{9}$/.test(org.ein) ? org.ein : null;
  return [
    {
      id: "irs",
      title: "IRS: tax-exempt status is current",
      check: ein
        ? `Search the IRS list by EIN ${formatEin(ein)}. It must be listed as eligible to receive tax-deductible gifts, and must NOT appear under "Automatic Revocation of Exemption".`
        : "Search the IRS list by the organization's EIN. It must be listed and must NOT appear under \"Automatic Revocation of Exemption\".",
      links: [{ label: "IRS Tax Exempt Organization Search", href: IRS_SEARCH_URL }],
    },
    {
      id: "filings",
      title: "Recent tax filings (Form 990)",
      check: "ProPublica should show a Form 990 (or 990-EZ/990-N) filed within the last 2–3 years.",
      links: ein
        ? [{ label: "ProPublica Nonprofit Explorer", href: `https://projects.propublica.org/nonprofits/organizations/${ein}` }]
        : [{ label: "ProPublica Nonprofit Explorer", href: "https://projects.propublica.org/nonprofits/" }],
    },
    {
      id: "profiles",
      title: "Independent profiles have no warnings",
      check:
        "Candid (GuideStar) and Charity Navigator should show the same name and EIN. Look for any donor advisory or warning.",
      links: ein
        ? [
            { label: "Candid / GuideStar", href: `https://www.guidestar.org/profile/${formatEin(ein)}` },
            { label: "Charity Navigator", href: `https://www.charitynavigator.org/ein/${ein}` },
          ]
        : [
            { label: "Candid / GuideStar", href: "https://www.guidestar.org/" },
            { label: "Charity Navigator", href: "https://www.charitynavigator.org/" },
          ],
    },
    {
      id: "website",
      title: "Its own website matches",
      check:
        "The organization's website shows the same name and mission. Many list their EIN in the footer or on the donate page.",
      links: org.website ? [{ label: "Organization's website", href: org.website }] : [],
    },
    {
      id: "everyorg",
      title: "Every.org can send it gifts",
      check: "Its Every.org profile is the charity's own (not a pass-through) and accepts donations. We copy this when linking.",
      links: org.everyOrgSlug
        ? [{ label: "Every.org profile", href: `https://www.every.org/${encodeURIComponent(org.everyOrgSlug)}` }]
        : [],
    },
  ];
}

export const RED_FLAGS = [
  "Tax-exempt status revoked, or not listed with the IRS at all",
  "No tax filings in the last 3 years",
  "The name or EIN differs between the IRS, ProPublica, Every.org and the organization's website",
  "Its mission doesn't fit any of our causes",
  "A donor advisory on Charity Navigator, or a warning on Candid",
] as const;

/** Limits for the verification note (the server enforces them). */
export const VERIFICATION_NOTE_MIN = 20;
export const VERIFICATION_NOTE_MAX = 1000;
