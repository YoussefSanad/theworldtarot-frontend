import Image from "next/image";

import { MetaStripCarousel } from "@/components/library/card/MetaStripCarousel";
import { CarouselSlide } from "@/components/ui/Carousel";
import type { CardMeta } from "@/content/card-content";
import { cardReference } from "@/lib/assets";

/**
 * The pale strip along the bottom: element, planet, sign, keyword, yes/no.
 *
 * **Five uniform cells**, each a label over a symbol over a value. The first
 * build special-cased yes/no as label-and-value with an empty middle, reading
 * the Figma frame as drawing no glyph there; her PSD has one (`symbol 5`, the
 * compass) and the row is regular all the way across. There is no special case
 * here for the same reason there is none in her artwork.
 *
 * **A description list, not a table.** One term and one definition, five times
 * — `<dl>` says that in the markup while the grid says it in the layout. A
 * table would claim a second axis that does not exist.
 *
 * **The symbols share a width, not a height**, and the glyphs are why: her five
 * range from 0.63 to 2.96 in aspect (the key is 80x27, the compass 87x87). Sized
 * to a common height the key grows to nearly three times its neighbours' width
 * and the compass shrinks to match the narrowest; sized to a common *width* each
 * keeps its own proportions inside one box, and the row reads as a row. The box
 * is a fixed height too, so the labels above and the values below stay on their
 * own baselines whatever glyph sits between them.
 *
 * Below `lg` the five columns wrap to three, and below `sm` the row stops
 * wrapping altogether and drifts instead — see `MetaStripCarousel` for why five
 * cells have no good grid at a phone's width. The `<dl>` is the carousel's
 * track, so the markup stays one description list at every width and only its
 * layout changes.
 */
export function MetaStrip({ meta }: { meta: CardMeta }) {
  const entries = [
    { label: "ELEMENT", entry: meta.element },
    { label: "PLANET", entry: meta.planet },
    { label: "ASTROLOGICAL SIGN", entry: meta.sign },
    { label: "KEYWORD", entry: meta.keyword },
    { label: "YES/NO", entry: meta.yesNo },
  ];

  return (
    <div className="stack">
      <Image
        src={cardReference.metaStripBg.src}
        alt=""
        width={cardReference.metaStripBg.width}
        height={cardReference.metaStripBg.height}
        className="size-full object-fill"
        sizes="(width >= 64rem) 62.76vw, 100vw"
      />

      {/*
        Centred on the *panel*, which is not the same as centred on the asset.

        Her `BACKGROUND TO ELEMENTS` is 1233x247 with the pale panel occupying
        rows 5..223 — 5px of transparency above it and 23px below. So the drawn
        panel's centre sits 9px above the image's, and a row centred on the box
        rides high by that much. The extra bottom padding is that 18px
        difference, expressed in `cqw` so it holds at any rendered width.

        **`cqw`, not a percentage**: padding percentages resolve against the
        *inline* size on every side, so `1.46%` here would be a share of the
        1233px width — about 18px at full size but wrong everywhere else, and
        wrong by a factor of five at the widths this block actually renders.
        18/1233 of the width is `1.46cqw`, which is the same 18px and stays
        correct as the strip scales. `src/components/library/README.md` records
        the same trap on the deck's plaques.

        `place-self-center` rather than `items-end` on the cells: the artwork
        sets this block's height and the row belongs in the middle of it, not
        hanging from its floor.
      */}
      <div className="@container w-full place-self-center px-[clamp(1rem,2.03vw,2.4375rem)] pb-[calc(clamp(1rem,1.56vw,1.875rem)+1.46cqw)] pt-[clamp(1rem,1.56vw,1.875rem)]">
        <MetaStripCarousel>
          {entries.map(({ label, entry }) => (
            // The cell stays a real box at every width: below `sm` it is the
            // flex item the drifting row carries, and `min-w` keeps five of
            // them reading as a strip rather than one filling the screen; from
            // `sm` up it is one of the grid's five columns.
            //
            // **Not `sm:contents`.** That dissolves the cell and hands its
            // three children to the grid individually, so with five columns the
            // label, symbol and value of each entry scatter across rows instead
            // of stacking — the row looked shuffled rather than laid out.
            <CarouselSlide key={label} className="flex flex-col items-center text-center max-sm:min-w-30">
              {/*
                `whitespace-nowrap` because "ASTROLOGICAL SIGN" is two words and
                her frame sets it on one line; left to wrap it breaks that cell
                onto a second row and pushes its symbol out of line with the
                other four.

                **It is also the one label wider than its own column**, and
                that is what decides the type size here: sized at her flat 22px
                it overran the cell at every width below 1920 and pushed the row
                into its neighbours.

                So it is `cqw` against the strip rather than `vw` against the
                viewport — the labels shrink with the box that has to hold them,
                which is what lets all five columns survive a tablet rather than
                wrapping to three. 1.65 is the ratio at which the longest of the
                five lands inside its own track.

                **No `min()` ceiling on it**, unlike most type on this page: a
                pixel cap stops the label shrinking while its column carries on,
                so the two part company and the overrun comes back at exactly
                the widths the ratio was chosen to fix. The strip is capped at
                1234px by its own measure, which is what bounds this in the end.
              */}
              <dt className="whitespace-nowrap font-serif text-card-label sm:text-[1.65cqw] leading-none tracking-[0.01em] text-card-ink">
                {label}
              </dt>

              <div className="my-[clamp(0.5rem,0.83vw,1rem)] flex h-[clamp(1.75rem,3.44vw,4.125rem)] w-[clamp(2.75rem,4.53vw,5.4375rem)] items-center justify-center">
                <Image
                  src={entry.symbol.src}
                  alt=""
                  width={entry.symbol.width}
                  height={entry.symbol.height}
                  className="max-h-full w-auto max-w-full object-contain"
                />
              </div>

              {/* Sized with the label above it, so the pair stays one scale. */}
              <dd className="m-0 whitespace-nowrap font-serif text-card-label sm:text-[1.65cqw] leading-none tracking-[0.01em] text-card-ink">
                {entry.value}
              </dd>
            </CarouselSlide>
          ))}
        </MetaStripCarousel>
      </div>
    </div>
  );
}
