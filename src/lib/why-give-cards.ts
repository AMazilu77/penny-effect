// The "Why give" cards (/why-give, /why-give/<slug>): their order, URLs and
// image slots. Pure data and functions, so they're unit-tested. The card
// text and charts live in src/app/why-give/cards.tsx; the long page with the
// full text is /why-give/all.
//
// Images follow the image policy (D-027, based on the Dóchas Guide to
// Ethical Communications): dignity and agency, consent, honest captions with
// a source, nothing staged or guilt-maximizing. validateCardImage enforces
// the parts code can check.

export const WHY_GIVE_PATH = "/why-give";
export const ONE_PAGE_PATH = "/why-give/all";

export const CARD_SLUGS = [
  "drowning-child",
  "where-you-stand",
  "fewer-children-die",
  "extreme-poverty",
  "malaria",
  "two-cheap-tools",
  "cost-to-save-a-life",
  "why-it-costs-more",
  "where-you-give-matters",
  "highest-impact",
  "small-gifts-add-up",
] as const;

export type CardSlug = (typeof CARD_SLUGS)[number];

export type CardMeta = {
  title: string;
  /** One sentence for search results and link previews. */
  summary: string;
  image?: CardImage;
};

/** A photo we host ourselves (public/why-give/), with everything the policy needs. */
export type CardPhoto = {
  kind: "photo";
  /** A file under public/why-give/, e.g. "/why-give/amf-distribution.jpg". Never a link to another site. */
  src: string;
  width: number;
  height: number;
  /** What a sighted reader sees, for people who can't (5–200 characters). */
  alt: string;
  /** The caption, from honest facts: what is happening, where, and when. */
  caption: { what: string; where: string; when: string };
  /** Photographer and/or organization, e.g. "Against Malaria Foundation". */
  credit: string;
  /** "Used with permission" or a licence name such as "CC BY-SA 4.0". */
  license: string;
  /** Required for Creative Commons licences. */
  licenseUrl: string | null;
  /** Where the photo came from: the Commons file page, or the partner page it was supplied for. */
  sourceUrl: string;
  /** Can anyone in the photo be recognized? */
  identifiablePeople: boolean;
  /** Who confirmed the people shown agreed, and how. Required when identifiablePeople is true. */
  consent: string | null;
};

/** An empty slot: a quiet pattern on the site, and what we're looking for (shown only in development). */
export type CardPlaceholder = { kind: "placeholder"; wanted: string };

export type CardImage = CardPhoto | CardPlaceholder;

export const CARDS: Record<CardSlug, CardMeta> = {
  "drowning-child": {
    title: "The child in the pond",
    summary: "Peter Singer's 1972 thought experiment, and why distance shouldn't change the answer.",
  },
  "where-you-stand": {
    title: "Where a typical Western donor stands",
    summary: "The middle of the US income distribution, compared with the rest of the world.",
  },
  "fewer-children-die": {
    title: "Far fewer children die young",
    summary: "Deaths before age five, worldwide, since 1990.",
  },
  "extreme-poverty": {
    title: "Fewer people live in extreme poverty",
    summary: "The share of people living on less than $3 a day, since 1990.",
  },
  malaria: {
    title: "Malaria is preventable, and still deadly",
    summary: "WHO estimates of malaria deaths each year.",
    image: {
      kind: "placeholder",
      wanted:
        "A bed-net distribution or a community health worker at work, supplied by the Against Malaria Foundation or Malaria Consortium with consent, or a clearly licensed Wikimedia Commons photo without identifiable people.",
    },
  },
  "two-cheap-tools": {
    title: "Two cheap tools with strong evidence",
    summary: "Insecticide-treated bed nets and seasonal preventive malaria medicine: the evidence and the cost.",
    image: {
      kind: "placeholder",
      wanted:
        "A caregiver giving a child seasonal malaria medicine, or a family hanging a net, shown as people doing something, not waiting for help. From Malaria Consortium or AMF, with consent.",
    },
  },
  "cost-to-save-a-life": {
    title: "What it costs to save a life",
    summary: "GiveWell's estimated cost per life saved for two malaria charities, with its uncertainty.",
  },
  "why-it-costs-more": {
    title: "Why it costs more than one net",
    summary: "GiveWell's worked example of one grant, and why we never say your gift saved a life.",
  },
  "where-you-give-matters": {
    title: "Where you give matters",
    summary: "Charities that all do good can differ enormously in how much good they do per dollar.",
  },
  "highest-impact": {
    title: "Our Highest Impact category",
    summary: "GiveWell's Top Charities, plus GiveDirectly as its cash benchmark.",
  },
  "small-gifts-add-up": {
    title: "Small, regular gifts add up",
    summary: "One dollar a day is $365 a year.",
  },
};

export function isCardSlug(value: string): value is CardSlug {
  return (CARD_SLUGS as readonly string[]).includes(value);
}

/** The first card lives at /why-give itself, so the page's old link still starts the story. */
export function cardHref(slug: CardSlug): string {
  return slug === CARD_SLUGS[0] ? WHY_GIVE_PATH : `${WHY_GIVE_PATH}/${slug}`;
}

/** The cards before and after this one (null at either end). */
export function neighbours(slug: CardSlug): { index: number; prev: CardSlug | null; next: CardSlug | null } {
  const index = CARD_SLUGS.indexOf(slug);
  return {
    index,
    prev: index > 0 ? CARD_SLUGS[index - 1] : null,
    next: index < CARD_SLUGS.length - 1 ? CARD_SLUGS[index + 1] : null,
  };
}

/** "Bed nets being handed out. Kinshasa, DR Congo, March 2024." */
export function captionText(photo: Pick<CardPhoto, "caption">): string {
  const trim = (s: string) => s.trim().replace(/[.\s]+$/, "");
  const { what, where, when } = photo.caption;
  return `${trim(what)}. ${trim(where)}, ${trim(when)}.`;
}

/**
 * Problems with an image entry, as plain sentences (empty when it's fine).
 * Checks what code can check; a person still has to judge dignity and
 * honesty against the policy (D-027) before adding a photo.
 */
export function validateCardImage(image: CardImage): string[] {
  if (image.kind === "placeholder") {
    return image.wanted.trim().length >= 10 ? [] : ["Say what kind of photo the placeholder is waiting for."];
  }
  const problems: string[] = [];
  const alt = image.alt.trim();
  if (alt.length < 5 || alt.length > 200) problems.push("Alt text must be 5–200 characters.");
  if (/^(image|photo|picture) of\b/i.test(alt)) problems.push("Alt text shouldn't start with \"image of\" or \"photo of\".");
  if (!/^\/why-give\/[\w-]+\.(jpe?g|png|webp|avif)$/.test(image.src)) {
    problems.push("Host the photo ourselves under public/why-give/ (jpg, png, webp or avif).");
  }
  if (!(image.width > 0 && image.height > 0)) problems.push("Give the photo's width and height.");
  for (const part of ["what", "where", "when"] as const) {
    if (!image.caption[part].trim()) problems.push(`The caption needs ${part} the photo shows.`);
  }
  if (!image.credit.trim()) problems.push("Credit the photographer or organization.");
  if (!image.license.trim()) problems.push("Say the licence, or \"Used with permission\".");
  if (/^CC\b/i.test(image.license.trim()) && !image.licenseUrl) problems.push("Link the Creative Commons licence.");
  if (!/^https:\/\//.test(image.sourceUrl)) problems.push("Link where the photo came from (https).");
  if (image.identifiablePeople && !image.consent?.trim()) {
    problems.push("Photos of identifiable people need a record of consent (who confirmed it, and how).");
  }
  return problems;
}
