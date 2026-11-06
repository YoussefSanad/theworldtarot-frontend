"use client";

import AutoScroll from "embla-carousel-auto-scroll";
import type { EmblaOptionsType } from "embla-carousel";
import { useReducedMotion } from "motion/react";
import { useMemo, type ReactNode } from "react";

import { Carousel, CarouselTrack, CarouselViewport } from "@/components/ui/Carousel";

/**
 * The meta strip's five symbols as a continuously drifting row below `sm`, and
 * her plain grid above it.
 *
 * **Five cells wrap badly and there is no arrangement that fixes it.** Two
 * columns leaves a fifth cell alone on its own row, three leaves two — five is
 * prime, so every grid at a phone's width ends with a ragged tail. A drifting
 * row sidesteps the wrap entirely: the cells keep their own width and the row
 * simply continues past the edge of the screen.
 *
 * **Drift rather than snap**, which is the `auto-scroll` plugin instead of
 * `autoplay`: these are decoration beside a value, not slides a reader is meant
 * to page through, so nothing here should demand attention by jumping. It runs
 * slowly, loops seamlessly, and — `stopOnInteraction: false` — picks the drift
 * back up after a reader has dragged it somewhere, so the row is never left
 * parked where a thumb abandoned it.
 *
 * **No dots.** Dots are for a set a reader chooses between, and these five are
 * one continuous strip with no "current" cell to mark. The row loops, so there
 * is nothing to reach and nothing to miss — the reason `CarouselDots` is absent
 * here while every other carousel on the site has it.
 *
 * Under `prefers-reduced-motion` the plugin is simply not passed, which leaves
 * an ordinary draggable strip: the wrap is still solved and nothing moves on its
 * own. Embla's `duration` is a frame count that `useCarouselDuration` zeroes for
 * the same preference, but that governs snap animation and would not stop a
 * drift, so this carousel handles the preference itself.
 */
export function MetaStripCarousel({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();

  const options: EmblaOptionsType = {
    active: false,
    align: "start",
    loop: true,
    breakpoints: {
      "(width < 40rem)": { active: true },
    },
    // `watchDrag` stays on: the drift is not a substitute for being able to
    // push the row along yourself.
    containScroll: false,
  };

  /**
   * A fresh array here on every render would tear Embla down and rebuild it in
   * a loop, so the plugin list is memoised — and it is empty, not merely
   * stopped, when motion is reduced.
   */
  const plugins = useMemo(
    () =>
      reducedMotion
        ? []
        : [
            AutoScroll({
              // Slow enough to read a label as it passes; the row crosses in
              // roughly a quarter-minute rather than marching.
              speed: 0.6,
              startDelay: 0,
              stopOnInteraction: false,
              stopOnMouseEnter: true,
              stopOnFocusIn: true,
            }),
          ],
    [reducedMotion],
  );

  return (
    <Carousel options={options} plugins={plugins} className="[--carousel-slide:auto]">
      <CarouselViewport>
        {/*
          **Five across from `sm` up, exactly as the desktop frame draws it.**
          There is no intermediate three-column arrangement: her row is five
          labelled symbols and a tablet has the width for all five, so wrapping
          them would invent a layout she never drew. The only real change is
          below `sm`, where the drift takes over.

          The gap is `cqw` for the same reason the labels are: a `vw` gap keeps
          growing while the strip is capped at its own measure, so above `lg` it
          was taking width from the tracks faster than the type was giving it
          back and the longest label overran its column again.
        */}
        <CarouselTrack as="dl" className="m-0 grid w-full grid-cols-5 items-center gap-x-[1.2cqw] max-sm:flex">
          {children}
        </CarouselTrack>
      </CarouselViewport>
    </Carousel>
  );
}
