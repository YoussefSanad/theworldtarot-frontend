import {
  death,
  judgement,
  justice,
  strength,
  temperance,
  theChariot,
  theDevil,
  theEmperor,
  theEmpress,
  theFool,
  theHangman,
  theHermit,
  theHighPriest,
  theHighPriestess,
  theLovers,
  theMagician,
  theMoon,
  theStar,
  theSun,
  theTower,
  theWheel,
  theWorld,
  type MajorArcanaContent,
} from "@/content/card-content";
import { cups, pentacles, swords, wands, type SuitContent } from "@/content/suit-content";
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
  { slug: "the-magician", numeral: "I", name: "The Magician", image: libraryCards["the-magician"] , content: theMagician },
  { slug: "the-high-priestess", numeral: "II", name: "The High Priestess", image: libraryCards["the-high-priestess"] , content: theHighPriestess },
  { slug: "the-empress", numeral: "III", name: "The Empress", image: libraryCards["the-empress"] , content: theEmpress },
  { slug: "the-emperor", numeral: "IV", name: "The Emperor", image: libraryCards["the-emperor"] , content: theEmperor },
  { slug: "the-high-priest", numeral: "V", name: "The High Priest", image: libraryCards["the-high-priest"] , content: theHighPriest },
  { slug: "the-lovers", numeral: "VI", name: "The Lovers", image: libraryCards["the-lovers"] , content: theLovers },
  { slug: "the-chariot", numeral: "VII", name: "The Chariot", image: libraryCards["the-chariot"] , content: theChariot },
  { slug: "strength", numeral: "VIII", name: "Strength", image: libraryCards.strength , content: strength },
  { slug: "the-hermit", numeral: "IX", name: "The Hermit", image: libraryCards["the-hermit"] , content: theHermit },
  { slug: "the-wheel", numeral: "X", name: "The Wheel", image: libraryCards["the-wheel"] , content: theWheel },
  { slug: "justice", numeral: "XI", name: "Justice", image: libraryCards.justice , content: justice },
  { slug: "the-hangman", numeral: "XII", name: "The Hangman", image: libraryCards["the-hangman"] , content: theHangman },
  { slug: "death", numeral: "XIII", name: "Death", image: libraryCards.death , content: death },
  { slug: "temperance", numeral: "XIV", name: "Temperance", image: libraryCards.temperance , content: temperance },
  { slug: "the-devil", numeral: "XV", name: "The Devil", image: libraryCards["the-devil"] , content: theDevil },
  { slug: "the-tower", numeral: "XVI", name: "The Tower", image: libraryCards["the-tower"] , content: theTower },
  { slug: "the-star", numeral: "XVII", name: "The Star", image: libraryCards["the-star"] , content: theStar },
  { slug: "the-moon", numeral: "XVIII", name: "The Moon", image: libraryCards["the-moon"] , content: theMoon },
  { slug: "the-sun", numeral: "XIX", name: "The Sun", image: libraryCards["the-sun"] , content: theSun },
  { slug: "judgement", numeral: "XX", name: "Judgement", image: libraryCards.judgement , content: judgement },
  { slug: "the-world", numeral: "XXI", name: "The World", image: libraryCards["the-world"] , content: theWorld },
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
 * `/library/the-fool-tarot-meaning/` is the phrase "tarot meaning",
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
 * The pattern is fixed: `/library/{card-name}-tarot-meaning`, and the
 * equivalent `-tarot-suit-meaning` for a suit. Both are **derived** from `slug`
 * rather than stored beside it — `slug` is already the card's identity, its
 * image filename and its lookup key, and a second spelling of the same thing is
 * a second thing to keep in step.
 */
const CARD_SUFFIX = "-tarot-meaning";
const SUIT_SUFFIX = "-tarot-suit-meaning";

/**
 * What the pattern admits: lowercase words, hyphen-separated, nothing else.
 *
 * Exported so the test can *check* the brief's "lowercase, hyphenated, no
 * special characters" rather than restate it.
 */
export const CARD_PATH_PATTERN = /^\/library\/[a-z]+(?:-[a-z]+)*-tarot-meaning\/$/;

/** The suit equivalent, for the same reason: the brief is checked, not restated. */
export const SUIT_PATH_PATTERN = /^\/library\/[a-z]+(?:-[a-z]+)*-tarot-suit-meaning\/$/;

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
  /**
   * Her copy for this suit, if it exists.
   *
   * **Optional for the same reason `MajorArcanaCard.content` is**: a suit whose
   * words have not arrived still has a route, and answers with the holding page
   * rather than a 404. All four carry copy today, so the empty arm is
   * unreachable — it costs one line and makes a suit whose copy is pulled a
   * content change rather than a code change.
   */
  readonly content?: SuitContent;
};

/**
 * The four suits, each of which gets **one** reference page describing the suit
 * — not a page per card.
 *
 * **`href` carries the SEO pattern now**, where it was `/library/{slug}/` while
 * the pages were placeholders. `suitPath` below is the single spelling of that
 * pattern; these four literals and the four route directories are what it
 * describes.
 */
export const suits: readonly Suit[] = [
  { slug: "swords", label: "SWORDS", title: "Swords", href: `/library/swords${SUIT_SUFFIX}/`, content: swords },
  { slug: "cups", label: "CUPS", title: "Cups", href: `/library/cups${SUIT_SUFFIX}/`, content: cups },
  { slug: "wands", label: "WANDS", title: "Wands", href: `/library/wands${SUIT_SUFFIX}/`, content: wands },
  { slug: "pentacles", label: "PENTACLES", title: "Pentacles", href: `/library/pentacles${SUIT_SUFFIX}/`, content: pentacles },
];

export function findSuit(slug: string): Suit | undefined {
  return suits.find((suit) => suit.slug === slug);
}

/**
 * A suit's SEO path, and **the single spelling of the pattern.**
 *
 * It was recorded here as "confirmed, and not yet applied" while the four
 * routes answered at `/library/swords/` with holding pages — applying it was
 * always "this one line plus four directory moves", and that is what the move
 * to her real pages did. `suits[].href` and the four route directories now both
 * follow it; a test asserts they agree.
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
/**
 * A suit's meta description: hers when she has written one, the generated
 * sentence otherwise.
 *
 * The fallback is what every suit answered with while the pages were
 * placeholders, and it stays for the same reason the holding page does — a suit
 * whose copy is pulled should still describe itself to a search engine rather
 * than ship `undefined`.
 *
 * **Its own exported function so that arm can be tested**, since no real suit
 * reaches it: all four carry copy, so the only way to exercise the fallback is
 * to call this with a constructed `Suit`.
 */
export function suitDescription(suit: Suit): string {
  return (
    suit.content?.metaDescription ??
    `The suit of ${suit.title} in the Minor Arcana of The World Tarot.`
  );
}

export function suitMeta(slug: string): { title: string; description: string } {
  const suit = findSuit(slug);

  if (!suit) {
    throw new Error(`Unknown suit "${slug}"`);
  }

  return { title: suit.title, description: suitDescription(suit) };
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
