import { cardReference, cardSymbols } from "@/lib/assets";
import type { ImageAsset } from "@/lib/assets";

import { pickCopy } from "../lib/copy.ts";
import { currentLocale } from "../lib/locale.ts";
import en from "./locales/en/card-content.json" with { type: "json" };
import es from "./locales/es/card-content.json" with { type: "json" };

/**
 * A Major Arcana card's reference page content — the Figma frame `357:261`
 * ("THE FOOL 2 FLAT") turned into data.
 *
 * **All twenty-two cards have a record here now.** The Fool's was transcribed
 * from her frame; the other twenty-one were imported from her
 * `LIBRARY CARDS CONTENT 1.xls` by `scripts/import-card-content.mjs`, which is
 * committed so the import can be re-run but is not part of the build.
 *
 * `MajorArcanaCard.content` stays optional, which is still the mechanism — the
 * four suit pages have no record and keep their `ComingSoonPage` placeholder —
 * but no Major Arcana card reaches it any more.
 *
 * **The words are in `locales/*\/card-content.json`**, keyed by the same slugs
 * `library.ts` uses, and this file assembles each card from them through
 * `card()` below. What stays here is everything that is not a string: the
 * types, the four `appears` icons, and `SYMBOLS` — the glyph each card's meta
 * row draws, which is picked by the card rather than by the language.
 *
 * **The imported copy is verbatim, and that is a deliberate departure.** The
 * rule `library.ts` keeps for card names — outright misspellings fixed — was
 * NOT applied to the twenty-one, at the client's instruction of 2026-09-28. So
 * her `SOVREIGNTY` (The Emperor's keyword), her `fufillment` (The Empress's
 * summary), her Magician shadow text (a verbatim copy of The Fool's) and her
 * Wheel/Hermit shared quote all ship as she wrote them, and are raised with her
 * instead. **The Fool is the exception**: his `the unkown` correction predates
 * that instruction and stays, which makes his the only non-verbatim page.
 *
 * **That instruction governs her English, not a translation.** A typo cannot be
 * reproduced in Spanish — there is no Spanish spelling of `SOVREIGNTY` — so
 * `locales/es/card-content.json` carries correct Spanish prose while English
 * stays as she wrote it. The two locales are deliberately not equivalent here.
 *
 * Her stray duplicate `MONEY` layer (357:292, a second heading sitting behind
 * the real one at a different size) is still not drawn, the same judgement the
 * grid makes about The Tower appearing twice.
 *
 * **Two separator characters were normalized on import, which is not a copy
 * correction.** Her sheet breaks eighteen of the twenty-one essays with U+2028
 * rather than a newline, and mixes U+00B7 with U+2022 as the bullet in
 * fifty-seven places. Both are invisible in an editor; the first would collapse
 * an essay into one paragraph and the second would draw two different dots on
 * one line. `card-content.test.ts` pins that neither survives.
 *
 * **Six non-breaking spaces live in the JSON and are load-bearing.** The
 * Fool's three sphere strings each end on a U+00A0-joined phrase, because the
 * client asked that no box end on a lone word — she named "growth" under
 * career and "decisions" under money. They are invisible in an editor: they
 * look exactly like ordinary spaces, and retyping one of those lines, or
 * letting a tool "clean up" whitespace, silently undoes the fix. A translator
 * should keep the same device wherever their own text would orphan a word;
 * `SpheresCarousel` sets `text-pretty`, which handles the general case.
 *
 * **This file is the source, not a placeholder for an API call.** These pages
 * are statically exported to be indexed, so their copy belongs at build time.
 * What a backend version would cost, and the one refactor that would make it
 * cheap, is in `docs/plans/card-content-backend-readiness.md`.
 */
const copy = pickCopy(en, { es }, currentLocale());

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

/**
 * The four icons above the "Appears in a Reading" columns, in the order the
 * panel draws them.
 *
 * **The same four for every card**, which is why they are here once rather
 * than twenty-two times: her frames vary the words under these columns, never
 * the marks above them.
 */
const APPEARS_ICONS = [
  cardReference.appearsIcon1,
  cardReference.appearsIcon2,
  cardReference.appearsIcon3,
  cardReference.appearsIcon4,
] as const;

/**
 * Which glyph each card's meta row draws, by `cardSymbols` key.
 *
 * **A card's element, planet and sign are facts about the card, so the glyph
 * is chosen here while the word is translated in the JSON.** Aquarius is the
 * same constellation in Spanish and keeps the same mark; only "AQUARIUS"
 * changes.
 *
 * `keyword` is absent because all twenty-two draw `cardReference.symbolKey` —
 * a key, not a per-card glyph. The verdict marks are hers and distinguish yes,
 * no and maybe; The Fool's old generic `symbol-compass` was replaced by them,
 * which was a real change rather than a dedupe. His element, planet and sign
 * glyphs were one-off 1x exports (`symbol-air`, `symbol-uranus`,
 * `symbol-aquarius`) of artwork the shared set already held at 2x, so they
 * were dropped rather than kept as a second file drawing one glyph.
 */
const SYMBOLS: Record<
  string,
  {
    readonly element: keyof typeof cardSymbols;
    readonly planet: keyof typeof cardSymbols;
    readonly sign: keyof typeof cardSymbols;
    readonly yesNo: keyof typeof cardSymbols;
  }
