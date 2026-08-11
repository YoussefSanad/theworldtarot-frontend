import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * `#hero-sky` holds `.page-atmosphere-hero` (the same 9-layer atmosphere as
 * `.page-atmosphere`, minus world-shine/world-globe) plus the animated
 * SunriseAtmosphere layers, portaled in from Hero.tsx so they can paint at
 * the very back of the page while still reading reveal state from deep in
 * `main`. See src/components/home/SunriseAtmosphere.tsx.
 *
 * `overflow-clip`: this div is `inset-0` against the *whole page*, not just
 * the hero, so its bottom edge sits exactly at the page's real bottom edge.
 * SunriseAtmosphere's rise animates a `translateY` on a child that's itself
 * `inset-0` here — during that animation the child's painted box extends
 * past this element's bottom edge, and scrollable overflow is computed from
 * painted (post-transform) position, not layout position. Without a clip
 * boundary here, that briefly grows the page's real scroll height, popping a
 * scrollbar in and out for the animation's duration. Nothing here is
 * interactive content (aria-hidden, pointer-events-none), so clipping is free.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div id="hero-sky" aria-hidden className="page-atmosphere-hero pointer-events-none absolute inset-0 z-0 overflow-clip" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
