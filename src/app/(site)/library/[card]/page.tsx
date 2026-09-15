import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CardReferencePage } from "@/components/library/card/CardReferencePage";
import { ComingSoonPage } from "@/components/library/ComingSoonPage";
import { cardAlt, cardMeta, cardPath, comingSoon, findMajorArcanaByPath, majorArcana } from "@/content/library";
import { siteName } from "@/content/site";

/**
 * A Major Arcana card's own reference page.
 *
 * **The segment is the SEO URL, not the slug** — `the-fool-tarot-card-meaning`.
 * `content/library.ts` derives it from the slug and resolves it back; this file
 * only ever hands it the segment it was routed with.
 *
 * The twenty-two are the whole route space, so the export is fully static and
 * anything else 404s — including `/library/the-fool/`, which is deliberate:
 * two URLs serving one page is the thing an SEO pattern exists to prevent.
 *
 * **The Fool renders the template and the other twenty-one do not**, because
 * only her Fool content exists. That is the one `if` below, and it disappears
 * for each card as its copy lands in `card-content.ts`.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return majorArcana.map((card) => ({ card: cardPath(card).slice("/library/".length, -1) }));
}

export async function generateMetadata({ params }: { params: Promise<{ card: string }> }): Promise<Metadata> {
  const card = findMajorArcanaByPath((await params).card);

  if (!card) {
    return {};
  }

  const { title, description } = cardMeta(card);

  return { title: `${title} — ${siteName}`, description };
}

export default async function MajorArcanaCardPage({ params }: { params: Promise<{ card: string }> }) {
  const card = findMajorArcanaByPath((await params).card);

  if (!card) {
    notFound();
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
