"use client";

import type { EmblaOptionsType } from "embla-carousel";
import type { ReactNode } from "react";

import { Carousel, CarouselDots, CarouselTrack, CarouselViewport, useCarouselDuration } from "@/components/ui/Carousel";

/**
 * The three value props as a swipeable strip, below `sm` only — same pattern
 * as ProductCarousel.tsx (one row of markup; Embla switches itself on under
 * 40rem and stands down above it, so the row is ValueProps.tsx's own grid at
 * every other width). See that file for the shared breakpoint/CSS rationale.
 *
 * Tiles arrive as `children` from the server component that owns the prop
 * data (ValueProps.tsx), same division of labor as ProductCarousel/ChooseYourJourney.
 */
export function ValuePropsCarousel({
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
    loop: true,
    breakpoints: {
      "(width < 40rem)": { active: true },
    },
    duration,
  };

  return (
    <Carousel options={options} initialSnapCount={slideCount}>
      <CarouselViewport>
        <CarouselTrack className="mx-auto grid w-full max-w-(--measure-value-props) justify-center gap-[clamp(2rem,2vw,2.375rem)] max-sm:flex max-sm:justify-start max-sm:gap-0 md:grid-cols-[367fr_457fr_367fr] md:grid-rows-[auto_auto_auto_auto] md:grid-flow-col md:items-start md:gap-x-[clamp(2rem,2vw,2.375rem)] md:gap-y-[0.3em]">
          {children}
        </CarouselTrack>
      </CarouselViewport>
      <CarouselDots groupLabel={dotsLabel} label={(index) => dotLabels[index]} className="mt-stack sm:hidden" />
    </Carousel>
  );
}
