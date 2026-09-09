import { artwork, icons, type ImageAsset } from "../lib/assets.ts";
import { pickCopy } from "../lib/copy.ts";
import { currentLocale } from "../lib/locale.ts";
import en from "./locales/en/home.json" with { type: "json" };
import es from "./locales/es/home.json" with { type: "json" };

/**
 * The words on this page, in whichever language it is being read.
 *
 * **Strings live in `locales/`, structure lives here** — `href`s, artwork and
 * `key`s never cross over. Arrays stay arrays: each one is a set of rendered
 * lines a designer chose, so a translator is choosing where Spanish breaks too.
 * `home.test.ts` pins every line count for that reason.
 */
const copy = pickCopy(en, { es }, currentLocale());

/**
 * Homepage copy, kept out of the components so the wording can move to a CMS
 * later without touching layout. Text matches the Figma homepage (node 102:3).
 */

/** Anchor the reveal scrolls to once a visitor has seen their card. */
export const PRODUCTS_SECTION_ID = "choose-your-journey";

/** Where each hero button goes, and its mark. The words are in `locales/`. */
const SECONDARY_ACTIONS = [
  { href: "/living-tarot", icon: icons.book },
  { href: "/readings", icon: icons.talk },
];

export const hero = {
  titleTop: copy.hero.titleTop,
  titleMain: copy.hero.titleMain,
  tagline: copy.hero.tagline,
  body: copy.hero.body,
  /** Shorter variant shown below `sm`, where the full line wraps too tall. */
  bodyMobile: copy.hero.bodyMobile,
  secondaryActions: SECONDARY_ACTIONS.map((action, index) => ({
    label: copy.hero.secondaryActions[index].label,
    /** Shorter variant shown below `sm`, so both buttons fit on one row on phones. */
    labelMobile: copy.hero.secondaryActions[index].labelMobile,
    ...action,
  })),
  /** Shown under the secondary actions once the visit's one card has been revealed. */
  returnPrompt: copy.hero.returnPrompt,
  closing: copy.hero.closing,
};

export const worldTarot = {
  heading: copy.worldTarot.heading,
  subheading: copy.worldTarot.subheading,
  /**
   * The badge is the Living Tarot wordmark, set inline where Figma places it.
   *
   * **The trailing space on `before` and the leading one on `after` are
   * load-bearing** — they are the gaps either side of the badge. A translator
   * who trims them closes the words up against it.
   */
  body: {
    before: copy.worldTarot.body.before,
    after: copy.worldTarot.body.after,
  },
};

/**
 * A Choose Your Journey tile.
 *
 * One field comes from the API at runtime and the rest never can, so the split
 * is worth knowing before editing either:
 *
 * | Field | Owner |
 * |---|---|
 * | `price` | **The API**, once it answers. What is written here is the fallback |
 * | `title`, `subtitle`, `action` | **Here, always.** Copy, and copy is translated in this repository |
 * | `key`, `href`, `image` | **Here, always.** None of them are in the product contract |
 *
 * ~~`title` and `subtitle` are the API's, once it answers.~~ **Struck
 * 6 September 2026.** They were, and the row above is where a reader would have
 * found that out; `docs/plans/seo-and-translations.md` §0.6 moved them here
 * along with every other word on the site. `price` is the one thing that cannot
 * live in this file, because a figure nobody is charging is worse than no
 * figure at all.
 *
 * See `lib/products.ts` for the merge, and `docs/plans/products-api-wiring.md`
 * for the shape it had when the API still supplied copy.
 */
export type Product = {
  /**
   * The backend's `ProductKey`. Permanent, untranslated, identical in every
   * language, and **the join between a bundled tile and its API record** — so
   * a value here that the backend does not recognise is a tile that silently
   * never takes live copy.
   */
  key: string;
  title: string;
  /**
   * One string, not the two hard-wrapped lines this used to be.
   *
   * **Where it breaks is the tile's decision, not the copy's.** The API sends
   * one sentence and the tile balances it (`text-balance` in `ProductCard`), so
   * the same words split correctly at all four widths this tile renders at, and
   * in a language whose words are longer. A newline typed into the admin panel
   * is still honoured, as an override for when a specific break is really
   * wanted.
   */
  subtitle: string;
  /** A display string, already formatted. API prices arrive as minor units and are formatted by `lib/price.ts`. */
  price: string;
  action: string;
  href: string;
  image: ImageAsset;
};

