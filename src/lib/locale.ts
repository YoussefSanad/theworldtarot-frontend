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
 * can change. The rule and its whole argument are
 * `docs/adr/0004-language-is-a-path-segment.md`, and are **not restated here**.
 *
 * They were, until the Standards review of 2 September 2026 pointed out that
 * the paragraph doing it was a near-verbatim copy of the ADR's own, sitting
 * under a docblock that says a decision recorded in two places drifts.
 * `resolveLanguages` in `lib/languages.ts` is where the intersection is applied.
 *
 * English alone today, which is why the switcher is invisible however many
 * languages the backend answers. #69 grows this list alongside the `[locale]`
 * segment and the copy, and it is deliberately the same edit — a locale in here
 * with no route behind it is a link to a 404.
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
 * **English, always, and deliberately.** Static copy is translated in this
 * repository (`src/content/locales/`), and the backend's own translation work
 * is unfinished — `/api/v1/es/products` answers **404, not English**
 * (`API_CONTRACT.md` section 3). So asking in the visitor's language would
 * empty the catalogue rather than translate it: `resolveProducts` reads an
 * empty answer as a fallback to bundled copy, and the page would quietly show
 * bundled **price strings** where live money belongs.
 *
 * **This is the line that changes when the backend is ready**, and it changes
 * per endpoint rather than all at once — when `/products` is translated and
 * `/cards` is not, this grows an argument naming the endpoint and answers
 * differently for one of them. See `docs/plans/seo-and-translations.md`
 * sections 0.6 and 0.7.
 */
export function apiLocale(): Locale {
  return DEFAULT_LOCALE;
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
 * Today it is false for every language but English, because `apiLocale()` is
 * pinned there while the backend's own translation work is unfinished. It
 * starts answering true, per endpoint, the day that changes — and nothing that
 * reads it needs editing then.
 *
 * **Prices are not subject to this.** A price is a number, the same in every
 * language, and it is always the backend's.
 */
export function apiServesDisplayLocale(): boolean {
  return apiLocale() === currentLocale();
}
