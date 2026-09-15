import { libraryCards } from "../lib/assets.ts";
import type { ImageAsset } from "../lib/assets.ts";
import { pickCopy } from "../lib/copy.ts";
import { currentLocale } from "../lib/locale.ts";
import en from "./locales/en/library.json" with { type: "json" };
import es from "./locales/es/library.json" with { type: "json" };

/**
 * The Library's copy and its two rosters: the twenty-two Major Arcana, and the
 * four suits the mini navigation above the grid points at.
 *
 * Components import from here and render; they own no strings, the rule
 * `content/README.md` sets for the whole content layer.
 *
 * **The words are in `locales/*\/library.json` since 11 September 2026**; the
 * slugs, numerals, artwork and addresses stay here. Names and suits are keyed
 * by slug rather than matched by position, so a translator cannot shift one
 * card's name onto its neighbour. Every component that renders them is a client
 * component, so they arrive in the visitor's language; see `LanguageBoundary`.
 */
const copy = pickCopy(en, { es }, currentLocale());

export type MajorArcanaCard = {
  /** Also the last segment of the card's own page, and its image's filename. */
  readonly slug: string;
  /** Roman numeral, as the roundel at the top of the artwork draws it. */
  readonly numeral: string;
  readonly name: string;
  readonly image: ImageAsset;
};

/**
 * The deck, in order, 0 through XXI.
 *
 * **The names are the client's, with her outright typos corrected and her
 * deck's own naming kept.** Her mockup letters every plaque, so this is a
 * reading of her art rather than a convention applied over it: `THE EMPORER`
 * and `THE HANGMAN` are misspellings and are fixed; `THE HIGH PRIEST` (for the
 * Hierophant) and `THE WHEEL` (for the Wheel of Fortune) are hers to choose and
 * are kept, as is `JUDGEMENT` over the American spelling. If an official list
 * arrives from her later, this array is the only place it lands.
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
  { slug: "the-fool", numeral: "0", name: copy.majorArcana["the-fool"], image: libraryCards["the-fool"] },
  { slug: "the-magician", numeral: "I", name: copy.majorArcana["the-magician"], image: libraryCards["the-magician"] },
  { slug: "the-high-priestess", numeral: "II", name: copy.majorArcana["the-high-priestess"], image: libraryCards["the-high-priestess"] },
  { slug: "the-empress", numeral: "III", name: copy.majorArcana["the-empress"], image: libraryCards["the-empress"] },
  { slug: "the-emperor", numeral: "IV", name: copy.majorArcana["the-emperor"], image: libraryCards["the-emperor"] },
  { slug: "the-high-priest", numeral: "V", name: copy.majorArcana["the-high-priest"], image: libraryCards["the-high-priest"] },
  { slug: "the-lovers", numeral: "VI", name: copy.majorArcana["the-lovers"], image: libraryCards["the-lovers"] },
  { slug: "the-chariot", numeral: "VII", name: copy.majorArcana["the-chariot"], image: libraryCards["the-chariot"] },
  { slug: "strength", numeral: "VIII", name: copy.majorArcana.strength, image: libraryCards.strength },
  { slug: "the-hermit", numeral: "IX", name: copy.majorArcana["the-hermit"], image: libraryCards["the-hermit"] },
  { slug: "the-wheel", numeral: "X", name: copy.majorArcana["the-wheel"], image: libraryCards["the-wheel"] },
  { slug: "justice", numeral: "XI", name: copy.majorArcana.justice, image: libraryCards.justice },
  { slug: "the-hanged-man", numeral: "XII", name: copy.majorArcana["the-hanged-man"], image: libraryCards["the-hanged-man"] },
  { slug: "death", numeral: "XIII", name: copy.majorArcana.death, image: libraryCards.death },
  { slug: "temperance", numeral: "XIV", name: copy.majorArcana.temperance, image: libraryCards.temperance },
  { slug: "the-devil", numeral: "XV", name: copy.majorArcana["the-devil"], image: libraryCards["the-devil"] },
  { slug: "the-tower", numeral: "XVI", name: copy.majorArcana["the-tower"], image: libraryCards["the-tower"] },
  { slug: "the-star", numeral: "XVII", name: copy.majorArcana["the-star"], image: libraryCards["the-star"] },
  { slug: "the-moon", numeral: "XVIII", name: copy.majorArcana["the-moon"], image: libraryCards["the-moon"] },
  { slug: "the-sun", numeral: "XIX", name: copy.majorArcana["the-sun"], image: libraryCards["the-sun"] },
  { slug: "judgement", numeral: "XX", name: copy.majorArcana.judgement, image: libraryCards.judgement },
  { slug: "the-world", numeral: "XXI", name: copy.majorArcana["the-world"], image: libraryCards["the-world"] },
];

/**
 * The alt text for a card's artwork, in the format the client specified:
 * "The Fool tarot card from The World Tarot".
 *
 * Derived rather than written out twenty-two times, so it cannot drift from the
 * display name. The numeral is deliberately left out: it is drawn inside the
 * image and the name is already beside it as real text, so a screen reader
 * hearing the name twice is the useful amount, and three times is not.
 *
 * The sentence is a template with `{card}` in it, so a translator can put the
 * name wherever their language wants it.
 */
export function cardAlt(card: MajorArcanaCard): string {
  return copy.cardAlt.replace("{card}", card.name);
}

export function findMajorArcana(slug: string): MajorArcanaCard | undefined {
  return majorArcana.find((card) => card.slug === slug);
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
  { slug: "swords", ...copy.suits.swords, href: "/library/swords/" },
  { slug: "cups", ...copy.suits.cups, href: "/library/cups/" },
  { slug: "wands", ...copy.suits.wands, href: "/library/wands/" },
  { slug: "pentacles", ...copy.suits.pentacles, href: "/library/pentacles/" },
];

export function findSuit(slug: string): Suit | undefined {
  return suits.find((suit) => suit.slug === slug);
}

/**
 * A suit page's title and description, as plain strings.
 *
 * The route files turn these into Next's `Metadata`; this module imports
 * nothing from the framework, which is the rule the whole content layer keeps —
 * it is copy, and copy is what a CMS would one day own.
 *
 * **English, and only ever read at build time**, like every route's metadata:
 * search is English-only by decision (ADR 0004's superseding note), so the
 * sentence stays here rather than in `locales/`, where a translator would
 * write Spanish no visitor could see.
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

export const majorArcanaNav = { label: copy.majorArcanaNav, href: libraryPath };

/** The suit navigation's landmark name, which is read aloud and never shown. */
export const sectionsLabel = copy.sectionsLabel;

export const library = {
  ...copy.library,
  /** The route's meta description, English for the reason `suitMeta` gives. */
  metaDescription:
    "An archive of symbol and meaning. Explore the imagery, stories, and wisdom woven through the Major Arcana of The World Tarot.",
};

/**
 * What a card's own page and a suit's own page say until the client's content
 * arrives. Both are real routes with real artwork — they simply do not pretend
 * to be the reference pages that have their own issues and their own designs.
 */
export const comingSoon = copy.comingSoon;
