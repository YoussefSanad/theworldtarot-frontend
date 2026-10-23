"use client";

import type { EmblaCarouselType } from "embla-carousel";
import { useEffect } from "react";

/**
 * A slow continuous drift for the thumbnail strip.
 *
 * **Not `embla-carousel-auto-scroll`, and it must not go back to it.** That
 * plugin replaces Embla's `scrollBody` while it plays, which fights Embla's
 * own drag engine: measured, the strip stopped responding to the pointer
 * after three or four drags and only a click elsewhere freed it. Ten
 * alternating drags moved 200-400px each with the plugin removed and ~17px
 * each with it present.
 *
 * This nudges the engine's `location` on a frame loop instead, leaving every
 * other part of Embla — drag handling included — untouched. `location`
 * rather than the public `scrollTo` because the public API moves between
 * snap *indices* only, so a sub-pixel nudge rounds to the index it is
 * already on and nothing moves at all.
 */
export function useDrift(
  api: EmblaCarouselType | undefined,
  {
    pixelsPerSecond = 24,
    enabled = true,
    onMove,
  }: { pixelsPerSecond?: number; enabled?: boolean; onMove?: () => void } = {},
) {
  useEffect(() => {
    if (!api || !enabled) return;

    const root = api.rootNode();

    /*
      **Only the things you steer with pause the drift**: the strip itself
      and the knob's rule. The skip buttons are marked out of it — resting
      on one is not a reason to stop the deck, and they are small enough
      that passing the pointer over them on the way elsewhere would stutter
      it for no reason.

      `[data-drift-hold]` is on the rule's wrapper (see `CarouselKnob`), and
      the viewport is Embla's own root.
    */
    const section = root.closest("section");
    const holds = () => [root, ...(section?.querySelectorAll("[data-drift-hold]") ?? [])];

    let frame = 0;
    let last = 0;
    let pointerHeld = false;

    /*
      Asked of the DOM rather than tracked in a counter: a tally of "things
      holding the drift" goes permanently wrong the moment one `mouseleave`
      is missed. `:focus-visible` rather than `:focus` because clicking a
      card focuses it and that focus outlives the click, which would
      otherwise hold the drift for good.
    */
    const blocked = () => {
      if (pointerHeld) return true;

      try {
        return holds().some(
          (node) => node.matches(":hover") || !!node.querySelector(":focus-visible"),
        );
      } catch {
        return false;
      }
    };

    const step = (now: number) => {
      frame = requestAnimationFrame(step);

      const elapsed = last ? now - last : 0;
      last = now;

      if (elapsed <= 0 || blocked()) return;

      const engine = api.internalEngine();

      /*
        **Stopped by the engine's own limit, not `canScrollNext()`.**

        That asks whether a further *snap* exists, and the drift moves
        `location` without Embla's snap index ever advancing — so the
        answer stayed true while the strip walked past its last card and
        off the left of the screen entirely.

        `limit.min` is where the travel ends. Clamping to it means the deck
        comes to rest on the final card instead of leaving.
      */
      const { min } = engine.limit;
      const at = engine.location.get();
      if (at <= min) return;

      const next = Math.max(at - (pixelsPerSecond * elapsed) / 1000, min);

      engine.location.set(next);
      engine.target.set(next);
      engine.translate.to(next);
      engine.slideLooper.loop();

      // Moving the location emits no `scroll`, so listeners are told by hand.
      onMove?.();
    };

    const hold = () => {
      pointerHeld = true;
    };
    /*
      Released on the window as well as on Embla's own `pointerUp`: Embla
      emits that only for *its* drags, so a press on the knob's rule set the
      flag and nothing ever cleared it.
    */
    const release = () => {
      pointerHeld = false;
      last = 0;
    };

    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    api.on("pointerDown", hold).on("pointerUp", release);

    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      api.off("pointerDown", hold).off("pointerUp", release);
    };
  }, [api, enabled, onMove, pixelsPerSecond]);
}
