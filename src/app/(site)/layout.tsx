import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * `#hero-sky` holds `.page-atmosphere-hero` (the same 9-layer atmosphere as
 * `.page-atmosphere`, minus world-shine/world-globe) plus the animated
 * SunriseAtmosphere layers, portaled in from Hero.tsx so they can paint at
 * the very back of the page while still reading reveal state from deep in
 * `main`. See src/components/home/SunriseAtmosphere.tsx.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div id="hero-sky" aria-hidden className="page-atmosphere-hero pointer-events-none absolute inset-0 z-0" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        {/* SiteHeader is fixed so it can grow on hover/focus without shoving the
            page down. This reserves a small, independent minimum for its resting
            state — not the collapsed header's actual height. The collapsed logo
            is allowed to render taller than this and spill into the hero's own
            top padding; that overlap is intentional, not a bug. See the
            SiteHeader doc comment and `--header-height` in globals.css. */}
        <div aria-hidden className="h-(--header-height) shrink-0" />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
