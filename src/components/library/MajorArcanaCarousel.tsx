"use client";

import Autoplay from "embla-carousel-autoplay";
import type { EmblaOptionsType } from "embla-carousel";
import { useReducedMotion } from "motion/react";
import { useMemo, type ReactNode } from "react";

import { Carousel, CarouselCounter, CarouselTrack, CarouselViewport, useCarouselDuration } from "@/components/ui/Carousel";

/**
 * The Major Arcana as a swipeable, self-advancing deck below `sm`, and the
 * client's grid above it.
 *
 * **Twenty-two cards is four screens of scrolling on a phone.** The grid below
 * `30rem` is one card wide and capped at `20rem`, so reaching THE WORLD means
 * scrolling past twenty-one full-height cards — the same problem the product
 * row has, one order of magnitude worse. A carousel turns the page's height
 * back into one card and moves the deck sideways instead.
 *
 * One row of markup, not two: Embla gets `active: false` with a `breakpoints`
 * entry that switches it on under 40rem, so above that width it registers its
 * media-query listener, skips initialising, and never touches the DOM — the
 * deck stays the `.library-grid` the client drew. Crossing the breakpoint re-
 * or de-activates Embla on its own, and deactivating clears its transform, so
 * nothing is left behind once the deck is a grid again. `40rem` is written
 * identically here and in globals.css's "Carousels" block on purpose; a
 * mismatch would leave a flex row Embla no longer drives.
 *
 * Tiles arrive as `children` from `MajorArcanaGrid`, which is a server
 * component, so `TarotCardTile` — and the `next/image`/`next/link` machinery
 * under it — never enters this file's module graph and ships no extra client
 * JS; only the carousel's own mechanics do. This is `ProductCarousel`'s
 * arrangement and the reason it is shaped that way.
 *
 * **The track is still the `<ul>`.** Twenty-two links to twenty-two pages in a
 * deliberate order, and a screen reader should still announce how many there
 * are — being a carousel at one width does not make it less of a list, which is
 * what `CarouselTrack`'s `as` is for.
 */
export function MajorArcanaCarousel({
  children,
  slideCount,
  counterLabel,
}: {
  children: ReactNode;
  slideCount: number;
  counterLabel: readonly [string, string];
}) {
  const duration = useCarouselDuration();
  const reducedMotion = useReducedMotion();

  const options: EmblaOptionsType = {
    active: false,
    align: "center",
    /*
      Wraps past THE WORLD back to THE FOOL rather than stopping dead. With
      twenty-two slides there is no question of clearing the width Embla needs
      outside any one slide to loop without a gap, and looping is what lets the
      counter be the only position indicator: nothing can be reached only by
      backtracking. `containScroll` is irrelevant once looping — Embla ignores
      it whenever `loop` is on, since there is no longer an edge to contain
      scrolling against.
    */
    loop: true,
    breakpoints: {
      "(width < 40rem)": { active: true },
    },
    duration,
  };

  /**
   * A fresh array here on every render would tear Embla down and rebuild it in
   * a loop, so the plugin list is memoised — and it is empty, not merely
   * stopped, when motion is reduced. `useCarouselDuration` zeroes the snap
   * animation for that same preference, but that governs how a slide travels
   * and would not stop a timer deciding to travel at all, so this carousel
   * handles the preference itself the way `MetaStripCarousel` does.
   */
  const plugins = useMemo(
    () =>
      reducedMotion
        ? []
        : [
            Autoplay({
              /*
                Five seconds rather than the plugin's four. These slides are
                links, and the cost of advancing under a thumb is a reader
                landing on the wrong card's page — so the deck waits long
                enough to read a name and decide before it moves on.
              */
              delay: 5000,
              /*
                The timer picks back up after a reader has dragged the deck
                somewhere, so it is never left parked where a thumb abandoned
                it. `stopOnMouseEnter` and `stopOnFocusIn` are what keep that
                from being hostile: a pointer resting on a card or a keyboard
                inside one holds the deck still for as long as it is there.

                Neither of those exists on a touchscreen, which is where this
                carousel actually runs — so on a phone the deck does resume a
                few seconds after a swipe. That is the intended behaviour here,
                and the reason the delay is long.
              */
              stopOnInteraction: false,
              stopOnMouseEnter: true,
              stopOnFocusIn: true,
            }),
          ],
    [reducedMotion],
  );

  return (
    <Carousel options={options} plugins={plugins} initialSnapCount={slideCount} className="library-carousel">
      <CarouselViewport>
        <CarouselTrack as="ul" className="library-grid">
          {children}
        </CarouselTrack>
      </CarouselViewport>
      <CarouselCounter label={counterLabel} className="sm:hidden" />
    </Carousel>
  );
}
