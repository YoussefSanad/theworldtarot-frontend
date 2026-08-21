"use client";

import type { EmblaCarouselType, EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import { useReducedMotion } from "motion/react";
import { createContext, use, useCallback, useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The Embla wiring shared by every carousel on the site: a viewport ref, a
 * track, slides, and dots kept in sync with Embla's own state.
 *
 * This primitive stays deliberately unstyled beyond the shared `carousel-*`
 * classes in globals.css — slide width, gaps, and whether a given breakpoint
 * is even active live in each call site's own Embla `options` and classNames.
 * `cn` here is a plain joiner, not a Tailwind-merging one (see `lib/cn.ts`), so
 * a primitive that shipped default sizing classes would risk a silent
 * collision with a call site's override rather than losing to it cleanly.
 * `components/home/ProductCarousel.tsx` is the first call site.
 */

type CarouselContextValue = {
  viewportRef: (node: HTMLDivElement | null) => void;
  api: EmblaCarouselType | undefined;
  snapCount: number;
  selectedIndex: number;
};

const CarouselContext = createContext<CarouselContextValue | null>(null);

/** Embla's own default (embla-carousel@8.6.0) — not part of its public API to import, so pinned here. */
const EMBLA_DEFAULT_DURATION = 25;

/**
 * Embla animates a transform on rAF, so globals.css's reduced-motion block —
 * which only collapses CSS transitions — can't reach it. `duration` is a frame
 * count: 0 takes Embla's explicit "instant" branch. Passing `undefined` would
 * disable scroll animation outright, since Embla's option merge overwrites a
 * key whenever it's present, even with an undefined value.
 */
export function useCarouselDuration() {
  return useReducedMotion() ? 0 : EMBLA_DEFAULT_DURATION;
}

function useCarousel(component: string) {
  const context = use(CarouselContext);
  if (!context) throw new Error(`<${component} /> must be rendered inside <Carousel>`);
  return context;
}

export function Carousel({
  options,
  initialSnapCount = 0,
  slideCount,
  className,
  children,
  ...props
}: {
  options?: EmblaOptionsType;
  /**
   * Dot count to render before Embla mounts, so the pre-hydration markup
   * already has its final dot count and none pop in afterwards. Pass the slide
   * count when `slidesToScroll` is left at its default of 1 (one snap per
   * slide); otherwise Embla's own count wins the moment it initialises.
   */
  initialSnapCount?: number;
  /**
   * How many slides `children` currently holds, when that can change after
   * mount. Leave it out for a fixed set.
   *
   * **Embla does not notice slides being added or removed.** It re-measures on
   * resize and when its options change, and on nothing else, so a track whose
   * children React has just rewritten keeps the old snap list: dots that scroll
   * nowhere, or slides with no dot at all. Passing the count is what triggers
   * the re-measure.
   */
  slideCount?: number;
  children: ReactNode;
} & ComponentPropsWithoutRef<"div">) {
  const [viewportRef, api] = useEmblaCarousel(options);
  const [snapCount, setSnapCount] = useState(initialSnapCount);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onReInit = useCallback((embla: EmblaCarouselType) => {
    setSnapCount(embla.scrollSnapList().length);
    setSelectedIndex(embla.selectedScrollSnap());
  }, []);

  const onSelect = useCallback((embla: EmblaCarouselType) => {
    setSelectedIndex(embla.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    onReInit(api);
    api.on("reInit", onReInit).on("select", onSelect);
    return () => void api.off("reInit", onReInit).off("select", onSelect);
  }, [api, onReInit, onSelect]);

  // Skipped on mount, where Embla has just measured the slides itself and a
  // second pass would only risk throwing away the position it settled on.
  const measured = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!api || slideCount === undefined) return;

    if (measured.current !== undefined && measured.current !== slideCount) {
      // Fires the `reInit` event above, which is what resyncs the dots.
      api.reInit();
    }

    measured.current = slideCount;
  }, [api, slideCount]);

  return (
    <CarouselContext value={{ viewportRef, api, snapCount, selectedIndex }}>
      <div className={className} {...props}>
        {children}
      </div>
    </CarouselContext>
  );
}

/**
 * The element Embla measures and clips. `data-carousel` marks the moment
 * Embla has actually attached — independent of the `active` breakpoint option,
 * which globals.css's `.carousel-window[data-carousel]` rule scopes itself to
 * a width where it matters — so a call site whose carousel runs at every
 * breakpoint can still key its own CSS off the same attribute.
 */
export function CarouselViewport({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  const { viewportRef, api } = useCarousel("CarouselViewport");
  return <div ref={viewportRef} data-carousel={api ? "" : undefined} className={cn("carousel-window", className)} {...props} />;
}

export function CarouselTrack({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("carousel-track", className)} {...props} />;
}

export function CarouselSlide({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("carousel-slide", className)} {...props} />;
}

/**
 * Real, individually-labelled buttons rather than a generic "slide N of M" —
 * see `journey.carousel` in `content/home.ts` for why. Renders nothing while
 * there's zero or one snap, which covers both an inactive Embla instance
 * (`snapCount` holds at `initialSnapCount`) and a carousel with only one slide.
 */
export function CarouselDots({
  label,
  groupLabel,
  className,
}: {
  label: (index: number) => string;
  groupLabel: string;
  className?: string;
}) {
  const { api, snapCount, selectedIndex } = useCarousel("CarouselDots");

  if (snapCount < 2) return null;

  return (
    <div role="group" aria-label={groupLabel} className={cn("flex justify-center", className)}>
      {Array.from({ length: snapCount }, (_, index) => (
        <button
          key={index}
          type="button"
          aria-label={label(index)}
          aria-current={index === selectedIndex ? "true" : undefined}
          onClick={() => api?.scrollTo(index)}
          className="carousel-dot"
        />
      ))}
    </div>
  );
}
