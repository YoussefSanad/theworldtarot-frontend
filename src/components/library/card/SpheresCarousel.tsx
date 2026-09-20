"use client";

import type { EmblaOptionsType } from "embla-carousel";
import Image from "next/image";

import { Carousel, CarouselDots, CarouselSlide, CarouselTrack, CarouselViewport, useCarouselDuration } from "@/components/ui/Carousel";
import { OrnateFrame } from "@/components/ui/OrnateFrame";
import type { MajorArcanaContent } from "@/content/card-content";
import { cardReference } from "@/lib/assets";

/**
 * Love, career and money — three framed cards, each a heading over a paragraph
 * with one of the client's watercolours filling the foot of its frame.
 *
 * **A swipeable strip below `sm`, a plain row above it**, the `ProductCarousel`
 * arrangement and for the same reason: three 369px cards stacked is three
 * screens of scrolling on a phone, and her composition is three abreast. Embla
 * gets `active: false` with a `breakpoints` entry that switches it on under
 * 40rem, so there is one row of markup rather than two and above that width
 * Embla never touches the DOM.
 *
 * **40rem is written here and in globals.css's "Carousels" block, and the two
 * must agree.** A width where the CSS says "strip" but Embla has stood down is
 * an overflowing flex row nothing can scroll.
 *
 * Each card is wrapped in a `CarouselSlide`, which is what owns the width below
 * `sm` — `--carousel-slide` is read by `.carousel-slide` and nothing else, so a
 * card dropped straight into the track is a bare flex item that shrinks to
 * share the row instead of becoming a slide. Above `sm` the slide is
 * `contents`, handing the card back to the three-column grid untouched.
 *
 * **The gutter is padding inside each slide, not a `gap` on the row**, and the
 * first card is the reason. A flex `gap` falls only *between* items, so the
 * leading card would sit flush against the strip's edge while every other card
 * carried space on its left — the gap belongs to the slide, so each card is
 * inset identically including the first and the last. The slide's width covers
 * the card plus both half-gutters, which is why it is wider than the card's own
 * share of the screen.
 *
 * Each card is itself a `.stack`: the watercolour, the frame and the text share
 * one grid cell, so the tallest sets the height and nothing is positioned
 * absolutely. **In practice the watercolour is always the tallest** — it is
 * given an explicit `aspect-369/420` and the copy has never reached it, which
 * is what keeps the three cards the same height as each other and is where
 * the card's height is actually set; see the note on the `<Image>` below.
 * Inside it the type is sized in `cqw` against the card's own box —
 * the `ProductCard` pattern — because these proportions are the frame's at the
 * card's 369px width, whatever width the column happens to give it.
 */
