import { describe, expect, it } from "vitest";
import {
  CARD_SLUGS,
  CARDS,
  captionText,
  cardHref,
  isCardSlug,
  neighbours,
  validateCardImage,
  type CardPhoto,
} from "./why-give-cards";

const photo: CardPhoto = {
  kind: "photo",
  src: "/why-give/net-distribution.jpg",
  width: 1600,
  height: 1067,
  alt: "Two women carry bundled bed nets along a dirt road",
  caption: { what: "Bed nets being carried home after a distribution", where: "Kasai, DR Congo", when: "March 2024" },
  credit: "Against Malaria Foundation",
  license: "Used with permission",
  licenseUrl: null,
  sourceUrl: "https://www.againstmalaria.com/",
  identifiablePeople: true,
  consent: "AMF confirmed by email (2026-12-01) that the people shown agreed to the photo being used.",
};

describe("card order and URLs", () => {
  it("has unique slugs and a title for each", () => {
    expect(new Set(CARD_SLUGS).size).toBe(CARD_SLUGS.length);
    for (const slug of CARD_SLUGS) expect(CARDS[slug].title.length).toBeGreaterThan(0);
  });

  it("starts the story at /why-give itself", () => {
    expect(cardHref("drowning-child")).toBe("/why-give");
    expect(cardHref("malaria")).toBe("/why-give/malaria");
  });

  it("never uses a slug that collides with the one-page route", () => {
    expect(isCardSlug("all")).toBe(false);
  });

  it("knows its neighbours, and stops at both ends", () => {
    expect(neighbours("drowning-child")).toEqual({ index: 0, prev: null, next: "where-you-stand" });
    expect(neighbours("malaria").prev).toBe("extreme-poverty");
    expect(neighbours("small-gifts-add-up").next).toBeNull();
  });

  it("rejects unknown slugs", () => {
    expect(isCardSlug("malaria")).toBe(true);
    expect(isCardSlug("nope")).toBe(false);
  });
});

describe("validateCardImage", () => {
  it("accepts a complete photo entry", () => {
    expect(validateCardImage(photo)).toEqual([]);
  });

  it("requires consent for identifiable people", () => {
    expect(validateCardImage({ ...photo, consent: null })).toContain(
      "Photos of identifiable people need a record of consent (who confirmed it, and how).",
    );
    expect(validateCardImage({ ...photo, consent: null, identifiablePeople: false })).toEqual([]);
  });

  it("requires alt text, caption facts, credit and licence", () => {
    const bad = validateCardImage({
      ...photo,
      alt: "Photo of nets",
      caption: { what: "", where: " ", when: "2024" },
      credit: "",
      license: "CC BY-SA 4.0",
      licenseUrl: null,
    });
    expect(bad).toEqual([
      "Alt text shouldn't start with \"image of\" or \"photo of\".",
      "The caption needs what the photo shows.",
      "The caption needs where the photo shows.",
      "Credit the photographer or organization.",
      "Link the Creative Commons licence.",
    ]);
  });

  it("refuses photos hosted elsewhere", () => {
    expect(validateCardImage({ ...photo, src: "https://upload.wikimedia.org/x.jpg" })).toHaveLength(1);
  });

  it("checks every image slot on the cards", () => {
    for (const slug of CARD_SLUGS) {
      const image = CARDS[slug].image;
      if (image) expect(validateCardImage(image), slug).toEqual([]);
    }
  });
});

describe("captionText", () => {
  it("joins what, where and when without doubled punctuation", () => {
    expect(captionText({ caption: { what: "Nets being carried home.", where: "Kasai, DR Congo", when: "March 2024." } })).toBe(
      "Nets being carried home. Kasai, DR Congo, March 2024.",
    );
  });
});
