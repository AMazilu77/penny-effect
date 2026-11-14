// Charity Navigator ratings (D-016): pure rules, unit-tested.
//
// What the rating is: Charity Navigator's "Encompass" score (0–100) and star
// rating (0–4), built from four "beacons": Accountability & Finance, Impact &
// Measurement, Leadership & Planning, and Culture & Compensation. It is mostly
// about how a charity is run. It is not a ranking of impact per dollar (for
// that, see Highest Impact / GiveWell).
//
// Terms we follow (developer.charitynavigator.org/attribution, read
// 2026-11-14): every page showing CN data cites Charity Navigator and links
// to a CN page; ratings are shown exactly as published and never used in any
// other calculation.
import { z } from "zod";

/** Ratings older than this are labelled stale (still shown, never hidden). */
export const STALE_AFTER_DAYS = 183;

export const CN_LABEL = "Charity Navigator";
/** The honest one-liner shown with every rating. */
export const CN_EXPLAINER =
  "Charity Navigator rates how a charity is run (accountability, finances, leadership). It is not a measure of impact per dollar.";

export type CnRating = {
  cnScore: number | null;
  cnStars: number | null;
  cnProfileUrl: string | null;
  cnCheckedAt: Date | null;
  cnSource: "API" | "MANUAL" | null;
};

/** Charity Navigator's profile page for an EIN (format checked live 2026-11-13). */
export function cnProfileUrlFor(ein: string): string {
  return `https://www.charitynavigator.org/ein/${ein}`;
}

/** True when the rating was last checked more than ~6 months before `now`. */
export function isStale(checkedAt: Date, now: Date): boolean {
  return now.getTime() - checkedAt.getTime() > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

/** Something to show, or null when there's no usable rating. */
export function displayRating(r: CnRating, now: Date) {
  if (r.cnScore === null || !r.cnProfileUrl || !r.cnCheckedAt) return null;
  return {
    score: r.cnScore,
    stars: r.cnStars,
    profileUrl: r.cnProfileUrl,
    checkedAt: r.cnCheckedAt,
    stale: isStale(r.cnCheckedAt, now),
    manual: r.cnSource === "MANUAL",
  };
}

/** The profile link must be CN's own page for this organization's EIN. */
function isProfileFor(url: string, ein: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "https:" || (host !== "www.charitynavigator.org" && host !== "charitynavigator.org")) return false;
    const m = u.pathname.match(/^\/ein\/(\d{2}-?\d{7})\/?$/);
    return Boolean(m && m[1].replace("-", "") === ein);
  } catch {
    return false;
  }
}

const intField = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, `${label} must be a whole number from ${min} to ${max}.`)
    .transform(Number)
    .pipe(z.number().int().min(min, `${label} must be from ${min} to ${max}.`).max(max, `${label} must be from ${min} to ${max}.`));

/** An admin's manual entry, copied from the organization's CN profile page. */
export function manualRatingForm(ein: string) {
  return z.object({
    organizationId: z.string().trim().min(1).max(64),
    cnScore: intField(0, 100, "Score"),
    // Optional: some profiles show a score without stars.
    cnStars: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .pipe(intField(0, 4, "Stars").nullable()),
    cnProfileUrl: z
      .string()
      .trim()
      .refine(
        (v) => isProfileFor(v, ein),
        `Profile link must be this organization's Charity Navigator page: ${cnProfileUrlFor(ein)}`,
      ),
  });
}
