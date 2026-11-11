import { readingArtwork, type ImageAsset } from "../lib/assets.ts";
import { pickCopy } from "../lib/copy.ts";
import { currentLocale } from "../lib/locale.ts";
import en from "./locales/en/readings.json" with { type: "json" };
import es from "./locales/es/readings.json" with { type: "json" };

/**
 * The words on this page. Structure — keys, prices, links, artwork — stays here.
 *
 * **`titleTail` is copy and moves with `title`**, because it is words. It is
 * also load-bearing layout: `ReadingCard` renders it in a `hidden lg:inline`
 * span so a phone-width card holds one line. A translator shortening a title
 * should move the break, not delete the tail.
 */
const copy = pickCopy(en, { es }, currentLocale());

/**
 * Readings page copy, from the client's two frames — `300:68` (desktop) and
 * `311:324` (mobile) — kept out of the components so the wording can move to a
 * CMS later without touching layout.
 *
 * **Where the lines break is part of the design**, and the two frames disagree
 * on purpose, so copy is stored the way each frame structures it rather than as
 * finished lines:
 *
 * - An array on a short piece of copy is a list of *phrases*, rendered by
 *   `<Phrase>`: they ride together on one line where there is room and break at
 *   the client's chosen point where there isn't. That is how a tagline set on
 *   one desktop line becomes exactly the two mobile lines she drew, with no
 *   second copy of the text and no breakpoint in the content layer.
 * - A paragraph that wraps to its measure in *both* frames is stored as one
 *   string and left to wrap. Reproducing its rendered lines as hard breaks
 *   would freeze a desktop measure into every width.
 *
 * Two spellings are corrected against the frame: Figma reads "wirtten" and
 * "interpratation" in the Traditional Tarot Readings standfirst. Typos in the
 * PSD, not house style.
 */

export const intro = {
  heading: copy.intro.heading,
  tagline: copy.intro.tagline,
  /**
   * Two blocks in the frame, broken mid-sentence before "traditional" so the
   * desktop measure lands on three even lines. Joined and balanced below `lg`
   * — see ReadingsIntro — so the phone rag does not finish on two words.
   */
  body: copy.intro.body,
};

export const signature = {
  eyebrow: copy.signature.eyebrow,
  title: copy.signature.title,
  /** One desktop line, then two; three separate lines on the phone. */
  body: copy.signature.body,
  /** The backend's key for this reading, which is what its price is asked for by. */
  productKey: "one-card",
  price: "$12",
  href: "/readings/one-card",
  image: readingArtwork.signature,
  imageAlt: copy.signature.imageAlt,
};

export const traditional = copy.traditional;

export type Reading = {
  id: string;
  /**
   * The backend's key for this reading, and **never the `id`**. They are the
   * same three strings today and they are two fields on purpose, for the reason
   * `reading-pages.ts` sets out at its own `productKey`: an `id` names a piece
   * of artwork in this list, and a product key is the catalogue's. Pricing a
   * card by treating one as the other is exactly that conflation.
   */
  productKey: string;
  /** The mobile card's title — short enough to hold one line beside the photograph. */
  title: string;
  /**
   * What the desktop card adds back. She shortens two of the three on the
   * phone rather than letting them wrap, so this is a suffix instead of a
   * second copy of the title.
   */
  titleTail?: string;
  /** Small caps under the title; one line on the desktop card, two on the phone. */
  subtitle: string;
  /**
   * Phrases, as everywhere else on this page. Setting these to the measure
   * Figma boxes them in (407, 381, 421px) very nearly works, and is a trap:
   * our Gill Sans renders a shade wider than the PSD's, and reproducing her
   * three-card break needs a width between 411 and 418px — a seven-pixel
   * window that any change of font fallback or metric would slide out of.
   * Phrases state the breaks instead of computing them, and still rejoin if
   * a card is ever wide enough to hold two on one line.
   */
  body: readonly string[];
  price: string;
  href: string;
  image: ImageAsset;
  imageAlt: string;
};

/** What is not copy: the ids, the join keys, the prices, the links, the artwork. */
const READING_STRUCTURE = [
  { id: "three-card", productKey: "three-card", price: "$52", href: "/readings/three-card", image: readingArtwork.threeCard },
  { id: "month-ahead", productKey: "month-ahead", price: "$75", href: "/readings/month-ahead", image: readingArtwork.monthAhead },
  { id: "in-depth", productKey: "in-depth", price: "$120", href: "/readings/in-depth", image: readingArtwork.inDepth },
];

export const readings: Reading[] = READING_STRUCTURE.map((reading, index) => ({
  title: copy.readings[index].title,
  /** Empty for Three Card, which has no tail. `ReadingCard` drops a tail on phones. */
  titleTail: copy.readings[index].titleTail || undefined,
  subtitle: copy.readings[index].subtitle,
  body: copy.readings[index].body,
  imageAlt: copy.readings[index].imageAlt,
  ...reading,
}));

/** Every reading's call to action reads the same; only the price changes. */
export const readingAction = copy.readingAction;

export const gift = {
  title: copy.gift.title,
  subtitle: copy.gift.subtitle,
  /** Two lines in the desktop frame; the mobile frame drops this line entirely. */
  body: copy.gift.body,
  href: "/readings/gift",
  image: readingArtwork.gift,
  imageAlt: copy.gift.imageAlt,
};

export const closing = {
  saying: copy.closing.saying,
  action: { label: readingAction, href: "/readings/one-card" },
};
