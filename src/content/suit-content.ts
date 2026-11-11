import { pickCopy } from "../lib/copy.ts";
import { currentLocale } from "../lib/locale.ts";
import en from "./locales/en/suit-content.json" with { type: "json" };
import es from "./locales/es/suit-content.json" with { type: "json" };

/**
 * The four suits' copy, transcribed from the client's frames.
 *
 * The split from `library.ts` is the one `card-content.ts` already keeps:
 * `library.ts` owns a suit's *identity* — slug, label, title, href — and this
 * module owns its *words*. A CMS would one day own this file and not that one.
 *
 * **The words are in `locales/*\/suit-content.json`**, which is the catalogue
 * shape every other content module keeps; this file holds the type and the
 * reasoning, and nothing a translator has to read past.
 *
 * **Her copy is reproduced as drawn**, including her spellings and her mixed
 * `&` and `and`. What is deliberately *not* reproduced is her line-break
 * hyphenation (`fulfill-ment`, `abun-dance`): that is her layout engine fitting
 * her own measure, and this page has a different one. `suit-content.test.ts`
 * pins that.
 *
 * **The singular in each unfolding line is hers and is stored, not derived** —
 * "each Cup", "each Pentacle", "each Sword", "each Wand". The whole sentence is
 * one string, so nothing is assembled from the suit's name. That is also what
 * makes the line translatable: a Spanish singular is not a rule anything here
 * could apply.
 *
 * **The sphere boxes carry no U+00A0 joins**, unlike `card-content.ts`. Hers
 * mark the specific boxes the client pointed at — she named "growth" under
 * career and "decisions" under money — and guessing where they belong on a
 * suit would be inventing a copy change. These rely on `SpheresCarousel`'s
 * `text-pretty` alone; if she reports an orphan on a suit page, the fix is to
 * join that phrase with a non-breaking space the way `card-content.ts` does.
 */
const copy = pickCopy(en, { es }, currentLocale());

export type SuitContent = {
  /** EMOTION · INTUITION · CONNECTION — under the rule, in caps. */
  keywords: string;
  /** The three paragraphs beside the emblem. */
  essay: readonly string[];
  /** The three centred lines under the KEY THEMES rule. */
  keyThemes: readonly string[];
  spheres: { readonly love: string; readonly career: string; readonly money: string };
  /** The saying between the two rules. */
  closing: readonly string[];
  unfolding: { heading: string; body: readonly string[] };
  metaDescription: string;
};

/*
  **One named export per suit**, which is the shape `card-content.ts` uses for
  its twenty-two and the reason `library.ts` can attach them by name: a missing
  export is then a compile error, where a record lookup for a slug that does not
  exist is silently `undefined` and renders the holding page.

  The JSON is keyed by the same slugs, so each export is one lookup rather than
  a position in an array — a translator reordering the file cannot reattach a
  suit's words to the wrong suit.
*/
export const cups: SuitContent = copy.cups;

export const pentacles: SuitContent = copy.pentacles;

export const swords: SuitContent = copy.swords;

export const wands: SuitContent = copy.wands;

/** The four collected, for the tests to iterate. */
export const suitContent: Record<string, SuitContent> = { cups, pentacles, swords, wands };
