// /why-give/<slug>: one Why give card, built at build time. The first card's
// address is /why-give itself, so /why-give/drowning-child redirects there.
import { notFound, permanentRedirect } from "next/navigation";
import { CARD_SLUGS, cardHref, isCardSlug } from "@/lib/why-give-cards";
import { CardPage, cardMetadata } from "../CardPage";

type Params = { params: Promise<{ card: string }> };

// Only the slugs listed in src/lib/why-give-cards.ts exist; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return CARD_SLUGS.map((card) => ({ card }));
}

export async function generateMetadata({ params }: Params) {
  const { card } = await params;
  return isCardSlug(card) ? cardMetadata(card) : {};
}

export default async function WhyGiveCardPage({ params }: Params) {
  const { card } = await params;
  if (!isCardSlug(card)) notFound();
  if (cardHref(card) !== `/why-give/${card}`) permanentRedirect(cardHref(card));
  return <CardPage slug={card} />;
}
