import Image from "next/image";

import type { MajorArcanaContent } from "@/content/card-content";
import { cardReference } from "@/lib/assets";
import { cn } from "@/lib/cn";

/**
 * The dark panel: "When The Fool Appears in a Reading", and its four columns.
 *
 * **This panel is not part of the page's inversion.** The rest of the page is
 * black on parchment; this is the site's own gold and cream on navy, so it
 * overrides the ink it inherits from `.library-card-page`.
 *
 * Its ground is `--color-card-panel` rather than `--color-card-ink`. The two
 * held the same value until the client took the page's type to pure black —
 * which would have flattened this panel to `#000` had it still been reading
 * the ink token. See the note beside them in globals.css.
 *
 * **The gold border belongs to a child holding the columns, and its top edge
 * runs behind the heading.** Her drawing has the stroke pass *under* the words
 * rather than stop either side of them, so the heading carries the panel's own
 * near-black behind it and occludes the stretch it covers — that background is
 * load-bearing, not decoration.
 *
 * Both are `.stack` cells, which is what lets them overlap without either
 * leaving the flow: the bordered box starts half a line down, the heading sits
 * on that line, and the box's own top padding holds the icons clear of it.
 *
 * Her `FRAME` layer is not this border: that is the ornament at the top of the
 * sheet, with flourished corners and diamonds, and an earlier build wrapped
 * this panel in it.
 *
 * Two more read off her PSD rather than the Figma frame:
 *
 * - **Her gold rule (`DIVIDER 2`) runs under each column's label**,
 *   horizontally, one per column. The first build read it as a vertical rule
 *   between columns, which is a different drawing entirely.
 * - **The vertical separators are thin plain lines** that stop short of the
 *   column's full height, so they are a border on the column box.
 *
 * The heading names the card, so it is a real `<h2>`: on a page whose other
 * sections are pictures and prose, this is the one that titles what follows.
 *
 * **Three insets stack on the same measure** — this panel's own padding, the
 * bordered box's, and each column's — and the columns are a quarter of the
 * width each, so every pixel of all three is spent four times. That is why the
 * client kept reading the four boxes as oddly proportioned, and why the cut
 * she asked for had to come off all three rather than any one of them.
 */
