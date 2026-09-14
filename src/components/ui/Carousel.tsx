"use client";

import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import { useReducedMotion } from "motion/react";
import { createContext, use, useCallback, useEffect, useRef, useSyncExternalStore, type ComponentPropsWithoutRef, type HTMLAttributes, type ReactNode } from "react";

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
  plugins,
  initialSnapCount = 0,
  slideCount,
  className,
  children,
  ...props
}: {
  options?: EmblaOptionsType;
  /**
   * Embla plugins, e.g. auto-scroll on the meta strip's symbols. Keep the array
   * referentially stable across renders — Embla tears the carousel down and
   * rebuilds it whenever this identity changes, which on a fresh array every
   * render is an infinite remount.
   */
  plugins?: EmblaPluginType[];
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
  const [viewportRef, api] = useEmblaCarousel(options, plugins);

  /**
   * Embla owns the snap list and the selected index; this component only
   * mirrors them, which is what makes them an external store rather than
   * state of ours.
   *
   * Subscribing was previously an effect that also called its own handler once
   * to catch up, because Embla emits `init` while it is being constructed —
   * before any effect could have been listening. That catch-up was a `setState`
   * in an effect body, and so a render that immediately scheduled another.
   * Reading the value in a snapshot instead removes the catch-up entirely:
   * there is nothing to miss, because nothing is being mirrored into state.
   */
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!api) return () => {};

      api.on("reInit", onStoreChange).on("select", onStoreChange);

      return () => void api.off("reInit", onStoreChange).off("select", onStoreChange);
    },
    [api],
  );

  // The server snapshot is the caller's declared count, which is the whole
  // reason `initialSnapCount` exists: dots that render before Embla has
  // measured anything, so the row does not appear a frame late.
  const snapCount = useSyncExternalStore(
    subscribe,
    () => (api ? api.scrollSnapList().length : initialSnapCount),
    () => initialSnapCount,
  );

  const selectedIndex = useSyncExternalStore(
    subscribe,
    () => (api ? api.selectedScrollSnap() : 0),
    () => 0,
  );

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

/**
 * `as` covers the case where the track is also the semantic container for what
 * it holds — the meta strip's `<dl>`, whose `<dt>`/`<dd>` pairs must stay inside
 * a description list at every width rather than gaining a wrapper that only one
 * layout needs.
 */
export function CarouselTrack({ as: Component = "div", className, ...props }: { as?: "div" | "dl" | "ul" } & HTMLAttributes<HTMLElement>) {
  return <Component className={cn("carousel-track", className)} {...props} />;
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

/**
 * Position as "7 / 22", for a carousel with too many slides to dot.
 *
 * Twenty-two dots is not a row of dots: at 2.75rem of target each it wraps into
 * several lines on a phone and none of them are worth tapping. A counter says
 * the same two things a dot row says — where you are, how much there is — in
 * one line that does not grow with the deck. `CarouselDots` stays the right
 * answer for a set small enough to choose between; this is for the set you
 * swipe through.
 *
 * **`aria-live="off"`, deliberately.** This is a live region by shape, and on
 * an autoplaying carousel a polite one would announce a new number every few
 * seconds, forever, over whatever the reader was actually doing. The slides are
 * links and carry their own names, so nothing is lost by keeping the count
 * silent until it is asked for. The label is on the element rather than a
 * visually hidden sentence so a screen reader reaching it reads "slide 7 of 22"
 * rather than two bare numbers.
 *
 * Hidden entirely while there is nothing to count, matching `CarouselDots`.
 */
export function CarouselCounter({
  label,
  className,
}: {
  /**
   * The accessible name's two halves, e.g. `["Card", "of"]` for "Card 7 of 22".
   *
   * A pair of strings rather than a `(current, total) => string` formatter,
   * because the call site that owns this copy is a server component and **a
   * function cannot cross that boundary** — React has nothing to serialise it
   * into, and the page fails to prerender. `ProductCarousel` passes its dot
   * labels as an array for the same reason.
   */
  label: readonly [string, string];
  className?: string;
}) {
  const { snapCount, selectedIndex } = useCarousel("CarouselCounter");

  if (snapCount < 2) return null;

  const current = selectedIndex + 1;
  const [noun, joiner] = label;

  return (
    <p aria-live="off" aria-label={`${noun} ${current} ${joiner} ${snapCount}`} className={cn("carousel-counter", className)}>
      {/*
        `aria-hidden` on the digits: the accessible name above already says the
        whole thing, and without this a screen reader would read the label and
        then the same two numbers again as text.
      */}
      <span aria-hidden="true">
        {current} <span className="carousel-counter__rule" /> {snapCount}
      </span>
    </p>
  );
}