/**
 * The tiles, in the order they appear, with the copy to show before the API has
 * answered or when it cannot be reached.
 *
 * **This list decides which tiles exist, and what they say.** ~~The API decides
 * what they say.~~ Struck 6 September 2026: all translation is handled in this
 * repository until the backend's own translation work is finished, so
 * `resolveProducts` merges the **price** and nothing else. See
 * `docs/plans/seo-and-translations.md` §0.6.
 *
 * A tile cannot be rendered without artwork, and artwork ships in the bundle, so
 * publishing a fifth product does not put it on the homepage — adding it here
 * does. That is deliberate: it stops an edit in the admin panel rearranging a
 * hand-tuned four-column grid. **Renaming one there no longer changes the page
 * either**, which is a smaller surprise to discover in this comment than on a
 * call with whoever made the edit.
 *
 * ~~**This copy is the source of truth for what the backend seeds.** Every
 * title, description and price below is reproduced exactly in the backend's
 * `ProductKey` defaults — verified character for character, curly apostrophe
 * included.~~
 *
 * **Struck the same day, for `title` and `subtitle` only.** That claim asked
 * this file to be kept character-identical to `ProductKey::defaultName` and
 * `defaultShortDescription`, and the reason was that the tiles then read those
 * fields — so a mismatch was a visible fault. Nothing reads them now, so the two
 * are free to disagree and the reconciliation is no longer owed.
 *
 * **`price` still is**, and for the same reason it always was: it is the string
 * on screen until the backend answers, and a fallback that disagrees with
 * `defaultPrices` advertises a figure nobody is charging. Change one, change the
 * other.
 */
/**
 * What is not copy: the join key, the price fallback, the link and the artwork.
 * Titles, subtitles and actions are in `locales/`, matched by position.
 *
 * `price` stays here rather than in a translator's file because it is money —
 * a number, the same in every language, and the string on screen only until the
 * API answers. See `lib/products.ts`.
 */
const PRODUCT_STRUCTURE = [
  { key: "one-card", price: "$12", href: "/readings/one-card", image: artwork.productOneCard },
  { key: "three-card", price: "$52", href: "/readings/three-card", image: artwork.productThreeCard },
  { key: "month-ahead", price: "$75", href: "/readings/month-ahead", image: artwork.productMonthAhead },
  {
    // `viewing-room-pass`, not `viewing-room`: this must be the backend's key
    // for the merge to find it. The tile's own URL is `href` and is unaffected.
    key: "viewing-room-pass",
    price: "$29",
    href: "/viewing-room",
    image: artwork.productViewingRoom,
  },
];

export const products: Product[] = PRODUCT_STRUCTURE.map((product, index) => ({
  title: copy.products[index].title,
  subtitle: copy.products[index].subtitle,
  action: copy.products[index].action,
  ...product,
}));

export const journey = {
  heading: copy.journey.heading,
  subheading: copy.journey.subheading,
  /**
   * Below `sm` the four tiles become a swipeable row. None of this is visible —
   * they are the names a screen reader reads out for the position dots. The row
   * itself is never announced as a carousel, because the same markup is a plain
   * grid above `sm`; see `components/home/ProductCarousel.tsx`.
   */
  /** `dotAction` prefixes each product title on its dot: “Show 1 CARD READING”. */
  carousel: copy.journey.carousel,
};

export const included = copy.included;

export const placeStatement = copy.placeStatement;

export const valueProps = copy.valueProps;

/**
 * Below `sm` the three props become a swipeable row, same pattern as
 * `journey.carousel` for the product tiles — see ProductCarousel.tsx.
 */
export const valuePropsCarousel = copy.valuePropsCarousel;

export const featuredTestimonial = copy.featuredTestimonial;

export const artist = copy.artist;

export const closingCta = {
  heading: copy.closingCta.heading,
  action: { label: copy.closingCta.action, href: "/readings" },
  testimonial: copy.closingCta.testimonial,
};
