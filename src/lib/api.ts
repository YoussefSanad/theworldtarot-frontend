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
 * `?currency=` when the visitor has chosen one, and nothing at all when they
 * have not.
 *
 * **The absence is the request**, not an omission: a parameterless call is what
 * asks the backend to detect from `CF-IPCountry`, and `API_CONTRACT.md` section
 * 4 honours an explicit code over any detection. So a visitor who has never
 * chosen keeps being re-detected — which is what makes crossing a border work —
 * and a visitor who has chosen is never re-detected against their choice.
 *
 * See `lib/currency.ts`, which holds the distinction this parameter carries.
 */
function withCurrency(url: string, currency?: string): string {
  return currency ? `${url}?currency=${encodeURIComponent(currency)}` : url;
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
  /**
   * Whether this product may be bought for somebody else — **the property of
   * the product that decides whether a page draws `Gift a Reading` at all**.
   *
   * `true` for the three written readings, `false` for `one-card` and the
   * Viewing Room pass, and the backend's to change rather than ours to know:
   * `POST /orders` **refuses** a gift object on a line that is not giftable
   * rather than quietly dropping it, so a toggle drawn from a list held here
   * is a button that 422s on submit.
   *
   * Independent of `allows_question` above, and `one-card` is the product that
   * proves it — it takes a question and cannot be gifted. See `giftOffered` in
   * `lib/product.ts`, which is the one place this is acted on, and `CONTEXT.md`
   * for the word.
   */
  is_giftable: boolean;
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
  {
    locale = DEFAULT_LOCALE,
    currency,
    signal,
  }: { locale?: Locale; currency?: string; signal?: AbortSignal } = {},
): Promise<ApiProduct[]> {
  const response = await fetch(withCurrency(`${baseUrl()}/api/v1/${locale}/products`, currency), {
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
  {
    locale = DEFAULT_LOCALE,
    currency,
    signal,
  }: { locale?: Locale; currency?: string; signal?: AbortSignal } = {},
): Promise<ApiProductDetail | null> {
  const response = await fetch(
    withCurrency(`${baseUrl()}/api/v1/${locale}/products/${key}`, currency),
    {
      headers: { Accept: "application/json" },
      signal,
    },
  );

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Fetching the product "${key}" failed with ${response.status}.`);
  }

  return (await response.json()) as ApiProductDetail;
}

/**
 * Which ways of paying this environment offers, and therefore which buttons to
 * draw.
 *
 * **Flat, with no locale segment**, because it carries no copy: the answer is
 * identical for every visitor and nothing about them varies it. Published 29
 * August 2026 alongside `stripe_wallet` — see `API_CONTRACT.md` section 8.
 *
 * ## Why the panel asks at all
 *
 * The reading page cannot infer which buttons it may draw. Whether the wallet
 * exists here depends on whether *this* environment configured Stripe, and a
 * local build configures nothing — an offered method with no credentials behind
 * it is a button that fails at the worst moment a shop has. The card button
 * survives being wrong about this by redirecting to a page that says so; the
 * wallet button does not, because it opens a sheet the customer has already
 * authorised with Face ID.
 *
 * ## Strings, not a union
 *
 * The list is the backend's and it grows — `gift_code` joins it with gifting.
 * Answering `string[]` rather than `PaymentMethodName[]` is what keeps a name
 * this build has never heard of from being cast into one it has: the caller
 * asks whether the name it wants is present, and a new one it cannot draw is
 * simply not found.
 *
 * Throws on a broken API, so a backend that cannot answer is loud rather than
 * indistinguishable from an environment that offers nothing. The caller treats
 * both as "draw no wallet", which is the safe reading of either.
 */
export async function fetchPaymentMethods(
  { signal }: { signal?: AbortSignal } = {},
): Promise<string[]> {
  const response = await fetch(`${baseUrl()}/api/v1/payment-methods`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Fetching the payment methods failed with ${response.status}.`);
  }

  const body = (await response.json()) as { methods?: unknown };

  /*
    An object with a `methods` key, matching `/currencies`, rather than a bare
    array — gifting brings `gift_code` and likely a second key with it. Checked
    rather than cast: a body shaped some other way answers "nothing is offered",
    which draws no wallet, and that is the right way to be wrong here.
  */
  if (!Array.isArray(body.methods)) return [];

  return body.methods.filter((method): method is string => typeof method === "string");
}

