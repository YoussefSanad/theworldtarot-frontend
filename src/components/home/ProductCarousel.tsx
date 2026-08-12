"use client";

import type { EmblaOptionsType } from "embla-carousel";
import type { ReactNode } from "react";

import { Carousel, CarouselDots, CarouselTrack, CarouselViewport, useCarouselDuration } from "@/components/ui/Carousel";

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
  const duration = useCarouselDuration();

  const options: EmblaOptionsType = {
    active: false,
    align: "center",
    // Wraps past the last tile back to the first (and back again dragging the
    // other way) rather than stopping dead at either end. `containScroll` is
    // irrelevant once looping — Embla ignores it whenever `loop` is on, since
    // there's no longer an edge to contain scrolling against — and 4 slides at
    // 66.7% each comfortably clears the width Embla needs available outside
    // any one slide to loop without a gap (canLoop() in embla-carousel's own
    // source), so no fifth product is required to keep this working.
    loop: true,
    breakpoints: {
      "(width < 40rem)": { active: true },
    },
    duration,
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
