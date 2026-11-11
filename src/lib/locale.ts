/**
 * The language the site is being read in.
 *
 * **English until a visitor chooses otherwise, and there is still no locale
 * routing.** `/` is the only route, the choice is a stored preference, and
 * `<html lang>` is written from here. What this file buys is a single place for
 * the answer to live, rather than a hunt through every `fetch` for an `"en"`
 * somebody inlined.
 *
 * The backend is addressed per language, English included
 * (`/api/v1/en/products`, `/api/v1/es/products`), so the URL shape did not
 * change when Spanish arrived. Only what fills the segment did.
 *
 * **The `[locale]` segment was declined, not deferred.**
 * `docs/adr/0004-language-is-a-path-segment.md` proposed one and is superseded
 * on that point: language is a stored preference, Spanish has no URL of its
 * own, and search stays English-only. The argument and what the trade costs are
 * in that ADR's superseding note, and are not repeated here — a decision
 * recorded in two places drifts.
 */

export const DEFAULT_LOCALE = "en";

/**
 * A BCP 47 language tag, which is what both the API path segment and
 * `Intl.NumberFormat` want.
 */
export type Locale = string;

/**
 * The locales this export actually contains.
 *
 * **The locales with a URL of their own**, which is the question SEO asks. The
 * rule and its whole argument are
 * `docs/adr/0004-language-is-a-path-segment.md`, and are **not restated here**.
 *
 * They were, until the Standards review of 2 September 2026 pointed out that
 * the paragraph doing it was a near-verbatim copy of the ADR's own, sitting
 * under a docblock that says a decision recorded in two places drifts.
 * `resolveLanguages` in `lib/languages.ts` is where the intersection is applied.
 *
 * **English alone, permanently**, since the `[locale]` segment was declined
 * rather than deferred — see the superseding note on that ADR. This is the list
 * of locales with an address of their own, so it is what `lib/seo.ts` writes
 * `hreflang` from and what `lib/routes.ts` writes the sitemap from, and a locale
 * in here with no route behind it would be a link to a 404.
 *
 * **`OFFERED_LOCALES` below is the switcher's half of the intersection**, not
 * this one. Spanish is readable without being indexable, which is exactly the
 * trade this site has chosen.
 */
export const BUILT_LOCALES: readonly Locale[] = [DEFAULT_LOCALE];

/**
 * The languages the switcher offers.
 *
 * **Deliberately not `BUILT_LOCALES`, and the difference is the whole design.**
 * `BUILT_LOCALES` means "locales with a URL of their own", which is what SEO
 * cares about: `lib/seo.ts` writes `hreflang` from it and `lib/routes.ts` writes
 * the sitemap from it. There is one URL per page and there is meant to be —
 * search is English-only by decision — so that list stays at English alone, and
 * emitting `hreflang` for a `/es/` that does not exist would be a lie.
 *
 * This list is a different question: which languages can a visitor *read the
 * site in*. Both, because both are in `src/content/locales/` and ship in the
 * bundle. A language moves from here into `BUILT_LOCALES` only if it is ever
 * given an address of its own.
 *
 * Keeping them apart is what lets Spanish be readable without being indexable,
 * which is exactly the trade this site has chosen.
 */
export const OFFERED_LOCALES: readonly Locale[] = [DEFAULT_LOCALE, "es"];

/** The choice a visitor made, kept for the rest of the visit. */
const LOCALE_KEY = "wt.locale";

/**
 * Read once, in this module's body, and the timing is load-bearing.
 *
 * Every `src/content/*.ts` module resolves its copy at module scope — `const
 * copy = pickCopy(en, { es }, currentLocale())` — so the language has to be
 * known before any of them evaluate. They all import this file, so this line
 * runs first and `currentLocale()` is already correct when they ask.
 *
 * It is also why `setLocale` reloads rather than notifying subscribers: nothing
 * short of running the bundle again re-resolves a module-scope constant.
 */
function storedLocale(): Locale | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const stored = window.localStorage.getItem(LOCALE_KEY) ?? undefined;

    return stored && OFFERED_LOCALES.includes(stored) ? stored : undefined;
  } catch {
    // A browser set to block site data. English, then.
    return undefined;
  }
}

const ACTIVE_LOCALE = storedLocale();

/**
 * Whether a stored language is one the backend has stopped serving.
 *
 * Pure, and exported apart from `forgetLocaleUnlessServed` for the reason
 * `resolveLanguages` is: the decision is where the bugs would be, and under
 * `node --test` there is no window to store a choice in, so the effectful half
 * can only ever be exercised on its early return.
 *
 * **Silence is not an answer.** An empty list is both "no live languages" and
 * "the request failed", and acting on the second would send every Spanish
 * reader back to English for the length of an outage. So this is true only
 * when the backend actually named some languages and this one was not among
 * them.
 */
export function isUnserved(stored: Locale | undefined, live: readonly Locale[]): boolean {
  return stored !== undefined && live.length > 0 && !live.includes(stored);
}

