"use client";

import type { EmblaOptionsType } from "embla-carousel";
import { useMemo } from "react";

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
 * ## It loops, and it does not drift
 *
 * **No auto-scroll.** The strip is a set to choose from rather than decoration
 * beside a value, and a row that moves on its own is a row a visitor has to
 * chase to click — the thing they are trying to do is pick a card. It wraps
 * instead: `loop` means the deck has no ends, so the arrows and a drag both
 * run forever in either direction without ever stopping at an edge.
 *
 * Two more departures from the strips elsewhere on the site, for the same
 * reason:
 *
 * - **The selected card is marked**, visibly and with `aria-current`.
 * - **Manual controls exist.** Her frame draws one disc with both arrows; it
 *   is built as two buttons, because one control cannot be a previous *and* a
 *   next to a screen reader.
 */
export function ThumbnailCarousel({
  cards,
  selectedId,
  onSelect,
  hint,
  labels,
}: {
  cards: readonly ViewingRoomCard[];
  selectedId: string;
  onSelect: (id: string) => void;
  hint: string;
  labels: { previous: string; next: string };
}) {
  const duration = useCarouselDuration();

  const options: EmblaOptionsType = useMemo(
    () => ({
      align: "center",
      /** The deck has no ends: the arrows and a drag both run forever. */
      loop: true,
      // A looping strip is a continuous band rather than a set of pages, so it
      // is not held to its own edges.
      containScroll: false,
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
          <CarouselTrack className="flex items-center gap-[clamp(12px,1.7vw,32px)]">
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
                className="w-[clamp(132px,11.98vw,230px)] shrink-0 grow-0 basis-auto"
              >
                <Thumbnail
                  card={card}
                  selected={card.id === selectedId}
                  onSelect={onSelect}
                />
              </CarouselSlide>
            ))}
          </CarouselTrack>
        </CarouselViewport>

        <CarouselArrows labels={labels} />
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
  onSelect: (id: string) => void;
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
 * Her one disc with two arrows, built as two buttons.
 *
 * `useCarousel` is the primitive's own context hook, so these drive the same
 * Embla instance the track does.
 */
function CarouselArrows({ labels }: { labels: { previous: string; next: string } }) {
  const { api } = useCarousel("CarouselArrows");

  return (
    <div className="mt-4 flex items-center justify-center gap-4">
      <ArrowButton label={labels.previous} onClick={() => api?.scrollPrev()} direction="prev" />
      <ArrowButton label={labels.next} onClick={() => api?.scrollNext()} direction="next" />
    </div>
  );
}

function ArrowButton({
  label,
  onClick,
  direction,
}: {
  label: string;
  onClick: () => void;
  direction: "prev" | "next";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      /* 44px: the tap target the ticket asks for, around her 43px disc. */
      className={cn(
        "grid size-11 place-items-center rounded-full",
        "border border-[color:var(--gold-line,#d4b06a)]/60 text-[color:var(--gold,#d4b06a)]",
        "transition-colors hover:border-[color:var(--gold,#d4b06a)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={cn("size-4 fill-none stroke-current stroke-2", direction === "next" && "rotate-180")}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}
