import { learnArtwork, type ImageAsset } from "@/lib/assets";

import { pickCopy } from "../lib/copy.ts";
import { currentLocale } from "../lib/locale.ts";
import en from "./locales/en/learn.json" with { type: "json" };
import es from "./locales/es/learn.json" with { type: "json" };

/**
 * The Learn page's copy (Figma node 395:55), kept out of the components so the
 * wording can move to a CMS later without touching layout.
 *
 * **Transcribed from the client's PSD export rather than from Figma.** The
 * PSD-to-Figma conversion is lossy, so `asset dump/learn/LEARN.png` is the
 * authority for what these lines say and where they break. There is no mobile
 * mockup — see `src/components/learn/README.md`.
 *
 * **The words are in `locales/*\/learn.json`**; the image references and the
 * reasoning stay here. The three picture-bearing rosters below — the postcards,
 * the four marks and the three map groups — are **keyed by name in the JSON**
 * rather than being arrays of their own, so a translator cannot reattach a
 * caption to the wrong picture by reordering the file. The order those rosters
 * are *drawn* in is this file's, which is the one thing about them that is
 * layout rather than language.
 *
 * **Three misspellings in her draft are corrected**, each noted at the key it
 * belongs to so the client can put any of them back if it was deliberate. Her
 * phrasing is otherwise untouched, including "one card a time" in
 * `stepInside.body`, which reads as a dropped "at" but scans as an echo of the
 * hero's line.
 */
const copy = pickCopy(en, { es }, currentLocale());

export const hero = {
  title: copy.hero.title,
  eyebrow: copy.hero.eyebrow,
  /** Her draft reads "one cardt at a time." */
  lead: copy.hero.lead,
  body: copy.hero.body,
  action: { label: copy.hero.action },
  /* Sits under the button, smaller than anything else in the column. */
  note: copy.hero.note,
  imageAlt: copy.hero.imageAlt,
};

/** Her draft reads "understading" in the second paragraph. */
export const stepInside = {
  eyebrow: copy.stepInside.eyebrow,
  heading: copy.stepInside.heading,
  body: copy.stepInside.body,
};

/**
 * The three postcards, in the order they stack — the Sun behind, the Chariot to
 * its right, the Star in front. `PostcardFan` leans on that order for both its
 * paint order and which two it drops on a phone, which is why the order lives
 * here and not in the JSON.
 */
export const postcards: readonly { image: ImageAsset; alt: string }[] = [
  { image: learnArtwork.postcardSun, alt: copy.postcards.sun.alt },
  { image: learnArtwork.postcardChariot, alt: copy.postcards.chariot.alt },
  { image: learnArtwork.postcardStar, alt: copy.postcards.star.alt },
];

export const seventyEight = {
  heading: copy.seventyEight.heading,
  /** Her draft reads "intuitve". */
  intro: copy.seventyEight.intro,
  marks: [
    { image: learnArtwork.markFilm, ...copy.seventyEight.marks.film },
    { image: learnArtwork.markBook, ...copy.seventyEight.marks.book },
    { image: learnArtwork.markStar, ...copy.seventyEight.marks.star },
    { image: learnArtwork.markCards, ...copy.seventyEight.marks.cards },
  ],
};

export const tarotMap = {
  heading: copy.tarotMap.heading,
  intro: copy.tarotMap.intro,
  groups: [
    { image: learnArtwork.mapMajor, ...copy.tarotMap.groups.major },
    { image: learnArtwork.mapCourt, ...copy.tarotMap.groups.court },
    { image: learnArtwork.mapMinor, ...copy.tarotMap.groups.minor },
  ],
};

export const meta = {
  title: copy.meta.title,
  description: copy.meta.description,
};
