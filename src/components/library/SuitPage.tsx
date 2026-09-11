"use client";

import { ComingSoonPage } from "@/components/library/ComingSoonPage";
import { comingSoon, findSuit } from "@/content/library";

/**
 * A suit's reference page — **a placeholder for now.**
 *
 * One page per suit, describing the suit, with no breakdown of the cards inside
 * it at this stage. Each is to have its own design rather than share a template
 * the way the Major Arcana pages do, and none of the four have been drawn yet,
 * so what the four routes share today is this holding page — which is a
 * statement about the content not existing, not a template for what will.
 *
 * The four route files exist as their own directories rather than as another
 * dynamic segment: static segments win over `[card]` in Next's matching, which
 * is what keeps `/library/swords/` from resolving as a card named "swords", and
 * they will diverge into four different designs anyway.
 */
export function SuitPage({ slug }: { slug: string }) {
  const suit = findSuit(slug);

  if (!suit) {
    throw new Error(`Unknown suit "${slug}"`);
  }

  return <ComingSoonPage heading={suit.title} message={comingSoon.suit} current={suit.slug} />;
}
