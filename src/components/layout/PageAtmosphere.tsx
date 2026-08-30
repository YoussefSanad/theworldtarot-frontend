import { cn } from "@/lib/cn";

/**
 * The artwork stack that sits behind a page.
 *
 * Figma draws each page over its own set of full-bleed layers, so this is a
 * per-page choice rather than site chrome — the element renders as the first
 * child of `main` and takes its box from the positioned column in
 * `src/app/(site)/layout.tsx`, which spans header, main and footer. `-z-10`
 * puts it behind all three inside that column's stacking context; the flat
 * page colour under it is `body`'s own `bg-night`.
 *
 * `id` matters for `hero`: SunriseAtmosphere portals the animated sun and
 * globe into `#hero-sky` (see src/components/home/SunriseAtmosphere.tsx), so
 * that variant has to keep the id the portal looks for.
 *
 * `overflow-clip` on hero is load-bearing. SunriseAtmosphere's rise animates a
 * `translateY` on a child that's itself `inset-0` here — during that animation
 * the child's painted box extends past this element's bottom edge, and
 * scrollable overflow is computed from painted (post-transform) position, not
 * layout position. Without a clip boundary here, that briefly grows the page's
 * real scroll height, popping a scrollbar in and out for the animation's
 * duration.
 */
export type AtmosphereVariant = "hero" | "readings" | "reading";

const VARIANT: Record<AtmosphereVariant, { className: string; id?: string }> = {
  hero: { className: "page-atmosphere-hero overflow-clip", id: "hero-sky" },
  readings: { className: "page-atmosphere-readings" },
  /** A single reading's page: the observatory, not the parlour. */
  reading: { className: "page-atmosphere-reading" },
};

export function PageAtmosphere({ variant, className }: { variant: AtmosphereVariant; className?: string }) {
  const { className: variantClass, id } = VARIANT[variant];

  return (
    <div
      id={id}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 -z-10", variantClass, className)}
    />
  );
}