> = {
  "the-fool": { element: "air", planet: "uranus", sign: "aquarius", yesNo: "yes" },
  "the-magician": { element: "air", planet: "mercury", sign: "gemini", yesNo: "yes" },
  "the-high-priestess": { element: "water", planet: "moon", sign: "cancer", yesNo: "maybe" },
  "the-empress": { element: "earth", planet: "venus", sign: "taurus", yesNo: "yes" },
  "the-emperor": { element: "fire", planet: "mars", sign: "aries", yesNo: "yes" },
  "the-high-priest": { element: "earth", planet: "venus", sign: "taurus", yesNo: "maybe" },
  "the-lovers": { element: "air", planet: "venus", sign: "gemini", yesNo: "yes" },
  "the-chariot": { element: "water", planet: "moon", sign: "cancer", yesNo: "yes" },
  strength: { element: "fire", planet: "sun", sign: "leo", yesNo: "yes" },
  "the-hermit": { element: "earth", planet: "mercury", sign: "virgo", yesNo: "maybe" },
  "the-wheel": { element: "fire", planet: "jupiter", sign: "sagittarius", yesNo: "yes" },
  justice: { element: "air", planet: "venus", sign: "libra", yesNo: "yes" },
  "the-hangman": { element: "water", planet: "neptune", sign: "pisces", yesNo: "maybe" },
  death: { element: "water", planet: "pluto", sign: "scorpio", yesNo: "no" },
  temperance: { element: "fire", planet: "jupiter", sign: "sagittarius", yesNo: "yes" },
  "the-devil": { element: "earth", planet: "saturn", sign: "capricorn", yesNo: "no" },
  "the-tower": { element: "fire", planet: "mars", sign: "aries", yesNo: "no" },
  "the-star": { element: "air", planet: "uranus", sign: "aquarius", yesNo: "yes" },
  "the-moon": { element: "water", planet: "neptune", sign: "pisces", yesNo: "no" },
  "the-sun": { element: "fire", planet: "sun", sign: "leo", yesNo: "yes" },
  judgement: { element: "fire", planet: "pluto", sign: "scorpio", yesNo: "yes" },
  "the-world": { element: "earth", planet: "saturn", sign: "capricorn", yesNo: "yes" },
};

/**
 * One card, assembled from its words and its glyphs.
 *
 * The cast on `appears` is the one place the shape is asserted rather than
 * inferred: `MajorArcanaContent` requires exactly four columns, and a `map`
 * over a JSON array widens to `AppearsColumn[]`. `card-content.test.ts` checks
 * that all twenty-two have four, which is the check that would otherwise be
 * the compiler's.
 */
function card(slug: string): MajorArcanaContent {
  const words = copy[slug as keyof typeof copy];
  const symbols = SYMBOLS[slug];

  return {
    keywords: words.keywords,
    subtitle: words.subtitle,
    essay: words.essay,
    appears: words.appears.map((column, i) => ({
      icon: APPEARS_ICONS[i],
      label: column.label,
      body: column.body,
    })) as unknown as MajorArcanaContent["appears"],
    lookFor: words.lookFor,
    spheres: words.spheres,
    shadow: words.shadow,
    meta: {
      element: { symbol: cardSymbols[symbols.element], value: words.meta.element },
      planet: { symbol: cardSymbols[symbols.planet], value: words.meta.planet },
      sign: { symbol: cardSymbols[symbols.sign], value: words.meta.sign },
      keyword: { symbol: cardReference.symbolKey, value: words.meta.keyword },
      yesNo: { symbol: cardSymbols[symbols.yesNo], value: words.meta.yesNo },
    },
    closing: words.closing,
    metaDescription: words.metaDescription,
  };
}

/*
  **One named export per card**, which is what lets `library.ts` attach them by
  name: a missing export is a compile error, where a record lookup for a slug
  that does not exist is silently `undefined` and renders the holding page.
*/
export const theFool: MajorArcanaContent = card("the-fool");

export const theMagician: MajorArcanaContent = card("the-magician");

export const theHighPriestess: MajorArcanaContent = card("the-high-priestess");

export const theEmpress: MajorArcanaContent = card("the-empress");

export const theEmperor: MajorArcanaContent = card("the-emperor");

export const theHighPriest: MajorArcanaContent = card("the-high-priest");

export const theLovers: MajorArcanaContent = card("the-lovers");

export const theChariot: MajorArcanaContent = card("the-chariot");

export const strength: MajorArcanaContent = card("strength");

export const theHermit: MajorArcanaContent = card("the-hermit");

export const theWheel: MajorArcanaContent = card("the-wheel");

export const justice: MajorArcanaContent = card("justice");

export const theHangman: MajorArcanaContent = card("the-hangman");

export const death: MajorArcanaContent = card("death");

export const temperance: MajorArcanaContent = card("temperance");

export const theDevil: MajorArcanaContent = card("the-devil");

export const theTower: MajorArcanaContent = card("the-tower");

export const theStar: MajorArcanaContent = card("the-star");

export const theMoon: MajorArcanaContent = card("the-moon");

export const theSun: MajorArcanaContent = card("the-sun");

export const judgement: MajorArcanaContent = card("judgement");

export const theWorld: MajorArcanaContent = card("the-world");

/** The twenty-two collected, keyed as `library.ts` keys them. */
export const majorArcanaContent: Record<string, MajorArcanaContent> = {
  "the-fool": theFool,
  "the-magician": theMagician,
  "the-high-priestess": theHighPriestess,
  "the-empress": theEmpress,
  "the-emperor": theEmperor,
  "the-high-priest": theHighPriest,
  "the-lovers": theLovers,
  "the-chariot": theChariot,
  strength: strength,
  "the-hermit": theHermit,
  "the-wheel": theWheel,
  justice: justice,
  "the-hangman": theHangman,
  death: death,
  temperance: temperance,
  "the-devil": theDevil,
  "the-tower": theTower,
  "the-star": theStar,
  "the-moon": theMoon,
  "the-sun": theSun,
  judgement: judgement,
  "the-world": theWorld,
};
