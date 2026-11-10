"use client";

import { HtmlLang } from "@/components/layout/HtmlLang";
import { LanguageBoundary } from "@/components/layout/LanguageBoundary";
import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { notFound } from "@/content/site";

/**
 * The page behind `not_found_handling = "404-page"` in `wrangler.toml`.
 *
 * **It renders its own chrome.** `not-found.tsx` must sit at `src/app/` to be
 * the export's 404, which puts it outside the `(site)` route group and so
 * outside `SiteLayout` — the header and footer are not inherited here the way
 * every other page inherits them. The wrapper below reproduces that layout's
 * `isolate` and `overflow-y-clip`, both of which `PageAtmosphere` depends on:
 * `isolate` is what lets the artwork sit at `-z-10` without every section
 * needing a z-index, and the clip is what stops an atmosphere that hangs below
 * its content from lengthening the document past the footer.
 *
 * **`HtmlLang` is mounted here for the same reason**, and it is the whole of
 * why this page is a client component. `SiteLayout` renders it for every page
 * inside `(site)`; this one is outside, so without this line a 404 kept
 * `lang="en"` in every language — telling a screen reader to pronounce Spanish
 * as English on the one page a lost visitor is already having a bad time on.
 *
 * Its three strings were inline "until the message catalogue lands and it needs
 * translating". It landed, so they are in `content/site.ts` with the rest of
 * the chrome, and a client component is what lets them re-render in the
 * language the visitor chose. **`LanguageBoundary` is what lets that happen
 * without a hydration failure**, as it does for `SiteLayout`.
 */
export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-y-clip">
      <LanguageBoundary>
        <HtmlLang />

        {/* The parlour, not the hero: `variant="hero"` portals a globe into
            `#hero-sky`, and this page has no hero to render one. */}
        <PageAtmosphere variant="readings" />
        <SiteHeader />

        <main className="flex flex-1 items-center justify-center px-6 py-24">
          <div className="shell--copy flex flex-col items-center gap-6 text-center">
            <p className="font-display text-h1 leading-none text-cream">{notFound.heading}</p>
            <p className="text-body text-mist-dim">{notFound.body}</p>
            <ButtonLink href="/readings/">{notFound.action}</ButtonLink>
          </div>
        </main>

        <SiteFooter />
      </LanguageBoundary>
    </div>
  );
}
