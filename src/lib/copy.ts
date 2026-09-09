import { DEFAULT_LOCALE, type Locale } from "./locale.ts";

/**
 * Which language's strings a content module hands back.
 *
 * **Pure, and the only shared machinery the catalogue needs.** Every
 * `src/content/*.ts` module imports its own JSON and calls this; there is no
 * registry, no dynamic import and no key lookup by string path. A missing file
 * is a compile error at the import, which is the earliest anything can catch it.
 *
 * `src/lib` may not value-import through the `@/` alias — `node --test` cannot
 * resolve it — which is why this lives here and takes its inputs as arguments
 * rather than reaching into `content/` itself.
 */

/**
 * The strings for one locale.
 *
 * **Whole-file fallback, never a field-by-field merge**, and there is a test
 * pinning it. A merge would let a half-written Spanish file render Spanish
 * headings over English body copy — a page in two languages, which is worse
 * than either language alone, and which nobody would notice until a reader
 * complained. A file is translated or it is not.
 *
 * That is also why `scripts/check-translations.mjs` exists: the type system
 * proves a locale's file has every key, and cannot prove a single value was
 * translated, because a copied English string is a perfectly valid string.
 */
export function pickCopy<T>(en: T, byLocale: Partial<Record<Locale, T>>, locale: Locale): T {
  if (locale === DEFAULT_LOCALE) return en;

  return byLocale[locale] ?? en;
}
