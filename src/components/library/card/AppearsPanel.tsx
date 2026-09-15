import Image from "next/image";

import type { MajorArcanaContent } from "@/content/card-content";
import { cardReference } from "@/lib/assets";
import { cn } from "@/lib/cn";

/**
 * The dark panel: "When The Fool Appears in a Reading", and its four columns.
 *
 * **This panel is not part of the page's inversion.** The rest of the page is
 * near-black on parchment; this is the site's own gold and cream on navy, so it
 * overrides the ink it inherits from `.library-card-page`.
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
 */
export function AppearsPanel({
  cardName,
  columns,
}: {
  cardName: string;
  columns: MajorArcanaContent["appears"];
}) {
  return (
    <div className="stack rounded-[clamp(0.75rem,1.25vw,1.5rem)] bg-card-ink p-[clamp(0.625rem,1.04vw,1.25rem)]">
      {/*
        The bordered box holds the columns and nothing else, and its top edge
        runs **behind** the heading above it — her drawing has the stroke pass
        under the words rather than stop either side of them.

        It is a `.stack` cell so the heading can overlap it without either
        element leaving the flow: the box starts half a line below this block's
        top, the heading sits on that line, and the padding below the heading is
        what holds them apart.
      */}
      <div className="mt-[0.72em] w-full self-start rounded-[clamp(0.5rem,0.94vw,1.125rem)] border border-gold/55 px-[clamp(0.75rem,2.08vw,2.5rem)] pb-[clamp(1rem,1.46vw,1.75rem)] pt-[clamp(1.5rem,2.08vw,2.5rem)]">
        <ul className="grid w-full list-none grid-cols-1 gap-y-[clamp(1.5rem,2vw,2.4rem)] p-0 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column, index) => (
            <li
              key={column.label}
              className={cn(
                "flex flex-col items-center px-[clamp(0.75rem,1.3vw,1.5625rem)] text-center",
                /*
                  The separator belongs to every column that has one before it
                  *in its own row*, so which columns get it changes with the
                  column count: stacked, it is a top border on all but the
                  first; two across, the left-hand one of each pair starts a
                  row and takes none; four across, only the first is exempt.
                */
                index > 0 && "max-sm:border-t max-sm:border-gold/30 max-sm:pt-[clamp(1rem,1.3vw,1.5625rem)]",
                index > 0 && "sm:border-l sm:border-gold/30 sm:odd:border-l-0 lg:border-l lg:odd:border-l",
              )}
            >
              <Image
                src={column.icon.src}
                alt=""
                width={column.icon.width}
                height={column.icon.height}
                className="h-[clamp(2rem,3.3vw,3.96rem)] w-auto"
              />

              <p className="mt-[clamp(0.5rem,1.35vw,1.625rem)] font-serif text-card-label leading-none tracking-[0.01em] text-gold">
                {column.label}
              </p>

              {/* Her `DIVIDER 2`, drawn under every label rather than between columns. */}
              <Image
                src={cardReference.dividerGold.src}
                alt=""
                width={cardReference.dividerGold.width}
                height={cardReference.dividerGold.height}
                className="mt-[clamp(0.5rem,0.78vw,0.9375rem)] h-auto w-full max-w-[12.552vw] lg:max-w-60.25"
              />

              <p className="mt-[clamp(0.5rem,0.83vw,1rem)] font-light text-card-fine leading-[1.111] tracking-[0.01em] text-cream/62">
                {column.body}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/*
        The heading, laid over the border's top edge. `bg-card-ink` is what
        hides the stroke behind the words — load-bearing rather than
        decorative: without it the rule runs straight through the letters.
      */}
      <h2 className="justify-self-center self-start bg-card-ink px-[clamp(0.75rem,1.56vw,1.875rem)] text-center font-serif text-nav leading-none tracking-[0.01em] text-gold">
        When {cardName} Appears in a Reading
      </h2>
    </div>
  );
}
