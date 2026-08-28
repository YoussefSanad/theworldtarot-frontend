import type { TarotCard } from "@/content/cards";

import { DEFAULT_LOCALE, type Locale } from "./locale.ts";
import type { Money } from "./price.ts";

/**
 * The backend, for the homepage reveal.
 *
 * **Nothing here may be fetched at build time.** Both endpoints answer
 * per-visitor, for unrelated reasons, and neither survives being baked into an
 * export:
 *
 * - **Prices are resolved per visitor**, from the `CF-IPCountry` header, so the
 *   same URL answers EUR in Amsterdam and USD in Denver. A build-time fetch
 *   bakes whichever currency the build machine resolved to and ships it to the
 *   entire world
 * - **A playback URL expires in thirty minutes** and must never be stored or
 *   cached, so one captured at build time is dead long before anybody loads the
 *   page
 *
 * **The stronger "browser only, never a server" rule is gone**, and this comment
 * claimed otherwise until 20 August 2026. Playback URLs were bound to the
 * viewer's IP address from 3 August and that binding was **removed on 7 August**
 * — it could never have worked, since this API is behind a dual-stack Cloudflare
 * while the video zone is IPv4-only, so every visitor with working IPv6 got a
 * 403. The backend's `API_CONTRACT.md` is explicit that a URL fetched by a
 * server component now works for whoever you hand it to.
 *
 * So server-side fetching is no longer fatal; build-time fetching still is. The
 * distinction is moot in practice today — this app is a static export with no
 * server at runtime — which is exactly why it is written down rather than left
 * to be rediscovered.
 *
 * One live CDN rule that does still bite: **the video CDN refuses requests with
 * no referrer**, so never set `Referrer-Policy: no-referrer` on a page that
 * plays a film.
 *
 * That constraint is satisfied for free today, because this app is a static
 * export and has no server at runtime. It stops being free the moment somebody
 * moves a fetch into a server component, so it is written down rather than
 * assumed. See `docs/plans/reveal-api-migration.md` and the backend's
 * `API_CONTRACT.md`.
 */

/**
 * Inlined at build time, so staging and production are separate builds.
 *
 * Read inside the function rather than into a module constant, as `api-write.ts`
 * does. Next substitutes the literal wherever `process.env.NEXT_PUBLIC_*`
 * appears, so the two are identical in a build — but a constant is resolved at
 * import time, which makes the value unsettable from a test that has already
 * imported this file.
 */
function baseUrl(): string {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!API_BASE) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set. The reveal falls back to the bundled card without it.",
    );
  }

  return API_BASE.replace(/\/$/, "");
}

type ApiCard = {
  id: number;
  number: number;
  name: string;
  short_description: string;
  long_description: string;
  image: string;
  in_viewing_room: boolean;
  /**
   * Optional because it is being removed from the backend. Nothing here reads
   * it, so it can disappear without breaking anything.
   */
  poster?: string | null;
  video: { url: string; expires_at: string };
};

/** What `/cards/{id}` returns. The same card, with no film attached. */
type CardWithoutVideo = Omit<ApiCard, "video">;

/**
 * The deck is fixed at twenty-two, so a table beats arithmetic. The Fool is 0
 * and has no Roman numeral, which is why this starts with a character Roman
 * numerals do not have.
 */
const ROMAN = [
  "0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI",
] as const;

function toTarotCard(card: ApiCard | CardWithoutVideo): TarotCard {
  return {
    // The API addresses cards by integer id. Kept as a string because it is an
    // opaque handle here, and it is what goes into sessionStorage for the
    // one-reveal-per-visit rule.
    id: String(card.id),
    number: ROMAN[card.number] ?? String(card.number),
    name: card.name,

    // An HLS manifest, not an MP4. See RevealStage. Absent from the single-card
    // endpoint, which a restored visit uses and which serves no film. An empty
    // string is normalized to absent here, not left for callers to notice,
    // because `RevealStage`'s `filmWanted` gate (and anything else reading
    // `card.video`) trusts absence to mean "no film," not "a film with no URL."
    video: "video" in card && card.video.url ? card.video.url : undefined,

    // The card's own artwork, which is what a restored visit shows in place of
    // replaying the film. It was the poster frame until the poster was dropped
    // from the backend. No dimensions come with either, and the stage does not
    // need them: it fixes its own aspect ratio and covers.
    image: { src: card.image },
  };
}

/**
 * One card and its film, drawn at random.
 *
 * Returns null when the backend has nothing to draw, which is a real state
 * rather than a failure: no card is on the website yet with a finished film and
 * a poster frame. The caller falls back to the bundled card.
 *
 * Throws on anything else, so a genuinely broken API is visible rather than
 * silently indistinguishable from an empty one.
 */
