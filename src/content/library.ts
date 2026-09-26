import { theFool, type MajorArcanaContent } from "@/content/card-content";
import { libraryCards } from "@/lib/assets";
import type { ImageAsset } from "@/lib/assets";

/**
 * The Library's copy and its two rosters: the twenty-two Major Arcana, and the
 * four suits the mini navigation above the grid points at.
 *
 * Components import from here and render; they own no strings, the rule
 * `content/README.md` sets for the whole content layer.
 */

export type MajorArcanaCard = {
  /** Also the last segment of the card's own page, and its image's filename. */
  readonly slug: string;
  /** Roman numeral, as the roundel at the top of the artwork draws it. */
  readonly numeral: string;
  readonly name: string;
  readonly image: ImageAsset;
  /**
   * The card's reference page, when it has one.
   *
   * **Optional is the mechanism, not an oversight**: a card with content
   * renders the template built from the client's Fool frame, and a card
   * without keeps the `ComingSoonPage` placeholder. Twenty-one are waiting on
   * her copy, and each one arrives as an object in `card-content.ts`.
   */
  readonly content?: MajorArcanaContent;
};

/**
 * The deck, in order, 0 through XXI.
 *
 * **The names are the client's, with her outright typos corrected and her
 * deck's own naming kept.** Her mockup letters every plaque, so this is a
 * reading of her art rather than a convention applied over it: `THE EMPORER` is
 * a misspelling and is fixed; `THE HANGMAN` (for the Hanged Man), `THE HIGH
 * PRIEST` (for the Hierophant) and `THE WHEEL` (for the Wheel of Fortune) are
 * hers to choose and are kept, as is `JUDGEMENT` over the American spelling. If
 * an official list arrives from her later, this array is the only place it
 * lands.
 *
 * `THE HANGMAN` was read as a typo and corrected to "The Hanged Man" when this
 * array was first written; she confirmed on 26 September 2026 that it is the
 * deck's name, so it moved to the kept column along with her other renamings.
 *
 * **The order is numerical, and her mockup's is not.** Her first row runs The
 * Fool, The Magician, *The Tower*, The Empress — The Tower standing in the slot
 * that belongs to The High Priestess, and appearing again in its own place at
 * XVI. Figma's layer names disagree with her pixels there (the layer in that
 * slot is `II - THE HIGH PRIESTESS`), so it is a stray layer in the mockup
 * rather than an instruction about sequence.
 *
 * The filenames she delivered carry her spellings and inconsistent zero-padding
 * (`0-the-fool` beside `01-the-magician`); those are mapped to these slugs in
 * `scripts/optimize-library-cards.mjs` and appear nowhere else.
 */
export const majorArcana: readonly MajorArcanaCard[] = [
  { slug: "the-fool", numeral: "0", name: "The Fool", image: libraryCards["the-fool"], content: theFool },
  { slug: "the-magician", numeral: "I", name: "The Magician", image: libraryCards["the-magician"] },
  { slug: "the-high-priestess", numeral: "II", name: "The High Priestess", image: libraryCards["the-high-priestess"] },
  { slug: "the-empress", numeral: "III", name: "The Empress", image: libraryCards["the-empress"] },
  { slug: "the-emperor", numeral: "IV", name: "The Emperor", image: libraryCards["the-emperor"] },
  { slug: "the-high-priest", numeral: "V", name: "The High Priest", image: libraryCards["the-high-priest"] },
  { slug: "the-lovers", numeral: "VI", name: "The Lovers", image: libraryCards["the-lovers"] },
  { slug: "the-chariot", numeral: "VII", name: "The Chariot", image: libraryCards["the-chariot"] },
  { slug: "strength", numeral: "VIII", name: "Strength", image: libraryCards.strength },
  { slug: "the-hermit", numeral: "IX", name: "The Hermit", image: libraryCards["the-hermit"] },
  { slug: "the-wheel", numeral: "X", name: "The Wheel", image: libraryCards["the-wheel"] },
  { slug: "justice", numeral: "XI", name: "Justice", image: libraryCards.justice },
  { slug: "the-hangman", numeral: "XII", name: "The Hangman", image: libraryCards["the-hangman"] },
  { slug: "death", numeral: "XIII", name: "Death", image: libraryCards.death },
  { slug: "temperance", numeral: "XIV", name: "Temperance", image: libraryCards.temperance },
  { slug: "the-devil", numeral: "XV", name: "The Devil", image: libraryCards["the-devil"] },
  { slug: "the-tower", numeral: "XVI", name: "The Tower", image: libraryCards["the-tower"] },
  { slug: "the-star", numeral: "XVII", name: "The Star", image: libraryCards["the-star"] },
  { slug: "the-moon", numeral: "XVIII", name: "The Moon", image: libraryCards["the-moon"] },
  { slug: "the-sun", numeral: "XIX", name: "The Sun", image: libraryCards["the-sun"] },
  { slug: "judgement", numeral: "XX", name: "Judgement", image: libraryCards.judgement },
  { slug: "the-world", numeral: "XXI", name: "The World", image: libraryCards["the-world"] },
];

/**
 * The alt text for a card's artwork, in the format the client specified:
 * "The Fool tarot card from The World Tarot".
 *
 * Derived rather than written out twenty-two times, so it cannot drift from the
 * display name. The numeral is deliberately left out: it is drawn inside the
 * image and the name is already beside it as real text, so a screen reader
 * hearing the name twice is the useful amount, and three times is not.
 */
export function cardAlt(card: MajorArcanaCard): string {
  return `${card.name} tarot card from The World Tarot`;
}

