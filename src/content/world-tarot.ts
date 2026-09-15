import { pickCopy } from "../lib/copy.ts";
import { currentLocale } from "../lib/locale.ts";
import en from "./locales/en/world-tarot.json" with { type: "json" };
import es from "./locales/es/world-tarot.json" with { type: "json" };

/**
 * The World Tarot page's own copy (Figma node 344:30, "THE WORLD TAROT_09_05_26"),
 * kept out of the components so the wording can move to a CMS later without
 * touching layout. There is no separate mobile mockup for this frame — see
 * `src/components/world-tarot/README.md`.
 *
 * **The words are in `locales/*\/world-tarot.json` since 11 September 2026**,
 * and every component that renders them is a client component, so they arrive
 * in the visitor's language rather than the build's. See `LanguageBoundary`.
 */
const copy = pickCopy(en, { es }, currentLocale());

export const intro = copy.intro;

export const mission = copy.mission;

export const artistNote = {
  /**
   * The heading is two pieces of the client's own artwork rather than type —
   * see `worldTarotArtwork.between` / `.skyStone` for why neither can be set.
   * `legend` is what a screen reader is given for the pair; the script word
   * above it is decorative and carries no alt of its own, so this string is
   * the whole heading as it reads aloud.
   *
   * **In Spanish it reads aloud in Spanish while the artwork still says
   * "Between Sky & Stone".** The pictures are hers and are English; a Spanish
   * pair would have to be drawn. A screen reader in a Spanish page speaking the
   * English words would mispronounce them, so the legend follows the page.
   */
  legend: copy.artistNote.legend,
  body: copy.artistNote.body,
  photoAlt: copy.artistNote.photoAlt,
  signatureAlt: copy.artistNote.signatureAlt,
};

export const closing = {
  saying: copy.closing.saying,
  action: { label: copy.closing.action, href: "/readings/" },
};
