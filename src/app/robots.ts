import type { MetadataRoute } from "next";

import { PRIVATE_ROUTES } from "@/lib/routes";
import { siteUrl } from "@/lib/seo";

/**
 * Emitted as a static `robots.txt` at build. This file convention is not in the
 * static-export unsupported list — checked against
 * `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`, 5 September 2026.
 *
 * **`force-static` is required, not decorative.** A metadata file compiles to a
 * `GET` route handler under the hood, and route handlers are not cached by
 * default — `output: export` refuses to build one that has not opted in,
 * throwing `E278`'s neighbor rather than silently rendering it at request time.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PRIVATE_ROUTES],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
