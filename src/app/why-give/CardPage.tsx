// One Why give card: its own URL, Back and Next as plain links (so it works
// without JavaScript), and "Read it all on one page" for anyone who prefers
// scrolling. Deliberately no "3 of 11": the reader isn't told how long the
// series is, and nothing advances on its own.
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { buttonPrimary, buttonSecondary, textLink } from "@/components/ui/buttons";
import { BRAND_NAME } from "@/lib/brand";
import { CARDS, cardHref, neighbours, ONE_PAGE_PATH, type CardSlug } from "@/lib/why-give-cards";
import { CARD_BODIES } from "./cards";
import { CardGestures } from "./CardGestures";
import { CardImageSlot } from "./parts";

export function cardMetadata(slug: CardSlug): Metadata {
  const card = CARDS[slug];
  return {
    title: `${card.title} | Why give | ${BRAND_NAME}`,
    description: card.summary,
    alternates: { canonical: cardHref(slug) },
  };
}

export function CardPage({ slug }: { slug: CardSlug }) {
  const card = CARDS[slug];
  const Body = CARD_BODIES[slug];
  const { index, prev, next } = neighbours(slug);
  const prevHref = prev && cardHref(prev);
  const nextHref = next && cardHref(next);
  const headingId = "why-give-card-title";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">
        <Link href={cardHref("drowning-child")} className="hover:underline">
          Why give?
        </Link>
      </p>

      <CardGestures index={index} prevHref={prevHref} nextHref={nextHref} headingId={headingId}>
        <Card as="article" className="space-y-4" aria-labelledby={headingId}>
          <h1 id={headingId} tabIndex={-1} className="text-2xl font-bold focus:outline-none">
            {card.title}
          </h1>
          {card.image && <CardImageSlot image={card.image} />}
          <div className="space-y-3 text-lg leading-relaxed">
            <Body />
          </div>
        </Card>
      </CardGestures>

      <nav aria-label="Why give cards" className="flex items-center justify-between gap-3">
        {prevHref ? (
          <Link href={prevHref} rel="prev" className={buttonSecondary}>
            <ArrowLeft aria-hidden="true" className="size-4" /> Back
          </Link>
        ) : (
          <span />
        )}
        {nextHref && next ? (
          <Link href={nextHref} rel="next" className={buttonPrimary}>
            Next<span className="sr-only">: {CARDS[next].title}</span> <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : (
          <Link href={cardHref("drowning-child")} className={buttonSecondary}>
            Start again
          </Link>
        )}
      </nav>

      <p className="text-center text-sm">
        <Link href={ONE_PAGE_PATH} className={textLink}>
          Read it all on one page
        </Link>
      </p>
    </div>
  );
}
