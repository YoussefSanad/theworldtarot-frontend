"use client";

import type { EmblaOptionsType } from "embla-carousel";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { Carousel, CarouselDots, CarouselTrack, CarouselViewport } from "@/components/ui/Carousel";

/**
 * The product row as a swipeable strip, below `sm` only.
 *
 * One row of markup, not two: Embla gets `active: false` with a `breakpoints`
 * entry that switches it on under 40rem, so above that width it registers its
 * media-query listener, skips initialising, and never touches the DOM — the
 * row stays the plain grid the track's own `sm:`/`lg:` classes already lay
 * out. Crossing the breakpoint re- or de-activates Embla on its own, and
 * deactivating clears its transform, so nothing is left behind once the row
 * is a grid again. See globals.css's "Carousels" block for this file's CSS
 * half — `(width < 40rem)` is written identically in both places on purpose;
 * a mismatch would leave a flex row Embla no longer drives.
 *
 * Tiles arrive as `children`, rendered by the server component that owns the
 * product data (`ChooseYourJourney`), so `ProductCard` — and the `next/image`/
 * `next/link` machinery under it — never enters this file's module graph and
 * ships no extra client JS; only the carousel's own mechanics do.
 */

/** Embla's own default (embla-carousel@8.6.0) — not part of its public API to import, so pinned here. */
const DEFAULT_DURATION = 25;

export function ProductCarousel({
  children,
  slideCount,
  dotsLabel,
  dotLabels,
}: {
  children: ReactNode;
  slideCount: number;
  dotsLabel: string;
  dotLabels: string[];
}) {
  const reducedMotion = useReducedMotion();

  const options: EmblaOptionsType = {
    active: false,
    align: "center",
    // Default is 'trimSnaps', which pulls the first and last slide flush to
    // the viewport edge; `false` lets every slide reach centre, so the two end
    // tiles also peek a neighbour rather than only the inner ones doing so.
    containScroll: false,
    breakpoints: {
      "(width < 40rem)": { active: true },
    },
    // globals.css's reduced-motion block only collapses CSS transitions;
    // Embla animates a transform on requestAnimationFrame, so it has to be
    // told separately. `duration` is a frame count, not milliseconds — 0 takes
    // Embla's explicit "instant" branch rather than dividing by it. (Passing
    // `undefined` here instead of the real default would silently disable all
    // scroll animation, not just under reduced motion — Embla's option merge
    // overwrites a key whenever it's present, even with an undefined value.)
    duration: reducedMotion ? 0 : DEFAULT_DURATION,
  };

  return (
    <Carousel options={options} initialSnapCount={slideCount} className="mt-[clamp(1.75rem,3.1vw,3.7rem)]">
      <CarouselViewport>
        <CarouselTrack className="grid gap-x-0 gap-y-10 max-sm:flex sm:grid-cols-2 lg:grid-cols-4">{children}</CarouselTrack>
      </CarouselViewport>
      <CarouselDots groupLabel={dotsLabel} label={(index) => dotLabels[index]} className="mt-stack sm:hidden" />
    </Carousel>
  );
}
