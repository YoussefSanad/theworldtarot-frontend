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
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
