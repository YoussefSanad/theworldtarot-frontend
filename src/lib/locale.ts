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
 * When it does come, `currentLocale` learns to read the route segment, and the
 * list of what is available comes from `GET /api/v1/languages` — which
 * deliberately sits outside the language segment, being the thing that says
 * which languages there are.
 */

export const DEFAULT_LOCALE = "en";

/**
 * A BCP 47 language tag, which is what both the API path segment and
 * `Intl.NumberFormat` want.
 */
export type Locale = string;

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
