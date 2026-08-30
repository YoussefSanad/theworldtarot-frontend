import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Site chrome only. The artwork behind a page is the page's own — each one
 * renders a `<PageAtmosphere>` as its first element, and this column is the
 * box it fills: it is positioned, so `absolute inset-0` resolves here, and it
 * spans header, main and footer.
 *
 * `isolate` is load-bearing. The atmosphere sits at `-z-10` so every scrap of
 * page content paints over it without each section needing a z-index of its
 * own; without a stacking context here that negative layer would resolve
 * against the root instead and disappear under `body`'s own background.
 *
 * `overflow-y-clip` is what stops an atmosphere from lengthening the document.
 * The readings backdrop deliberately hangs below its own content so the
 * parlour's floor sits under the footer, and an absolutely positioned box that
 * hangs past the end of the page contributes that overhang to the scrollable
 * area — the footer stops being the last thing on the page and the scroll runs
 * on into bare artwork below it. Clipping here, on the one box that spans
 * header, main and footer, ends the document at the footer's own bottom edge
 * while leaving the overhang free to paint behind it.
 *
 * `clip`, not `hidden`: `hidden` would make this a scroll container, which can
 * be scrolled programmatically even with no scrollbar. And the block axis only
 * — the hero's sky layers are drawn wider than the page on purpose, and a
 * `visible` inline axis survives a `clip` block axis untouched (the value only
 * gets coerced when the other axis is scrollable, which `clip` is not).
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-y-clip">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
