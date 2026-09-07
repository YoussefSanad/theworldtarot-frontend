import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";

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
 * Copy is inline rather than in `content/`, and that is a deliberate exception
 * of exactly three strings — this page is not in the navigation document and has
 * no Figma frame. It joins `content/` when the message catalogue lands and it
 * needs translating; see `docs/plans/seo-and-translations.md`.
 */
export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-y-clip">
      {/* The parlour, not the hero: `variant="hero"` portals a globe into
          `#hero-sky`, and this page has no hero to render one. */}
      <PageAtmosphere variant="readings" />
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="shell--copy flex flex-col items-center gap-6 text-center">
          <p className="font-display text-h1 leading-none text-cream">This path is unwritten</p>
          <p className="text-body text-mist-dim">
            The page you were looking for is not here. The cards are, though.
          </p>
          <ButtonLink href="/readings/">GET MY READING</ButtonLink>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
