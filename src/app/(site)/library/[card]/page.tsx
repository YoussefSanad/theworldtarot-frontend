import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CardPage } from "@/components/library/CardPage";
import { findMajorArcana, majorArcana } from "@/content/library";
import { siteName } from "@/content/site";

/**
 * A Major Arcana card's own reference page — **a placeholder for now.**
 *
 * The Fool's page is the confirmed template for all twenty-two and is being
 * built under its own issue; the remaining twenty-one are waiting on the
 * client for their artwork and text. What this route does today is exist, so
 * that clicking a card in the grid goes somewhere, which is the behaviour the
 * ticket asks for (a page, not the modal that was discussed before it).
 *
 * The twenty-two are the whole route space, so the export is fully static and
 * anything else 404s rather than rendering an empty card.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return majorArcana.map((card) => ({ card: card.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ card: string }> }): Promise<Metadata> {
  const card = findMajorArcana((await params).card);

  if (!card) {
    return {};
  }

  return {
    title: `${card.name} — ${siteName}`,
    description: `${card.name} (${card.numeral}) in the Major Arcana of The World Tarot.`,
  };
}

export default async function MajorArcanaCardPage({ params }: { params: Promise<{ card: string }> }) {
  const card = findMajorArcana((await params).card);

  if (!card) {
    notFound();
  }

  return <CardPage slug={card.slug} />;
}
