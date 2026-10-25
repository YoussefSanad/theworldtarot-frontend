"use client";

import type { EmblaOptionsType } from "embla-carousel";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { CarouselKnob } from "@/components/viewing-room/CarouselKnob";
import { useDrift } from "@/components/viewing-room/useDrift";
import {
  Carousel,
  CarouselSlide,
  CarouselTrack,
  CarouselViewport,
  useCarousel,
  useCarouselDuration,
} from "@/components/ui/Carousel";
import type { ViewingRoomCard } from "@/content/viewing-room";
import { cn } from "@/lib/cn";
import { thumbnailLabel } from "@/lib/viewing-room-access";

/**
 * The band of cards beneath the player (`384:12`).
 *
 * Her frame shows five at 1920, ~230x380 each with 262px between centres, on a
 * full-bleed band at 29% opacity. **Five visible is a window on the whole
 * deck, not the whole deck**: twenty-two drift through it, which is what
 * continuous auto-scroll means and why she draws a left/right control beneath.
 *
 * ## It drifts, and it has ends
 *
 * **Auto-scroll, no loop.** The drift is `MetaStripCarousel`'s configuration
 * and its reasoning holds here — slow enough to read a card as it passes,
 * pausing on hover and focus, and the plugin not passed at all under
 * `prefers-reduced-motion` rather than merely slowed.
 *
 * The deck does **not** wrap. Twenty-two cards in deck order are a sequence
 * with a first and a last, not a carousel of equals: wrapping means The World
 * sits next to The Fool with nothing to say they are the two ends, and the
 * knob below has nowhere to point. With ends, the knob's seat on its rule is
 * a real position.
 *
 * - **The selected card is marked**, visibly and with `aria-current`.
 * - **The control is her knob** (`CarouselKnob`), not a pair of arrows.
 */
export function ThumbnailCarousel({
  cards,
  selectedId,
  onSelect,
  hint,
  labels,
}: {
  cards: readonly ViewingRoomCard[];
  selectedId: number;
  onSelect: (id: number) => void;
  hint: string;
  labels: { knob: string };
}) {
  const duration = useCarouselDuration();
  const reducedMotion = useReducedMotion();
  const [overflows, setOverflows] = useState(true);

  const options: EmblaOptionsType = useMemo(
    () => ({
      align: "center",
      /** Deck order has a first and a last; see the note above. */
      loop: false,
      // Held to its own edges, so the knob's rule has real ends to sit on.
      containScroll: "trimSnaps",
      /*
        **Free dragging, because this strip drifts rather than paging.**

        Without it Embla rounds to the nearest snap on release — and with
        twenty-two slides centred, a short drag rounds back to the snap it
        started from, which reads as the strip snapping back under your
        hand. A drifting band has no pages to land on, so the release should
        leave it where the hand left it and let the momentum run out.
      */
      dragFree: true,
      // Zeroed under `prefers-reduced-motion`, which Embla's rAF transform
      // would otherwise ignore — see `useCarouselDuration`.
      duration,
    }),
    [duration],
  );

  return (
    <section aria-label={hint} className="relative w-full">
      {/*
        Her hint sits just under the top of the band and well clear of the
        cards: 13px above it in the frame, 33px below. Asymmetric on purpose —
        it reads as a label for the row rather than as a floating caption.
      */}
      <p className="mt-[clamp(2px,0.7vw,13px)] mb-[clamp(18px,2.4vw,46px)] text-center font-serif text-[clamp(13px,1.1vw,18px)] tracking-[0.18px] text-[#b1b2b2]">
        {hint}
      </p>

      <Carousel options={options}>
        <CarouselViewport>
          {/*
            **The gap is per-slide padding, not a flex `gap` on the track.**
            Embla loops by translating slides around the ends, and a flex
            `gap` is laid out between siblings in the DOM — so the seam where
            the last card meets the first had no space in it and the deck
            visibly butted together once per revolution. Padding travels with
            the slide, so every join is the same.
          */}
          {/*
            **A lead-in before the first card.** With `align: "center"` and
            `trimSnaps` the deck began hard against the left edge, so the
            first card was already half out of frame as the drift started
            and there was no moment where you could see the row begin.
            Padding the track gives it that moment, and the matching
            padding at the other end keeps the last card from sitting flush
            against the right edge in the same way.
          */}
          <CarouselTrack
            className={cn(
              "flex items-center",
              /*
                **The runway is only for a deck that scrolls.**

                The lead-in and the trailing spacer exist so a drifting row
                has somewhere to begin and end. A deck too short to overflow
                has no travel to absorb them, so they stop being runway and
                become a left margin — three cards sat 402px right of centre,
                measured, with the strip starting at x=863 on a 1440 screen.

                Short decks centre instead, which is what `align: "center"`
                was always going to do if nothing pushed against it.
              */
              overflows ? "pl-[clamp(24px,8vw,160px)]" : "justify-center",
            )}
          >
            {cards.map((card) => (
              <CarouselSlide
                key={card.id}
                /*
                  **The width is set here, not through `--carousel-slide`.**
                  `.carousel-slide`'s `flex: 0 0 var(…)` is defined in a layer
                  that this track's own `flex` utility outranks, so the slides
                  resolved to `0 1 auto` and shrank to their content — 54px
                  instead of 230, and 109px for the first locked card, whose
                  grayscale filter changed how the image reported its
                  intrinsic size. Measured, not guessed.

                  ~230px of her 1920 frame, so five sit across the band.
                */
                className="w-[clamp(132px,11.98vw,230px)] shrink-0 grow-0 basis-auto px-[clamp(6px,0.85vw,16px)]"
              >
                <Thumbnail
                  card={card}
                  selected={card.id === selectedId}
                  onSelect={onSelect}
                />
              </CarouselSlide>
            ))}

            {/*
              **A spacer slide, not trailing padding on the track.**

              `containScroll: "trimSnaps"` ends the travel at the last
              *slide* and trims any padding past it, so `pr-*` here was
              ignored and the deck came to rest with the last card flush
              against the right edge. A slide is part of the travel, so the
              engine scrolls to it and the card gets room to sit in.
            */}
            {overflows && (
              <CarouselSlide
                aria-hidden
                className="w-[clamp(24px,8vw,160px)] shrink-0 grow-0 basis-auto"
              />
            )}
          </CarouselTrack>
        </CarouselViewport>

        <Drift enabled={!reducedMotion && overflows} />
        <MeasureOverflow onMeasure={setOverflows} />
        {/*
          No scrubber for a strip that cannot scroll. With three cards the
          whole deck is on screen, and a knob that cannot move is a control
          that looks broken.
        */}
        {overflows && <CarouselKnob labels={labels} />}
      </Carousel>
    </section>
  );
}