export function SpheresCarousel({
  cardName,
  spheres,
}: {
  cardName: string;
  spheres: MajorArcanaContent["spheres"];
}) {
  const duration = useCarouselDuration();

  const cards = [
    { label: "love", body: spheres.love, art: cardReference.sphereLove },
    { label: "career", body: spheres.career, art: cardReference.sphereCareer },
    { label: "money", body: spheres.money, art: cardReference.sphereMoney },
  ];

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
    <Carousel
      options={options}
      initialSnapCount={cards.length}
      /*
        `--carousel-lift` is the room the diamond trio needs above each card.
        The window clips at its padding box and the crest is drawn outside the
        card's own border, so without this the top of the diamonds is shaved
        off — measured at 8px of overhang against the window's 5px on a 390px
        screen. Half the ornament sits above the line, which is 2.95% of the
        card, and the slide is ~86% of the viewport: this clamp covers that
        across the range the strip actually runs at.
      */
      className="[--carousel-slide:86%] [--spheres-gutter:clamp(0.375rem,1.5vw,0.625rem)] [--carousel-lift:clamp(0.5rem,2.6vw,1rem)]"
    >
      <CarouselViewport>
        <CarouselTrack className="grid gap-x-[clamp(1rem,0.94vw,1.125rem)] gap-y-10 max-sm:flex max-sm:gap-x-0 sm:grid-cols-3">
          {cards.map((card) => (
            // Below `sm` this is the flex item the strip drags, and the only
            // thing that reads `--carousel-slide` (see globals.css's
            // "Carousels" block); `sm:contents` hands the card straight back to
            // the three-column grid above that width, so the row above is
            // unchanged. 82% leaves the peek that shows a card is swipeable.
            <CarouselSlide key={card.label} className="max-sm:px-(--spheres-gutter) sm:contents">
              {/*
                **`OrnateFrame`, not her frame artwork.** This is the same
                construction the Readings cards use and it is the right one for
                the same reasons, set out in globals.css's "Framed panels"
                block: a hairline rectangle stretched to a responsive box goes
                soft and uneven, and a fixed-aspect image cannot follow a card
                that grows when its copy wraps to another line. So the rectangle
                is rebuilt from tokens and only her diamonds ship as artwork,
                cropped out of the same layer.

                Two earlier attempts drew her whole `LOVE DIAMOND FRAME TOP`
                instead — first stretched to the card, which pulled the diamonds
                down inside it, then oversized and hung above, which lifted the
                border off the picture. The trio belongs *on* the line, which is
                what `.ornate-crest` has always done.
              */}
              <OrnateFrame
                variant="sphere"
                className="w-full"
                bodyClassName="stack"
                marksClassName="panel-marks--single"
                marks={
                  <Image
                    src={cardReference.sphereCrest.src}
                    alt=""
                    width={cardReference.sphereCrest.width}
                    height={cardReference.sphereCrest.height}
                    className="ornate-crest ornate-crest--sphere h-auto max-w-none"
                  />
                }
              >
              {/*
                **This picture is what makes the card tall, not the words
                beside it.** Both share one `.stack` cell, and the text block
                is the shorter of the two at every width — so the row is sized
                by the image's own aspect, and the copy simply sits in front of
                it. Measured: all three cards render exactly 455/369 of their
                width, identical to each other, though love runs five lines and
                the other two run four.

                Which is why the client's "make them 15–20% shorter" is solved
                *here* rather than by trimming the padding below. Cutting the
                text block's padding moves the words up inside a box whose
                height never changes — the first attempt at this did exactly
                that, and the cards stayed 316px while the headings ended up in
                the diamonds.

                So the box is given an aspect of its own, shorter than the
                asset's, and `object-position: bottom` decides which end of the
                art the crop takes. Her watercolour is empty parchment for its
                top ~60% (measured: love 64.8%, career 59.6%, money 58.2%) with
                the landscape painted below, so anchoring the bottom spends the
                crop on that dead parchment and carries the mountains up under
                the text — the "move the illustration up and close the gap"
                half of her note, which was a 74px band of blank paper.

                **369/420 against her 369/455 is 7.5% off the card.** An
                earlier pass took 17.6% at `369/375`, which was inside the
                client's stated band but cropped so far that the wash came up
                under the last line of copy — measured, the first visible ink
                *overlapped* the text by 3px on love and 12px on money. She
                asked for the height back, so the ratio is the looser one and
                the gap is the thing being protected rather than the
                percentage.

                **The three knobs fight each other, which is why they are
                tuned as a set.** Widening `px` narrows the measure, and past
                `10.5cqw` love's paragraph wraps to a sixth line and drops
                straight back into the paint — so the side padding is capped
                there, not by taste. Re-tune all three together and re-measure
                the gap; do not raise one alone.

                `aspect-369/420` needs `h-auto` to beat the `size-full` this
                used to carry: a fixed `height:100%` resolves against the cell
                and the ratio never applies.
              */}
                <Image
                  src={card.art.src}
                  alt=""
                  width={card.art.width}
                  height={card.art.height}
                  className="aspect-369/420 h-auto w-full object-cover object-bottom"
                  sizes="(width >= 64rem) 19.2vw, 82vw"
                />

                {/*
                  `9.5cqw` top clears `.ornate-crest--sphere`, which hangs half
                  its trio 2.95cqw *inside* the card — under about 4cqw the
                  heading's capitals run into the diamonds. It is well past
                  that floor because the client wanted more air over the
                  heading, not because the crest needs it.

                  **`10.5cqw` is a ceiling on the sides**: at `11cqw` love
                  wraps to six lines and the copy lands back in the
                  watercolour. See the note on the `<Image>` above.
                */}
                <div className="flex flex-col items-center px-[10.5cqw] pb-[5cqw] pt-[9.5cqw] text-center">
                  <h3 className="font-serif text-h3 leading-none tracking-[0.01em] text-card-ink">{card.label}</h3>

                  {/*
                    **`text-pretty` and the hard-spaced tails together.** The
                    client's note was specific: "growth" alone under career,
                    "decisions" alone under money. `text-pretty` asks the
                    browser to avoid a short last line generally; the non-
                    breaking spaces in `card-content.ts` are what guarantee the
                    two she named, since `text-wrap: pretty` is a preference a
                    narrow column can still overrule.
                  */}
                  <p className="mt-[4.5cqw] text-pretty font-light text-card-body leading-[1.083] tracking-[0.01em] text-black">
                    {card.body}
                  </p>
                </div>
              </OrnateFrame>
            </CarouselSlide>
          ))}
        </CarouselTrack>
      </CarouselViewport>

      <CarouselDots
        groupLabel={`${cardName} in love, career and money`}
        label={(index) => cards[index]?.label ?? "sphere"}
        className="mt-stack sm:hidden"
      />
    </Carousel>
  );
}
