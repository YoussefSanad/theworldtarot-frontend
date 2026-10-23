"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useCarousel } from "@/components/ui/Carousel";
import { viewingRoomMarks as marks } from "@/lib/assets";

/**
 * The carousel's control (`384:20`): a gold knob riding a dotted rule.
 *
 * **It is a scrubber, not a pair of buttons.** Her frame draws one 43px disc
 * sitting on a dotted line that runs the width of the band — two `GOLD DOTS`
 * frames, one either side of it — and the disc's position on that line is
 * where the deck has got to. An earlier build read the two arrowheads on the
 * disc as "previous and next" and made two buttons of them; they are the
 * grip, not the controls.
 *
 * So it does three things a pair of arrows cannot: it **shows** position, it
 * can be **dragged** to anywhere in the deck, and clicking the rule jumps
 * there. The arrow keys still step one card at a time, which is what a
 * keyboard needs and what the disc's own arrowheads suggest.
 *
 * ## Why a slider rather than a scrollbar
 *
 * `role="slider"` with `aria-valuenow` in cards, because that is what it is:
 * a control whose value is "which card you are looking at". A screen reader
 * announces "card 7 of 22" and the arrow keys move it, both for free.
 */
export function CarouselKnob({
  labels,
}: {
  labels: { knob: string; first: string; last: string };
}) {
  const { api, snapCount } = useCarousel("CarouselKnob");
  const railRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  /*
    Read by the `scroll` listener, which must not be re-subscribed every time
    the drag state flips — tearing the subscription down mid-gesture loses
    the frames it exists to catch.
  */
  const draggingRef = useRef(false);
  /** The eased jump in flight, so a new gesture can cancel it. */
  const animationRef = useRef(0);

  /*
    Polled on a frame loop, not driven by Embla's `scroll`: `useDrift`
    moves the strip by writing the engine location, which emits nothing —
    an event-driven knob sat still until the visitor dragged.
  */
  useEffect(() => {
    if (!api) return;

    const read = () => {
      // While a hand is on the knob, the hand is the truth. Embla is still
      // settling toward where it was just sent, and letting it write here
      // would drag the knob back out from under the pointer.
      if (draggingRef.current) return;

      // `location`, not `scrollProgress()`: that is computed from Embla's
      // *target*, which the drift never sets.
      const { location, limit } = api.internalEngine();
      const span = limit.max - limit.min;
      const ratio = span === 0 ? 0 : (limit.max - location.get()) / span;

      setProgress(Math.min(Math.max(ratio, 0), 1));
    };

    /*
      **Read on a frame loop, not only on Embla's `scroll` event.**

      `useDrift` moves the strip by writing the engine's location, which
      emits nothing — Embla fires `scroll` only for its own scrolling. So a
      knob listening for that event alone sat perfectly still until the
      visitor dragged, and only then started following. The loop asks
      instead of waiting to be told, which is correct for both sources.

      It is a position read and a `setState` that usually changes nothing;
      React bails out of a render when the value is identical, so the cost
      is the read.
    */
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      read();
    };

    read();
    frame = requestAnimationFrame(tick);
    api.on("reInit", read);

    return () => {
      cancelAnimationFrame(frame);
      api.off("reInit", read);
    };
  }, [api]);

  /**
   * Steer the deck, and seat the knob under the pointer while doing it.
   *
   * **Both halves are needed.** `scrollTo` moves the strip, but the knob's
   * own position is read from `scrollProgress()` — and with auto-scroll
   * running that value is pulled back toward the drift between frames, so a
   * knob that only followed it crawled a fraction of a percent while the
   * pointer was most of the way across the rule. Setting `progress` here as
   * well pins the knob to the hand; the next `scroll` event agrees with it
   * a frame later.
   */
  /** Move the strip to a point along its travel, 0 at the first card. */
  const seekToRatio = useCallback(
    (ratio: number, { animate = false }: { animate?: boolean } = {}) => {
      if (!api) return;

      /*
        **The knob is only placed ahead of the strip when a hand is on it.**

        For a drag that is right: the hand is the truth and the strip
        catches up. For an eased jump it is wrong — setting it here threw
        the knob to the far end in one frame, the reader below pulled it
        back to where the strip actually was, and it then travelled the
        distance again. That is the flick-and-return on a skip press.

        During a jump the reader follows the engine, so the knob rides the
        strip instead of racing it.
      */
      if (!animate) setProgress(ratio);

      /*
        **Seek the engine's location, not `scrollTo`.**

        `scrollTo` tweens toward a snap index over several frames, and
        `useDrift` writes `engine.location` on every one of them — so the
        drift overwrote the knob's move before it could land and the knob
        appeared to do nothing. Both now speak the same language: a
        position, written once, in the units the strip actually scrolls in.

        `limit` is the engine's own travel, so the ends are its ends rather
        than a number computed here that could disagree with them.
      */
      const engine = api.internalEngine();
      const { min, max } = engine.limit;
      const target = max - ratio * (max - min);

      const place = (at: number) => {
        engine.scrollBody.useDuration(0);
        engine.location.set(at);
        engine.target.set(at);
        engine.translate.to(at);
        engine.slideLooper.loop();
      };

      if (!animate) {
        place(target);
        return;
      }

      /*
        **Eased by moving the location ourselves, frame by frame.**

        `engine.scrollTo.distance` looked like the way to animate this and
        is not: it applies a raw delta without bounding it, so a jump to
        the first card from part way along flew a whole viewport past the
        start (measured at +1396 where the strip rests near -48). Easing
        the same clamped position the instant branch uses keeps both paths
        honest about where the ends are.

        `useDrift` yields while this runs because it is a pointer gesture,
        and picks up from wherever it lands.
      */
      const from = engine.location.get();
      const started = performance.now();
      const duration = 420;

      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      const stepTo = (now: number) => {
        const t = Math.min((now - started) / duration, 1);
        place(from + (target - from) * ease(t));
        if (t < 1) animationRef.current = requestAnimationFrame(stepTo);
      };

      cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(stepTo);

      /*
        No `api.scrollTo` here: it takes a snap *index*, so it rounded the
        smooth position just written onto the nearest card and tweened back
        to it — the knob moved continuously, the strip arrived in steps.
      */
    },
    [api],
  );

  /** The same seek, addressed by a pointer's position on the rule. */
  const scrollTo = useCallback(
    (clientX: number, options?: { animate?: boolean }) => {
      const rail = railRef.current;
      if (!rail) return;

      const { left, width } = rail.getBoundingClientRect();
      seekToRatio(Math.min(Math.max((clientX - left) / width, 0), 1), options);
    },
    [seekToRatio],
  );

  /**
   * Jump to one end of the deck, travelling rather than teleporting.
   *
   * The same eased branch a press on the rule takes — these are the same
   * gesture with the destination fixed.
   */
  const seekToEnd = useCallback(
    (edge: "first" | "last") => {
      /*
        The same engine seek the rule uses, with the ratio pinned to an end.

        **Not `api.scrollTo`**, which looks like the obvious choice for
        "go to the first card" and is wrong here: it moves to where Embla
        thinks that snap is, and `useDrift` has been moving `location`
        without ever updating Embla's snap index — so the two disagree and
        the jump landed a full viewport past the start, measured at +1396.
        Everything that moves this strip speaks in positions, not indices.
      */
      seekToRatio(edge === "first" ? 0 : 1, { animate: true });
    },
    [seekToRatio],
  );


  /**
   * Follow the pointer until it is released.
   *
   * Listeners attach here rather than in an effect keyed on state: React
   * sets state asynchronously, so an effect attaches a tick late and the
   * first move of a fast drag is lost. On the window, so a pointer leaving
   * the rule keeps steering.
   */
  const beginDrag = useCallback(
    (clientX: number, target?: Element, pointerId?: number, fromRail = false) => {
      draggingRef.current = true;

      // Captured so a release swallowed elsewhere cannot strand the flag.
      if (target && pointerId !== undefined) {
        try {
          (target as HTMLElement).setPointerCapture(pointerId);
        } catch {
          // Safari refuses capture on an element that is being removed; the
          // window listeners below are the fallback.
        }
      }

      /*
        The drift is paused for the length of the gesture so the hand and
        the auto-scroll are never steering at once, and started again on
        release — but **only if the pointer has left the carousel by then**.
        The plugin's own `stopOnMouseEnter` is a separate stop, and calling
        `play()` over the top of it restarts a drift the visitor is still
        hovering, which is the one thing that setting exists to prevent.
      */
      const autoScroll = api?.plugins()?.autoScroll as
        | { stop?: () => void; play?: () => void }
        | undefined;
      autoScroll?.stop?.();

      scrollTo(clientX, { animate: fromRail });

      const move = (event: PointerEvent) => scrollTo(event.clientX);
      const stop = () => {
        draggingRef.current = false;

        const over = api?.rootNode?.()?.matches(":hover") ?? false;
        if (!over) autoScroll?.play?.();

        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
        window.removeEventListener("lostpointercapture", stop);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
      // Losing the capture — a context menu, a system gesture — ends the
      // drag too, rather than leaving the flag set.
      window.addEventListener("lostpointercapture", stop);
    },
    [api, scrollTo],
  );

  return (
    /*
      **The rule is 743 of her 1920, centred — not the width of the page.**
      Her `BUTTON` frame sits at x=614 with 563 to its right, so it is 38.7%
      of the artboard with even margins. An earlier build ran the dots from
      edge to edge, which also made her single tile look like wallpaper
      rather than a line.

      Her two `GOLD DOTS` frames are that same 383px tile placed twice, at
      x=0 and x=360, to span the 743. Here it is one element with the tile
      repeating inside it, which comes to the same picture and does not care
      how wide the rule ends up.
    */
    <div className="mt-[clamp(14px,1.6vw,30px)] flex w-full flex-col items-center">
      {/* `data-drift-hold`: hovering the rule or the knob pauses the drift. */}
      <div
        data-drift-hold
        className="relative h-[43px] w-[min(100%,clamp(260px,38.7vw,743px))]"
      >
        {/*
          The rule is the hit area as well as the decoration: a press
          anywhere along it sends the deck to that point.
        */}
        <div
          ref={railRef}
          onPointerDown={(event) => beginDrag(event.clientX, event.currentTarget, event.pointerId, true)}
          /*
            20px rather than the knob's full 43: this strip is invisible and
            spans the whole rule, and at 43 it reached within a few pixels
            of the cards above — close enough that a press meant for the
            band's lower edge started a knob drag instead. Tall enough to
            hit comfortably, short enough to stay out of the way.
          */
          className="absolute inset-x-0 top-1/2 h-[20px] -translate-y-1/2 cursor-pointer"
        >
          {/*
            **The dots are drawn, not tiled from her export.** Her asset is
            330px of dots whose spacing is not actually uniform — widths of
            4-6px with gaps of 3-5 — so repeating it across a rule of any
            other width broke the rhythm every tile, and the seams read as
            holes in the line. Measured gaps of 16 to 43px in the rendered
            strip against 3-5 in the source.

            A gradient cannot have a seam. The colour and the dot size are
            hers, sampled from that export: `rgb(145,123,81)` at 3px on a
            9px pitch, which is the pitch her dots average.
          */}
          <span
            aria-hidden
            className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, rgb(145 123 81) 0 3px, transparent 3px 9px)",
            }}
          />
        </div>

        <button
          type="button"
          role="slider"
          aria-label={labels.knob}
          aria-valuemin={1}
          aria-valuemax={Math.max(snapCount, 1)}
          /*
            Announced from the selected snap rather than from `progress`: a
            screen reader wants "card 7", not a fraction that changes sixty
            times a second while the strip drifts.
          */
          /*
          Derived from the knob's own position rather than Embla's
          selected snap: nothing calls `scrollTo` any more, so that snap no
          longer tracks a knob drag — and announcing a stale card is worse
          than computing the live one.
        */
        aria-valuenow={Math.round(progress * Math.max(snapCount - 1, 0)) + 1}
          onPointerDown={(event) => {
            event.preventDefault();
            beginDrag(event.clientX, event.currentTarget, event.pointerId);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              api?.scrollPrev();
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              api?.scrollNext();
            }
          }}
          /*
            `left` as a percentage with a -50% shift, so the knob's centre lands
            on the rule's ends at 0 and 1 rather than its edges — the disc sits
            *on* the line's start, not beside it.

            No transition while dragging: the knob should be under the finger,
            not easing toward it.
          */
          style={{ left: `${progress * 100}%` }}
          className={[
            "absolute top-1/2 size-[43px] -translate-x-1/2 -translate-y-1/2",
            "cursor-grab touch-none rounded-full active:cursor-grabbing",
            // Lifts under the hand, presses in on the grab.
            "transition-[filter,scale] duration-200 ease-out",
            "hover:brightness-110 focus-visible:brightness-110 active:scale-95",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
            "focus-visible:outline-[color:var(--gold,#d4b06a)]",
            /*
            **No transition on `left`.** It is rewritten every frame while
            the strip drifts, and a 300ms ease restarts on each write — so
            the knob never reached the value it was easing toward and
            lurched a few pixels at a time instead of gliding. The motion is
            already smooth because the source is smooth.
          */
          ].join(" ")}
        >
          <img
            src={marks.knob.src}
            alt=""
            width={marks.knob.width}
            height={marks.knob.height}
            draggable={false}
            className="size-full select-none"
            />
          </button>
      </div>

      {/*
        Below the rule rather than flanking it, so the dotted line runs
        unbroken from end to end and the knob has the whole of it.
      */}
      <div className="mt-[clamp(8px,0.9vw,14px)] flex items-center gap-[clamp(14px,1.4vw,22px)]">
        <SkipControl edge="first" label={labels.first} onSkip={seekToEnd} />
        <SkipControl edge="last" label={labels.last} onSkip={seekToEnd} />
      </div>
    </div>
  );
}

