import { BUILT_LOCALES } from "./locale.ts";
import { canonicalFor } from "./seo.ts";

/**
 * Which routes exist, and which of them a stranger should be able to find.
 *
 * **Hand-written rather than derived from the filesystem.** A static export
 * could be walked, but `out/` does not exist until after a build and the answer
 * this file gives is a judgment rather than a fact: `/redeem/` and
 * `/checkout-probe/` are both routes, and only one of them belongs in an index.
 */

/**
 * In the sitemap, and indexable.
 *
 * **`/redeem/` is here deliberately.** Its own docblock argues the case: it
 * duplicates no reading page, because a gift's copy arrives from a lookup in the
 * browser rather than from the export — which is what put `noindex` on
 * `/presentation-probe/` before it was deleted. A search result landing on
 * "enter your gift code" is a page that works.
 */
export const PUBLIC_ROUTES: readonly string[] = [
  "/",
  "/readings/",
  "/readings/three-card/",
  "/readings/month-ahead/",
  "/readings/in-depth/",
  "/redeem/",
];

/**
 * Disallowed in `robots.txt`, and each carrying `index: false` of its own.
 *
 * The two mechanisms are not redundant. `robots.txt` asks a crawler not to
 * fetch; the meta tag tells one that fetched anyway not to index. A page reached
 * from a link somewhere else is caught only by the second.
 *
 * `/checkout/` covers `/checkout/complete/` and anything later under it. It is a
 * prefix here rather than an exact route for that reason.
 */
export const PRIVATE_ROUTES: readonly string[] = [
  "/login/",
  "/checkout/",
  "/reset-password/",
  "/set-password/",
  "/checkout-probe/",
];

export type SitemapEntry = {
  url: string;
  alternates?: { languages: Record<string, string> };
};

/**
 * One entry per public route.
 *
 * **No `lastModified`.** A build stamp would say every page changed on every
 * deploy, which is both untrue and the thing that teaches a crawler to stop
 * believing the field. Nothing here knows when a page's copy last changed.
 *
 * `alternates` stays absent while one locale is built, for the reason
 * `languageAlternates` in `seo.ts` gives.
 */
export function sitemapEntries(): SitemapEntry[] {
  const many = BUILT_LOCALES.length > 1;

  return PUBLIC_ROUTES.map((route) => ({
    url: canonicalFor(route),
    ...(many
      ? {
          alternates: {
            languages: Object.fromEntries(
              BUILT_LOCALES.map((locale) => [locale, canonicalFor(route, locale)]),
            ),
          },
        }
      : {}),
  }));
}
