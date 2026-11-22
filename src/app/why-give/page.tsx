// /why-give: the first of the Why give cards. The rest are at
// /why-give/<slug>; the full text on one page is /why-give/all.
import { CARD_SLUGS } from "@/lib/why-give-cards";
import { CardPage, cardMetadata } from "./CardPage";

export const metadata = cardMetadata(CARD_SLUGS[0]);

export default function WhyGivePage() {
  return <CardPage slug={CARD_SLUGS[0]} />;
}
