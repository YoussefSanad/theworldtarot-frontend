import { readingArtwork, type ImageAsset } from "@/lib/assets";

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
  heading: "Readings",
  tagline: ["step into the parlor.", "leave the ordinary behind."],
  /**
   * Two paragraphs in the frame, broken mid-sentence before "traditional" so
   * the desktop measure lands on three even lines. Each wraps on its own below
   * that.
   */
  body: [
    "Begin with our signature interactive experience, where the cards come to life and answer your question in real time. Or choose one of our",
    "traditional written readings for a deeper exploration of your path.",
  ],
};

export const signature = {
  eyebrow: ["The World Tarot", "Signature Experience"],
  title: "1 Card Reading",
  /** One desktop line, then two; three separate lines on the phone. */
  body: ["Ask your question.", "Reveal your card.", "Watch it come to life."],
  price: "$12",
  href: "/readings/one-card",
  image: readingArtwork.signature,
  imageAlt: "A tarot card face down on a wooden table beside a lit candle",
};

export const traditional = {
  heading: "Traditional Tarot Readings",
  body: "Thoughtfully written readings delivered after careful interpretation of your cards.",
};

export type Reading = {
  id: string;
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

export const readings: Reading[] = [
  {
    id: "three-card",
    title: "3 Card Reading",
    subtitle: "past • present • future",
    body: ["Explore the deeper story", "behind your question", "through the wisdom of cards."],
    price: "$52",
    href: "/readings/three-card",
    image: readingArtwork.threeCard,
    imageAlt: "Three tarot cards laid face down in a row on a wooden table",
  },
  {
    id: "month-ahead",
    title: "Month Ahead",
    titleTail: " Reading",
    subtitle: "discover what lies ahead",
    body: ["Prepare for the month", "ahead with insight into", "what’s to come."],
    price: "$75",
    href: "/readings/month-ahead",
    image: readingArtwork.monthAhead,
    imageAlt: "A five card tarot spread beside a pocket watch and coins",
  },
  {
    id: "in-depth",
    title: "In-Depth",
    titleTail: " Reading",
    subtitle: "the full picture",
    body: ["Discover the complete picture", "through the Celtic Cross."],
    price: "$125",
    href: "/readings/in-depth",
    image: readingArtwork.inDepth,
    imageAlt: "A Celtic Cross tarot spread laid out across a wooden table",
  },
];

/** Every reading's call to action reads the same; only the price changes. */
export const readingAction = "BEGIN YOUR READING";

export const gift = {
  title: "Gift a Reading",
  subtitle: ["a gift", "of insight"],
  /** Two lines in the desktop frame; the mobile frame drops this line entirely. */
  body: ["Give a meaningful reading, accompanied", "by your personal message."],
  href: "/readings/gift",
  image: readingArtwork.gift,
  imageAlt: "A gold wrapped gift box tied with ribbon",
};

export const closing = {
  saying: ["The future whispers long", "before it arrives"],
  action: { label: readingAction, href: "/readings/one-card" },
};