export async function drawCard(
  { locale = DEFAULT_LOCALE, signal }: { locale?: Locale; signal?: AbortSignal } = {},
): Promise<TarotCard | null> {
  const response = await fetch(`${baseUrl()}/api/v1/${locale}/cards/draw`, {
    // The response is a credential with a timer. The server says no-store and
    // this says it again, because the two failure modes differ: a cached reveal
    // shows every visitor the same card, and a cached credential outlives its
    // own expiry.
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`The draw failed with ${response.status}.`);
  }

  return toTarotCard((await response.json()) as ApiCard);
}

/**
 * One card by id, without a film.
 *
 * For the restored visit: the card was already revealed this session, so the
 * stage shows its still rather than replaying the video. That is deliberate,
 * it avoids re-downloading the film on every page view, and it is also the only
 * option, since the playback URL expires and must never be stored.
 *
 * Returns null when the card is no longer on the website, in which case the
 * visitor gets a fresh draw rather than an error. The redraw itself happens in
 * `RevealProvider`'s restore effect, not here — this function only reports the
 * 404, it doesn't recover from it.
 */
export async function fetchCard(
  id: string,
  { locale = DEFAULT_LOCALE, signal }: { locale?: Locale; signal?: AbortSignal } = {},
): Promise<TarotCard | null> {
  const response = await fetch(`${baseUrl()}/api/v1/${locale}/cards/${id}`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Fetching card ${id} failed with ${response.status}.`);
  }

  return toTarotCard((await response.json()) as CardWithoutVideo);
}

/**
 * What kind of sellable thing a product is. The backend's `ProductType`, which
 * is part of the contract deliberately: presentation maps to it rather than to
 * a list of keys, so a pass and a reading can be told apart without either side
 * hardcoding which keys are which.
 */
export type ApiProductType = "reading" | "pass" | "addon";

/** One entry from `/products`. The listing shape — no `long_description`. */
export type ApiProduct = {
  /**
   * Permanent, untranslated, and the same in every language, which is what
   * makes it safe to match bundled artwork and links against.
   */
  key: string;
  type: ApiProductType;
  name: string;
  short_description: string;
  /** Whether a question may be attached when buying. Always optional. */
  allows_question: boolean;
  price: Money;
};

/**
 * Everything on sale, in the order the client arranged it.
 *
 * **A product missing from this list is not an error.** The backend works
 * availability out rather than storing it: a product needs its copy in the
 * requested language and a real price in every currency before it appears at
 * all. So an unfinished or withdrawn reading is simply absent, and the section
 * hides that tile — see `resolveProducts` in `lib/products.ts`, which is where
 * that distinction is acted on.
 *
 * Throws on a broken API, so an unreachable backend is loud rather than
 * indistinguishable from an empty shop. Those two want very different
 * responses, and the caller's `catch` keeps the bundled copy on screen.
 *
 * No `cache: "no-store"`. Unlike the reveal this is not a credential with a
 * timer, and the backend already answers `no-cache, private` — it varies by
 * country while the URL does not, so it is the backend's job to say so and not
 * this file's to repeat it.
 */
export async function fetchProducts(
  { locale = DEFAULT_LOCALE, signal }: { locale?: Locale; signal?: AbortSignal } = {},
): Promise<ApiProduct[]> {
  const response = await fetch(`${baseUrl()}/api/v1/${locale}/products`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Fetching the products failed with ${response.status}.`);
  }

  return (await response.json()) as ApiProduct[];
}

/** One entry from `/products/{key}`. The listing shape, with the long copy. */
export type ApiProductDetail = ApiProduct & { long_description: string };

/**
 * One product by key — the authoritative price for the thing a page sells.
 *
 * A page that sells a single reading asks for that reading rather than for
 * everything on sale and then picking one out of it. One response says both
 * what to charge and which currency to charge it in, which is the pair a
 * payment is built from; see `Money` in `lib/price.ts`.
 *
 * Returns null when the backend answers 404, which covers rather more than a
 * typo: **unpublished, outside the fixed set of keys, or not translated into
 * the language asked for** all answer the same way, deliberately, since whether
 * an unreleased reading exists is not public information. Whatever the cause,
 * the product is not on sale here today and the page must not offer it — see
 * `lib/product.ts`, where that is acted on.
 *
 * Throws on anything else, so an unreachable backend stays distinguishable from
 * a withdrawn one. Those two want opposite things on the page: one keeps the
 * bundled copy on screen, the other takes the offer down.
 */
export async function fetchProduct(
  key: string,
  { locale = DEFAULT_LOCALE, signal }: { locale?: Locale; signal?: AbortSignal } = {},
): Promise<ApiProductDetail | null> {
  const response = await fetch(`${baseUrl()}/api/v1/${locale}/products/${key}`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Fetching the product "${key}" failed with ${response.status}.`);
  }

  return (await response.json()) as ApiProductDetail;
}
