/**
 * The language the site is being read in.
 *
 * **English, always, today.** There is no locale routing: `/` is the only route
 * and `<html lang>` is written from here. What this file buys is a single place
 * for the answer to live, so enabling a second language is a change to
 * `currentLocale` and nothing else — rather than a hunt through every `fetch`
 * for an `"en"` somebody inlined.
 *
 * The backend is already addressed per language, English included
 * (`/api/v1/en/products`, `/api/v1/es/products`), so the URL shape does not
 * change when that day comes. Only what fills the segment does.
 *
 * **What that day looks like is decided and not built**, as of 1 September 2026
 * (#63): a `[locale]` segment, English keeping `/`, and a switcher rendering the
 * intersection of what was built and what `GET /api/v1/languages` answers. The
 * argument — including why `/en/` was declined and what the deferral costs — is
 * `docs/adr/0004-language-is-a-path-segment.md`, and it is not repeated here. A
 * decision recorded in two places drifts.
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
 * **One half of the switcher's intersection**, and the half that only a deploy
 * can change. `docs/adr/0004-language-is-a-path-segment.md` argues the whole
 * rule: a static export cannot grow a route from a fetch, so a language must be
 * in here *and* in the live `GET /api/v1/languages` answer before it may be
 * offered. Taking Spanish down at the backend then removes it from every
 * switcher on the next request with no deploy of ours, which is the property
 * `API_CONTRACT.md` says it cannot enforce for us; what the intersection cannot
 * do is make a language appear without one, and that costs nothing, because a
 * language we have not built has no copy to show.
 *
 * English alone today, which is why the switcher is invisible however many
 * languages the backend answers. #69 grows this list alongside the `[locale]`
 * segment and the copy, and it is deliberately the same edit — a locale in here
 * with no route behind it is a link to a 404.
 */
export const BUILT_LOCALES: readonly Locale[] = [DEFAULT_LOCALE];

/**
 * The locale to read the site in.
 *
 * A function rather than a constant because the thing it returns is about to
 * stop being constant, and every call site reading it as a function today is a
 * call site that needs no edit then.
 */
export function currentLocale(): Locale {
  return DEFAULT_LOCALE;
}
