"use client";

import AutoScroll from "embla-carousel-auto-scroll";
import type { EmblaOptionsType } from "embla-carousel";
import { useReducedMotion } from "motion/react";
import { useMemo } from "react";

import { Carousel, CarouselSlide, CarouselTrack, CarouselViewport, useCarousel } from "@/components/ui/Carousel";
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
 * ## The drift is `MetaStripCarousel`'s, re-tuned
 *
 * That component already solved this on this site and its reasoning holds
 * here: drift rather than snap, so nothing demands attention by jumping;
 * `stopOnInteraction: false`, so the row is never left parked where a thumb
 * abandoned it; and under `prefers-reduced-motion` the plugin is **not
 * passed** rather than merely slowed, which leaves an ordinary draggable
 * strip.
 *
 * Two deliberate departures, both because this strip is a set to choose from
 * rather than decoration beside a value:
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
  const reducedMotion = useReducedMotion();

  const options: EmblaOptionsType = {
    align: "center",
    loop: true,
    // The strip is a continuous band rather than a set of pages, so it is not
    // held to its own edges.
    containScroll: false,
  };

  /**
   * A fresh array every render would tear Embla down and rebuild it in a loop,
   * so this is memoised — and empty, not merely stopped, under reduced motion.
   */
  const plugins = useMemo(
    () =>
      reducedMotion
        ? []
        : [
            AutoScroll({
              // Slower than the meta strip's 0.6: twenty-two cards is a longer
              // journey than five captions, and a visitor is choosing from
              // these rather than reading past them.
              speed: 0.4,
              startDelay: 0,
              stopOnInteraction: false,
              stopOnMouseEnter: true,
              stopOnFocusIn: true,
            }),
          ],
    [reducedMotion],
  );

  return (
    <section aria-label={hint} className="relative w-full">
      <p className="mb-3 text-center text-[18px] tracking-[0.18px] text-[#b1b2b2]">{hint}</p>

      <Carousel
        options={options}
        plugins={plugins}
        /* ~230px of a 1920 frame, so five sit across it as her band does. */
        className="[--carousel-slide:clamp(140px,11.98vw,230px)]"
      >
        <CarouselViewport>
          <CarouselTrack className="flex gap-[clamp(12px,1.7vw,32px)]">
            {cards.map((card) => (
              <CarouselSlide key={card.id} className="carousel-slide">
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
