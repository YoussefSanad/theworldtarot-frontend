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
 */
export type AtmosphereVariant = "hero" | "readings";

const VARIANT: Record<AtmosphereVariant, { className: string; id?: string }> = {
  hero: { className: "page-atmosphere-hero", id: "hero-sky" },
  readings: { className: "page-atmosphere-readings" },
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