/**
 * A small double-chevron either side of the rule: jump to the first or the
 * last card.
 *
 * The rule is a scrubber, so its two ends are meaningful places — these are
 * the shortcut to them, in the same gold as the knob and deliberately
 * smaller than it, since they are the lesser control.
 */
function SkipControl({
  edge,
  label,
  onSkip,
}: {
  edge: "first" | "last";
  label: string;
  onSkip: (edge: "first" | "last") => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onSkip(edge)}
      className={[
        "grid size-[26px] shrink-0 cursor-pointer place-items-center rounded-full",
        "text-[color:var(--gold,#d4b06a)]/60",
        "transition-[color,filter,scale] duration-200 ease-out",
        // The glow is a drop-shadow on the mark rather than a ring on the
        // box: there is no box to speak of, just the chevrons on the floor.
        "hover:text-[color:var(--gold,#d4b06a)] hover:drop-shadow-[0_0_6px_rgba(212,176,106,0.65)]",
        "focus-visible:text-[color:var(--gold,#d4b06a)] focus-visible:drop-shadow-[0_0_6px_rgba(212,176,106,0.65)]",
        "active:scale-90 active:duration-75",
        "focus-visible:outline-none",
      ].join(" ")}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={[
          "size-[14px] fill-none stroke-current stroke-[2.2]",
          edge === "last" ? "rotate-180" : "",
        ].join(" ")}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 5l-7 7 7 7" />
        <path d="M11 5l-7 7 7 7" />
      </svg>
    </button>
  );
}
