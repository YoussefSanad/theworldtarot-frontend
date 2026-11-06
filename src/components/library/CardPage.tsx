"use client";

import { CardReferencePage } from "@/components/library/card/CardReferencePage";
import { ComingSoonPage } from "@/components/library/ComingSoonPage";
import { cardAlt, comingSoon, findMajorArcana } from "@/content/library";

/**
 * A Major Arcana card's reference page, looked up by slug: the template when
 * the card has content in `card-content.ts`, the placeholder while it does not.
 *
 * **It takes a slug rather than the card, and that is why it exists.** The
 * route is a server component, so a name, message and alt text it passed down
 * would be resolved once, at build time, in English. A slug is the same in
 * every language, and the card looked up here comes from this bundle's copy.
 * `SuitPage` takes a slug for the same reason; `ReadingForSale` is where the
 * trap was first found.
 */
export function CardPage({ slug }: { slug: string }) {
  const card = findMajorArcana(slug);

  if (!card) {
    throw new Error(`Unknown card "${slug}"`);
  }

  if (!card.content) {
    return (
      <ComingSoonPage
        heading={card.name}
        eyebrow={card.numeral}
        message={comingSoon.card}
        image={card.image}
        imageAlt={cardAlt(card)}
      />
    );
  }

  return <CardReferencePage card={card} content={card.content} />;
}