export function findMajorArcana(slug: string): MajorArcanaCard | undefined {
  return majorArcana.find((card) => card.slug === slug);
}

/**
 * A card page's title and description, in the shape the route turns into Next's
 * `Metadata` — the same split `suitMeta` already keeps, so this module imports
 * nothing from the framework.
 *
 * **The title carries the URL's intent.** The whole reason for
 * `/library/the-fool-tarot-card-meaning/` is the phrase "tarot card meaning",
 * and a title reading only "The Fool" would spend that work without collecting
 * it. A card still awaiting the client's copy keeps a generic description
 * rather than inventing one.
 */
export function cardMeta(card: MajorArcanaCard): { title: string; description: string } {
  return {
    title: `${card.name} Tarot Card Meaning`,
    description:
      card.content?.metaDescription ??
      `${card.name} (${card.numeral}) in the Major Arcana of The World Tarot.`,
  };
}

/**
 * The suffixes the SEO URLs carry, and the reason `slug` stays short.
 *
 * The pattern is fixed: `/library/{card-name}-tarot-card-meaning`, and the
 * equivalent `-tarot-suit-meaning` for a suit. Both are **derived** from `slug`
 * rather than stored beside it — `slug` is already the card's identity, its
 * image filename and its lookup key, and a second spelling of the same thing is
 * a second thing to keep in step.
 */
const CARD_SUFFIX = "-tarot-card-meaning";
const SUIT_SUFFIX = "-tarot-suit-meaning";

/**
 * What the pattern admits: lowercase words, hyphen-separated, nothing else.
 *
 * Exported so the test can *check* the brief's "lowercase, hyphenated, no
 * special characters" rather than restate it.
 */
export const CARD_PATH_PATTERN = /^\/library\/[a-z]+(?:-[a-z]+)*-tarot-card-meaning\/$/;

export function cardPath(card: MajorArcanaCard): string {
  return `/library/${card.slug}${CARD_SUFFIX}/`;
}

/**
 * The inverse of `cardPath`, for the dynamic segment to resolve.
 *
 * **A bare slug deliberately returns `undefined`**: the twenty-two SEO URLs are
 * the whole route space, so `/library/the-fool/` is a 404 rather than a second
 * URL serving the same page — which is the thing an SEO URL pattern exists to
 * prevent.
 */
export function findMajorArcanaByPath(segment: string): MajorArcanaCard | undefined {
  return segment.endsWith(CARD_SUFFIX)
    ? findMajorArcana(segment.slice(0, -CARD_SUFFIX.length))
    : undefined;
}

export type Suit = {
  readonly slug: string;
  /** As the navigation sets it — Gill Sans caps, per the frame. */
  readonly label: string;
  /** As a heading reads it, where caps would be shouting. */
  readonly title: string;
  readonly href: string;
};

/**
 * The four suits, each of which gets **one** reference page describing the suit
 * — not a page per card. Their designs are the client's to draw and none have
 * arrived, so the routes exist and say so rather than 404ing.
 */
export const suits: readonly Suit[] = [
  { slug: "swords", label: "SWORDS", title: "Swords", href: "/library/swords/" },
  { slug: "cups", label: "CUPS", title: "Cups", href: "/library/cups/" },
  { slug: "wands", label: "WANDS", title: "Wands", href: "/library/wands/" },
  { slug: "pentacles", label: "PENTACLES", title: "Pentacles", href: "/library/pentacles/" },
];

export function findSuit(slug: string): Suit | undefined {
  return suits.find((suit) => suit.slug === slug);
}

/**
 * A suit's SEO path — **confirmed, and not yet applied.**
 *
 * The four suit routes still answer at `/library/swords/` and keep their
 * placeholder pages until their designs arrive. This lives here so the pattern
 * is recorded in code rather than only in the ticket, and so the rename, when
 * it comes, is this one line plus four directory moves.
 */
export function suitPath(suit: Suit): string {
  return `/library/${suit.slug}${SUIT_SUFFIX}/`;
}

/**
 * A suit page's title and description, as plain strings.
 *
 * The route files turn these into Next's `Metadata`; this module imports
 * nothing from the framework, which is the rule the whole content layer keeps —
 * it is copy, and copy is what a CMS would one day own.
 */
export function suitMeta(slug: string): { title: string; description: string } {
  const suit = findSuit(slug);

  if (!suit) {
    throw new Error(`Unknown suit "${slug}"`);
  }

  return {
    title: suit.title,
    description: `The suit of ${suit.title} in the Minor Arcana of The World Tarot.`,
  };
}

/**
 * The grid itself is the Library's default view, so Major Arcana is the page
 * rather than a section of it — the ticket is explicit that it "acts as the way
 * back to the default grid view", not a distinct content route.
 */
export const libraryPath = "/library/";

export const majorArcanaNav = { label: "MAJOR ARCANA", href: libraryPath };

export const library = {
  title: "The World Tarot Library",
  tagline: "AN ARCHIVE OF THE SYMBOL AND MEANING",
  blurb: "Explore the imagery, stories, and wisdom woven through the Tarot",
  closing: "The library - worlds without end",
  metaDescription:
    "An archive of symbol and meaning. Explore the imagery, stories, and wisdom woven through the Major Arcana of The World Tarot.",
};

/**
 * What a card's own page and a suit's own page say until the client's content
 * arrives. Both are real routes with real artwork — they simply do not pretend
 * to be the reference pages that have their own issues and their own designs.
 */
export const comingSoon = {
  card: "This card's full reference is being written.",
  suit: "This suit's reference is being written.",
  back: "Return to the Library",
};
