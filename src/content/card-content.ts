import { cardReference } from "@/lib/assets";
import type { ImageAsset } from "@/lib/assets";

/**
 * A Major Arcana card's reference page content — the Figma frame `357:261`
 * ("THE FOOL 2 FLAT") turned into data.
 *
 * **The Fool is the only card with a record here, and that is the mechanism.**
 * `MajorArcanaCard.content` is optional, so a card with one renders the
 * template and a card without one keeps the `ComingSoonPage` placeholder. The
 * other twenty-one are waiting on the client for their copy, and each arrives
 * as one object in this file with no code change anywhere.
 *
 * The copy is hers, transcribed from her frame, with the rule `library.ts`
 * already sets applied: **outright misspellings fixed, her naming kept.** Her
 * `the unkown` is corrected here. Her stray duplicate `MONEY` layer (357:292,
 * a second heading sitting behind the real one at a different size) is not
 * drawn, the same judgement the grid makes about The Tower appearing twice.
 *
 * **This file is the source, not a placeholder for an API call.** These pages
 * are statically exported to be indexed, so their copy belongs at build time.
 * What a backend version would cost, and the one refactor that would make it
 * cheap, is in `docs/plans/card-content-backend-readiness.md`.
 */

/** One of the four columns in the "When … Appears in a Reading" panel. */
export type AppearsColumn = {
  readonly icon: ImageAsset;
  /** Cinzel, gold, 22px — "new beginnings". */
  readonly label: string;
  readonly body: string;
};

/** One labelled symbol in the meta strip along the bottom. */
export type MetaEntry = {
  readonly symbol: ImageAsset;
  /** Cinzel, 22px, drawn under the symbol — "air", "URANUS". */
  readonly value: string;
};

export type CardMeta = {
  readonly element: MetaEntry;
  readonly planet: MetaEntry;
  readonly sign: MetaEntry;
  readonly keyword: MetaEntry;
  /**
   * The fifth of a uniform row. Her PSD draws a compass over it like the other
   * four; the Figma frame's omission of that glyph was a reading error.
   */
  readonly yesNo: MetaEntry;
};

export type MajorArcanaContent = {
  /** Cinzel, 36px — "Wonder • Trust • Beginning". */
  readonly keywords: string;
  /** Magically, 30px — "Step into the unknown". */
  readonly subtitle: string;
  /** The three paragraphs beside the artwork. */
  readonly essay: readonly string[];
  /**
   * **Exactly four.** The panel draws four columns with three rules between
   * them; a fifth or a third would break that grid silently, so the count is a
   * property of the design and belongs in the type rather than in a comment.
   */
  readonly appears: readonly [AppearsColumn, AppearsColumn, AppearsColumn, AppearsColumn];
  /** Two lines of "•"-separated phrases, centred under "LOOK FOR:". */
  readonly lookFor: readonly string[];
  /**
   * Three distinct labelled panels rather than a list — her frame draws love,
   * career and money by name, and they are not interchangeable.
   */
  readonly spheres: {
    readonly love: string;
    readonly career: string;
    readonly money: string;
  };
  /** The three lines inside the shadow panel. */
  readonly shadow: readonly string[];
  readonly meta: CardMeta;
  /**
   * The line the page closes on, between two green rules.
   *
   * **Her own two lines, not one string left to wrap.** She breaks it after
   * "know -", and `Phrase` breaks between parts rather than inside them, so
   * these are the parts — see `components/ui/Phrase.tsx`.
   */
  readonly closing: readonly string[];
  /** This page's own meta description; see `cardMeta()` in `library.ts`. */
  readonly metaDescription: string;
};

export const theFool: MajorArcanaContent = {
  keywords: "Wonder • Trust • Beginning",
  subtitle: "Step into the unknown",
  essay: [
    "The Fool is the archetype of sacred beginning—the moment when possibility remains open and the future has not yet narrowed into form. Often misunderstood as naïve or careless, The Fool understands that transformation rarely begins with complete knowledge. Every meaningful journey reaches a point where logic ends and trust begins.",
    "The Fool appears at thresholds: a new relationship, a departure, a creative leap, a relocation, an act of faith. Traditionally depicted at the edge of a precipice, it represents the tension between caution and possibility. It does not deny risk; it accepts uncertainty as part of moving toward what comes next.",
    "At its deepest level, The Fool asks what might become possible if fear were no longer making the decisions. Certainty can become a prison, and many of life's defining experiences begin before confidence arrives. The path reveals itself through movement. The invitation is not to know—it is to begin.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "new beginnings",
      body: "A new path is opening. A beginning of a journey, opportunity, relationship, or direction.",
    },
    {
      icon: cardReference.appearsIcon2,
      /* Her frame reads "the unkown" — an outright misspelling, so it is fixed. */
      label: "the unknown",
      body: "The way forward is not yet fully visible. Some answers can only be discovered by moving ahead.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "risk and trust",
      body: "Every new path carries uncertainty. Trust is the willingness to move forward without a guaranteed outcome.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "the threshold",
      body: "You are between what has been and what comes next. Crossing forward means leaving the familiar behind.",
    },
  ],
  lookFor: [
    "new opportunities • unexpected beginnings • travel or relocation",
    "creative leaps • new relationships • a change in direction",
  ],
  spheres: {
    love: "A fresh emotional start. You or someone new may be stepping into your life. Stay open to connection without expecting it to look a certain way.",
    career: "A new path, project, or opportunity is emerging. It may feel risky, but it aligns with your growth.",
    money: "Financial beginnings or a shift in direction. Take inspired action, but avoid impulsive or careless decisions.",
  },
  shadow: [
    "Recklessness • impulsivity • ignoring important details",
    "Avoiding responsibility • unrealistic expectations • acting before thinking",
    "Ground enthusiasm with awareness and preparation",
  ],
  meta: {
    element: { symbol: cardReference.symbolAir, value: "air" },
    planet: { symbol: cardReference.symbolUranus, value: "URANUS" },
    sign: { symbol: cardReference.symbolAquarius, value: "AQUARIUS" },
    keyword: { symbol: cardReference.symbolKey, value: "MANIFESTATION" },
    yesNo: { symbol: cardReference.symbolCompass, value: "YES" },
  },
  closing: ["The invitation is not to know -", "it is to begin"],
  metaDescription:
    "The Fool tarot card meaning in The World Tarot: wonder, trust and beginning. The archetype of sacred beginning — the moment when possibility remains open and the future has not yet narrowed into form.",
};