export function AppearsPanel({
  cardName,
  columns,
}: {
  cardName: string;
  columns: MajorArcanaContent["appears"];
}) {
  return (
    <div className="stack rounded-[clamp(calc(0.75rem*var(--card-scale)),calc(1.25vw*var(--card-scale)),calc(1.5rem*var(--card-scale)))] bg-card-panel p-[clamp(calc(0.375rem*var(--card-scale)),calc(0.63vw*var(--card-scale)),calc(0.75rem*var(--card-scale)))]">
      {/*
        The bordered box holds the columns and nothing else, and its top edge
        runs **behind** the heading above it — her drawing has the stroke pass
        under the words rather than stop either side of them.

        It is a `.stack` cell so the heading can overlap it without either
        element leaving the flow: the box starts half a line below this block's
        top, the heading sits on that line, and the padding below the heading is
        what holds them apart.

        **The horizontal inset is tighter than her 40px, at the client's
        request**, and it is the panel's own margin rather than the columns'.
        Measured at 1920px her figure rendered 34px a side, and with the outer
        panel's 17px and each column's own inset stacked on top of it, a column
        of four gave only 143px of its 186px to text.

        **Cut a second time on the same note**: the first pass took this to
        24px and the columns to 16px, and the client still read the four boxes
        as strangely sized — the text was breaking after two or three words and
        leaving deep ragged gutters. Three insets stack on the same measure
        here, so each one is paid four times over; 14px is this one's share.
        Her drawn value is kept in this note because nothing else records it.
      */}
      <div className="mt-[0.72em] w-full self-start rounded-[clamp(calc(0.5rem*var(--card-scale)),calc(0.94vw*var(--card-scale)),calc(1.125rem*var(--card-scale)))] border border-gold/55 px-[clamp(calc(0.375rem*var(--card-scale)),calc(0.73vw*var(--card-scale)),calc(0.875rem*var(--card-scale)))] pb-[clamp(calc(1rem*var(--card-scale)),calc(1.46vw*var(--card-scale)),calc(1.75rem*var(--card-scale)))] pt-[clamp(calc(1.5rem*var(--card-scale)),calc(2.08vw*var(--card-scale)),calc(2.5rem*var(--card-scale)))]">
        {/*
          **`minmax(0, 1fr)` explicitly, which is what makes the four equal.**

          The client's note is that the column widths are inconsistent. They
          were already `grid-cols-4`, and Tailwind writes that as
          `repeat(4, minmax(0, 1fr))` — but a grid item's default `min-width`
          is `auto`, so a track still refuses to shrink below its longest
          unbreakable word. "relationship," in the first column and
          "uncertainty." in the third are long enough to push their tracks past
          a quarter and take the width off the other two.

          `[&>li]:min-w-0` releases that floor, so the four tracks resolve to a
          true quarter each and the text wraps inside them instead of setting
          them. The rule below does the other half of the job.
        */}
        <ul className="grid w-full list-none grid-cols-1 gap-y-[clamp(calc(1.5rem*var(--card-scale)),calc(2vw*var(--card-scale)),calc(2.4rem*var(--card-scale)))] p-0 [&>li]:min-w-0 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column, index) => (
            <li
              key={column.label}
              className={cn(
                /*
                  8px a side rather than her 25px, the smaller half of the
                  client's ask for less horizontal margin in this panel. These
                  four tracks are a quarter of the panel each, so an inset here
                  is paid twice over — it comes straight off the text measure
                  and off the gold rule that underlines each label. It was 16px
                  through the first cut; halving it is the cheapest width this
                  panel had left to give the columns.
                */
                "flex flex-col items-center px-[clamp(calc(0.25rem*var(--card-scale)),calc(0.417vw*var(--card-scale)),calc(0.5rem*var(--card-scale)))] text-center",
                /*
                  The separator belongs to every column that has one before it
                  *in its own row*, so which columns get it changes with the
                  column count: stacked, it is a top border on all but the
                  first; two across, the left-hand one of each pair starts a
                  row and takes none; four across, only the first is exempt.
                */
                index > 0 && "max-sm:border-t max-sm:border-gold/30 max-sm:pt-[clamp(calc(1rem*var(--card-scale)),calc(1.3vw*var(--card-scale)),calc(1.5625rem*var(--card-scale)))]",
                index > 0 && "sm:border-l sm:border-gold/30 sm:odd:border-l-0 lg:border-l lg:odd:border-l",
              )}
            >
              <Image
                src={column.icon.src}
                alt=""
                width={column.icon.width}
                height={column.icon.height}
                className="h-[clamp(calc(2rem*var(--card-scale)),calc(3.3vw*var(--card-scale)),calc(3.96rem*var(--card-scale)))] w-auto"
              />

              <p className="mt-[clamp(calc(0.5rem*var(--card-scale)),calc(1.35vw*var(--card-scale)),calc(1.625rem*var(--card-scale)))] font-serif text-card-label leading-none tracking-[0.01em] text-gold">
                {column.label}
              </p>

              {/*
                Her `DIVIDER 2`, drawn under every label rather than between
                columns.

                **The width caps are gone**, and they were the visible half of
                the client's "inconsistent widths". `max-w-[12.552vw]` measures
                against the *viewport* while the column it sits in measures
                against the panel, so the two drifted apart at every width
                between the breakpoints — four rules of the same drawn length
                reading as four different lengths. Plain `w-full` ties each
                rule to its own column, which is the thing it is meant to
                underline.
              */}
              <Image
                src={cardReference.dividerGold.src}
                alt=""
                width={cardReference.dividerGold.width}
                height={cardReference.dividerGold.height}
                className="mt-[clamp(calc(0.5rem*var(--card-scale)),calc(0.78vw*var(--card-scale)),calc(0.9375rem*var(--card-scale)))] h-auto w-full"
              />

              {/*
                `text-pretty` for the same reason the sphere cards carry it:
                the client does not want a box ending on a lone word, and these
                four columns are narrow enough to strand one. No hard-spaced
                tails here — she named the two in `spheres`, and those are
                pinned in `card-content.ts`; this is the general case.
              */}
              <p className="mt-[clamp(calc(0.5rem*var(--card-scale)),calc(0.83vw*var(--card-scale)),calc(1rem*var(--card-scale)))] text-pretty font-light text-card-fine tracking-[0.01em] text-cream">
                {column.body}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/*
        The heading, laid over the border's top edge. `bg-card-panel` is what
        hides the stroke behind the words — load-bearing rather than
        decorative: without it the rule runs straight through the letters.
      */}
      <h2 className="justify-self-center self-start bg-card-panel px-[clamp(calc(0.75rem*var(--card-scale)),calc(1.56vw*var(--card-scale)),calc(1.875rem*var(--card-scale)))] text-center font-serif text-nav leading-none tracking-[0.01em] text-gold">
        When {cardName} Appears in a Reading
      </h2>
    </div>
  );
}