/**
 * Drops a stored language the backend is no longer serving, and reloads.
 *
 * **`storedLocale` validates against `OFFERED_LOCALES`, which is compiled in**,
 * so on its own it says only that the bundle holds copy for the language — not
 * that the backend will answer in it. That was harmless while `apiLocale()` was
 * pinned to English. It stopped being harmless the moment it was unpinned:
 * `/api/v1/{locale}/products` answers **404 rather than English** for a locale
 * that is not live, `catalogue.ts` reads a failed ask as "no answer yet", and
 * `resolveProducts` renders bundled copy — putting **bundled price strings
 * where live money belongs.**
 *
 * Two visitors reach that state without doing anything wrong. One chose Spanish
 * while a build was shipping the hardcoded switcher list, before the backend
 * served it. The other chose it while it was genuinely live, and it has since
 * been taken down — which is the kill switch working everywhere except in the
 * one browser that had already said yes. Their switcher is empty too, because
 * one live language draws no control, so they cannot choose their way out.
 *
 * So the live answer is reconciled against the stored choice once it lands,
 * and `isUnserved` above decides whether the two disagree.
 *
 * It cannot loop: the reload runs with nothing stored, so `ACTIVE_LOCALE` is
 * `undefined` and the first line returns.
 */
export function forgetLocaleUnlessServed(live: readonly Locale[]): void {
  if (!isUnserved(ACTIVE_LOCALE, live)) return;

  try {
    window.localStorage.removeItem(LOCALE_KEY);
  } catch {
    // Nothing stored is nothing to clear, and a reload would loop.
    return;
  }

  window.location.reload();
}

/**
 * Records the language a visitor chose and reloads so the copy re-resolves.
 *
 * **The reload is the mechanism, not a workaround.** See `storedLocale` above.
 * What it costs is one round trip on a language change, which is a rare and
 * deliberate action, and the alternative — making the whole catalogue reactive —
 * is a far larger change for a moment nobody spends time in.
 */
export function setLocale(code: Locale): void {
  if (!OFFERED_LOCALES.includes(code)) return;

  try {
    window.localStorage.setItem(LOCALE_KEY, code);
  } catch {
    // Nothing to be done, and nothing worth showing a visitor.
  }

  window.location.reload();
}

/**
 * The locale to read the site in — English until a visitor chooses otherwise.
 *
 * **Never detected.** A first visit is English for everybody, deliberately: on a
 * static export any detected value would arrive after the English page had
 * painted, so the visitor would watch the page change rather than arrive at the
 * right one.
 */
export function currentLocale(): Locale {
  return ACTIVE_LOCALE ?? DEFAULT_LOCALE;
}

/**
 * The language the **backend** is asked in, which is not the language the
 * visitor is reading. `currentLocale()` answers that one.
 *
 * **The visitor's language, since 9 September 2026.** It was pinned to English
 * while the backend's own translation work was unfinished, because
 * `/api/v1/es/products` answers **404, not English** (`API_CONTRACT.md` section
 * 3) — so asking in the visitor's language would have emptied the catalogue
 * rather than translating it: `resolveProducts` reads an empty answer as a
 * fallback to bundled copy, and the page would quietly have shown bundled
 * **price strings** where live money belongs.
 *
 * **That failure is not gone, it is gated.** A locale the panel has not made
 * `live` still answers 404, so this line is only safe while the switcher cannot
 * offer one — and it cannot, because the switcher is built from
 * `GET /api/v1/languages`, which lists live locales only. A visitor cannot
 * choose a language the backend will 404 on, because such a language is never
 * drawn. Deleting `withOurLanguages` from `lib/languages.ts` is what restored
 * that property, so these two changes belong to the same release and this one
 * must not ship without it.
 *
 * It can still change per endpoint: when `/products` is translated and `/cards`
 * is not, this grows an argument naming the endpoint and answers differently
 * for one of them. See `docs/plans/seo-and-translations.md` sections 0.6 and
 * 0.7. **Four requests would have to move onto it first.** `askCatalogue` in
 * `lib/catalogue.ts`, `useProduct` in `lib/product.ts` and both calls in
 * `RedeemGift` pass `currentLocale()` explicitly instead of taking this default,
 * so an argument grown here would not reach `/products` or the gift endpoints
 * until they did.
 */
export function apiLocale(): Locale {
  return currentLocale();
}

/**
 * Whether the backend is answering in the language the visitor is reading.
 *
 * **The one rule for API-supplied copy.** True, and a product name or a card
 * name from the API is in the right language and is the better answer — it is
 * editable in the admin panel without a deploy. False, and it is English text
 * that would sit inside a Spanish page, so the bundled copy in
 * `src/content/locales/` is used instead.
 *
 * **True for every language today**, because `apiLocale()` follows the display
 * language since 9 September 2026. That makes this a comparison of a value with
 * itself, and it is kept rather than inlined because the comparison is the rule
 * — the day `apiLocale()` grows an endpoint argument and answers English for
 * `/cards` while answering Spanish for `/products`, this starts disagreeing
 * again and every caller of this is already written for it. A `return true`
 * would have to be found and unpicked instead. The requests are another matter:
 * some bypass `apiLocale()`, and the note on it above names them.
 *
 * **Prices are not subject to this.** A price is a number, the same in every
 * language, and it is always the backend's.
 */
export function apiServesDisplayLocale(): boolean {
  return apiLocale() === currentLocale();
}
