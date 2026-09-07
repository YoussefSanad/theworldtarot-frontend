import type { MetadataRoute } from "next";

import { sitemapEntries } from "@/lib/routes";

/**
 * **`hreflang` lives here rather than in every page's `<head>`.**
 *
 * `hreflang` is reciprocal — an unanswered annotation is ignored — so declaring
 * it per page would mean editing all six the day Spanish ships. In the sitemap
 * it is one file, and an English page's `<head>` never changes. `sitemapEntries`
 * emits nothing while `BUILT_LOCALES` holds one locale.
 *
 * **`force-static` is required, not decorative.** A metadata file compiles to a
 * `GET` route handler under the hood, and route handlers are not cached by
 * default — `output: export` refuses to build one that has not opted in,
 * throwing `E278`'s neighbor rather than silently rendering it at request time.
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries();
}