function Thumbnail({
  card,
  selected,
  onSelect,
}: {
  card: ViewingRoomCard;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  const locked = !card.inViewingRoom;

  return (
    <button
      type="button"
      /*
        A locked card stays in the tab order and says why, rather than being
        skipped. Three of twenty-two have no film yet, and dropping them from
        the sequence silently shortens the deck for anybody not using a mouse.
      */
      aria-label={thumbnailLabel(card)}
      aria-disabled={locked || undefined}
      aria-current={selected || undefined}
      onClick={() => {
        if (!locked) onSelect(card.id);
      }}
      className={cn(
        "group relative block w-full overflow-hidden rounded-[4px] transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "focus-visible:outline-[color:var(--gold,#d4b06a)]",
        selected
          ? "ring-2 ring-[color:var(--gold,#d4b06a)] ring-offset-2 ring-offset-black/60"
          : "opacity-85 hover:opacity-100",
        locked && "cursor-not-allowed",
      )}
    >
      <img
        src={card.image.src}
        alt=""
        width={card.image.width}
        height={card.image.height}
        loading="lazy"
        decoding="async"
        /* 3:5, explicit, so nothing shifts as the strip fills. */
        className={cn("block aspect-[509/842] w-full object-cover", locked && "opacity-45 grayscale")}
      />
    </button>
  );
}

/**
 * Drives the strip's slow drift.
 *
 * A child rather than an effect in the parent, because the Embla instance
 * lives in `Carousel`'s context and only its children can read it — the same
 * reason `CarouselKnob` is one.
 */
function Drift({ enabled }: { enabled: boolean }) {
  const { api } = useCarousel("Drift");
  useDrift(api, { enabled });

  return null;
}

/**
 * Reports whether the deck is long enough to scroll.
 *
 * A child rather than a measurement in the parent, because Embla's own
 * answer lives in its context — and `canScrollNext()` at the first card is
 * exactly the question: a deck that fits has nowhere to go.
 *
 * Re-asked on `reInit`, which Embla fires on resize: three cards overflow a
 * phone and not a desktop, so this is a breakpoint away from changing.
 */
function MeasureOverflow({ onMeasure }: { onMeasure: (overflows: boolean) => void }) {
  const { api } = useCarousel("MeasureOverflow");

  useEffect(() => {
    if (!api) return;

    const measure = () => onMeasure(api.canScrollNext() || api.canScrollPrev());

    measure();
    api.on("reInit", measure);

    return () => {
      api.off("reInit", measure);
    };
  }, [api, onMeasure]);

  return null;
}
