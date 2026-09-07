import type { Metadata } from "next";

import { BUILT_LOCALES, DEFAULT_LOCALE, type Locale } from "./locale.ts";

/**
 * Every rule that turns a route into a `<head>`.
 *
 * **Pure, and unit-tested, which is why it is here and not in `content/`.**
 * `node --test` does not resolve the `@/` alias, so this module value-imports
 * nothing through it — see the Global Constraints in
 * `docs/plans/seo-baseline-implementation.md`. That constraint is the reason
 * `SITE_NAME` lives here rather than in `content/site.ts`, which re-exports it.
 *
 * **Locale-aware while there is one locale**, deliberately. Nothing here draws a
 * second language today: `BUILT_LOCALES` holds `en` alone, so `localePath` is an
 * identity function and `languageAlternates` answers nothing. What it buys is
 * that adding Spanish is a change to `BUILT_LOCALES` and a set of copy files,
 * rather than a rewrite of ten `<head>`s. See
 * `docs/adr/0004-language-is-a-path-segment.md`.
 */

/**
 * The house name, in one place.
 *
 * It was `siteName` in `content/site.ts` until 5 September 2026, and that export
 * still exists as a re-export of this one: every consumer was a page title, and
 * composing page titles is what `buildMetadata` does.
 */
export const SITE_NAME = "The World Tarot";

/**
 * Where this build believes it is deployed.
 *
 * `metadataBase` needs an absolute origin, and a static export has no request to
 * infer one from — so it is configuration, like the API base beside it.
 *
 * **Development falls back rather than throwing**, because `.env*` is gitignored
 * and a fresh clone would otherwise fail to run `next dev`. A production build
 * with this unset would silently emit canonical URLs pointing at localhost,
 * which is worse than a refused build, so that case throws.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;

  if (configured) return configured.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is unset, so every canonical, Open Graph and sitemap URL in " +
        "this build would point at localhost. Set it to the origin this export is served " +
        "from — https://theworldtarot.com in production, https://staging.theworldtarot.com " +
        "on staging.",
    );
  }

  return "http://localhost:3000";
}

/**
 * The path a route takes in one locale.
 *
 * **The default locale keeps the bare path.** That asymmetry is the whole of
 * ADR 0004 and it is not an oversight: `/` stays where it is, `/es/` is pure
 * addition, and no URL that exists today ever moves. The ADR prices the
 * alternative.
 */
export function localePath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;

  return `/${locale}${path}`;
}

/**
 * An absolute URL for a route, which is what a canonical and a sitemap both want.
 *
 * Refuses a path with no trailing slash rather than quietly normalising one.
 * `trailingSlash: true` means `/readings` costs a 308, and a canonical that
 * names the redirecting form points search engines at the hop rather than the
 * page. A typo here is silent everywhere else, so it is loud here.
 */
export function canonicalFor(path: string, locale: Locale = DEFAULT_LOCALE): string {
  if (!path.endsWith("/")) {
    throw new Error(`Route "${path}" has no trailing slash. The export is a directory of index.html files.`);
  }

  return `${siteUrl()}${localePath(path, locale)}`;
}

/**
 * The `<title>`.
 *
 * **The house name leads on the home page and trails everywhere else.** That is
 * how the site read before this module existed and it is a real rule rather than
 * an accident of two authors: the home page is the brand, and an interior page
 * is a thing within it.
 */
export function pageTitle(path: string, title: string): string {
  return path === "/" ? `${SITE_NAME} — ${title}` : `${title} — ${SITE_NAME}`;
}

/**
 * `hreflang`, once there is more than one language to declare.
 *
 * **Answers `undefined` at one built locale**, which is the state today. A page
 * is not an alternate of itself, and a lone `hreflang="en"` pointing at the page
 * carrying it is noise that some crawlers treat as a mistake.
 */
function languageAlternates(path: string): Record<string, string> | undefined {
  if (BUILT_LOCALES.length < 2) return undefined;

  return Object.fromEntries(BUILT_LOCALES.map((locale) => [locale, canonicalFor(path, locale)]));
}

export type PageSeo = {
  /** Absolute, from the site root, with a trailing slash. `/readings/`, or `/`. */
  path: string;
  /** The page's own name. `pageTitle` decides where the house name goes. */
  title: string;
  description?: string;
  /** Defaults to true. False emits `robots: { index: false, follow: false }`. */
  index?: boolean;
};

/**
 * One page's `<head>`.
 *
 * **An indexable page says nothing about robots at all**, rather than declaring
 * `index: true`. The default is to index; stating it adds a tag that means
 * nothing and invites somebody to think the ones that do say something are
 * optional.
 *
 * The Open Graph image is site-wide and lives in `metadataBase`'s shadow —
 * `openGraph.images` resolves relative paths against it, which is the one thing
 * `metadataBase` is genuinely load-bearing for. See `scripts/build-og-image.mjs`.
 */
export function buildMetadata({ path, title, description, index = true }: PageSeo): Metadata {
  const url = canonicalFor(path);
  const fullTitle = pageTitle(path, title);
  const alternates = languageAlternates(path);

  return {
    title: fullTitle,
    ...(description ? { description } : {}),
    alternates: {
      canonical: url,
      ...(alternates ? { languages: alternates } : {}),
    },
    ...(index ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: fullTitle,
      ...(description ? { description } : {}),
      url,
      images: ["/og-image.jpg"],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      ...(description ? { description } : {}),
      images: ["/og-image.jpg"],
    },
  };
}