/** One entry from `/currencies`. The symbol is what a control prints. */
export type ApiCurrency = { code: string; symbol: string };

/**
 * The currencies the site sells in, and the symbol for each.
 *
 * **Flat, with no locale segment**, and only `available` is read. The response
 * also carries `detected`, which is this request's own resolution — we never
 * read it, because the highlight comes from `price.currency` on the product
 * response, which is the currency the visitor is actually being charged in
 * rather than the one a second endpoint would have resolved to. Dropping the
 * field is asked for in `YoussefSanad/TheWorldTarot#66`, and takes the CDN's
 * per-visitor cache-key complication with it.
 *
 * Throws on a broken API. **The caller keeps the three currencies it knows**
 * rather than taking the control off the page: unlike a language, a currency
 * cannot appear or vanish without a migration and a deploy on both sides, so a
 * list held here cannot silently drift the way a hardcoded language list can.
 *
 * A body shaped some other way answers nothing rather than being cast, on
 * `fetchPaymentMethods`'s reasoning — the caller treats an empty answer and a
 * throw the same way, and both are the safe way to be wrong here.
 */
export async function fetchCurrencies(
  { signal }: { signal?: AbortSignal } = {},
): Promise<ApiCurrency[]> {
  const response = await fetch(`${baseUrl()}/api/v1/currencies`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Fetching the currencies failed with ${response.status}.`);
  }

  const body = (await response.json()) as { available?: unknown };

  if (!Array.isArray(body.available)) return [];

  return body.available.filter(
    (entry): entry is ApiCurrency =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as ApiCurrency).code === "string" &&
      typeof (entry as ApiCurrency).symbol === "string",
  );
}

/**
 * One entry from `/languages`.
 *
 * `native_name` is optional because the backend does not send it yet — the
 * column exists on its `Locale` and is unexposed, asked for in
 * `YoussefSanad/TheWorldTarot#66`. Render it over `label` when it arrives: a
 * language switcher is one of the few controls read by people who cannot read
 * the language it is currently in, which is exactly when "Español" works and
 * "Spanish" does not.
 */
export type ApiLanguage = { code: string; label: string; native_name?: string };

/**
 * The languages that are live, which is the only list a switcher may be built
 * from.
 *
 * **Flat, with no locale segment**, being the thing that says which languages
 * there are. `API_CONTRACT.md` calls building the switcher from this endpoint
 * the one requirement it cannot enforce for us: a language can be taken down at
 * any moment, effective on the next request with no deploy on our side, and a
 * hardcoded switcher then offers a dead link with a 404 behind it.
 *
 * A single-entry answer is the normal state today and is not a failure. The
 * caller draws no language group at one entry — see `LocaleControls` — which is
 * the contract's own advice.
 *
 * Throws on a broken API, and the caller draws nothing, same as at one entry:
 * both mean there is nothing safe to offer.
 */
export async function fetchLanguages(
  { signal }: { signal?: AbortSignal } = {},
): Promise<ApiLanguage[]> {
  const response = await fetch(`${baseUrl()}/api/v1/languages`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Fetching the languages failed with ${response.status}.`);
  }

  const body: unknown = await response.json();

  if (!Array.isArray(body)) return [];

  return body.filter(
    (entry): entry is ApiLanguage =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as ApiLanguage).code === "string" &&
      typeof (entry as ApiLanguage).label === "string",
  );
}
