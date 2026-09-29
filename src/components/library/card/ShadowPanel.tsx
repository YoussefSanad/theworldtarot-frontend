import Image from "next/image";

import type { ImageAsset } from "@/lib/assets";
import { cardReference } from "@/lib/assets";

/**
 * The shadow panel: the card's warnings, on near-black, with the figure
 * standing at the left edge.
 *
 * Like the reading panel, this sits **outside the page's inversion** — gold and
 * cream on black, the site's own colours rather than this page's ink.
 *
 * **The rule under "shadow" is champagne, not this page's green.** Her frame
 * tints it `rgba(188,171,130,0.93)`, the colour the rest of the site already
 * uses, because the panel is the site's palette rather than the parchment's.
 * Green here would be consistency with the wrong neighbour.
 *
 * **The panel and the figure are one image, and that is a change.** They were
 * two: an empty rounded panel (`Layer 17`) with the figure drawn over it,
 * positioned by arithmetic reverse-engineered from the 11px of transparent glow
 * around her export. That fitted The Fool and nothing else — the client's
 * twenty-one packets each carry their own figure with its own padding — so
 * every card now ships pre-composited and this draws one picture.
 *
 * **The figure no longer drops out below `sm`.** She used to, because a 254px
 * figure in a 1216px panel would have sat under the words at phone width. She
 * is part of the artwork now, so the panel scales as a whole and the text keeps
 * its offset at every size.
 */
export function ShadowPanel({ lines, art }: { lines: readonly string[]; art: ImageAsset }) {
  return (
    <div className="stack">
      <Image
        src={art.src}
        alt=""
        width={art.width}
        height={art.height}
        className="size-full object-fill"
        sizes="(width >= 64rem) 63.33vw, 100vw"
      />


      {/*
        **Centred text, but not on the panel — on the space the figure leaves.**
        Her rule runs x=490..1072 of a 1216 panel, where centring it would put it
        at 317..899, so the whole column sits about 14% right of centre. That is
        not a quirk of the rule: everything in the block shares the offset,
        because the figure owns the left fifth and the words are centred in what
        remains. The margin is the figure's own 20.89% plus the air beside her.

        Below `sm` she drops out, and with her the reason for the offset, so the
        column re-centres on the panel.
      */}
      <div className="flex flex-col items-center py-[clamp(calc(1rem*var(--card-scale)),calc(1.56vw*var(--card-scale)),calc(1.875rem*var(--card-scale)))] text-center max-sm:px-[clamp(calc(1rem*var(--card-scale)),calc(2vw*var(--card-scale)),calc(2.4rem*var(--card-scale)))] sm:ml-[29.2%] sm:mr-[0.8%]">
        <h2 className="font-serif text-h3 leading-none tracking-[0.01em] text-gold">shadow</h2>

        {/*
          Her `DIVIDER 1 copy` — the same rule as the page's green one, tinted
          champagne rgb(190,174,136). The gold `DIVIDER 2` belongs under the
          reading panel's column labels and is a different, shorter artwork.

          **It is a share of the text column, not the column's full width.** Her
          rule runs x=490..1072 in a 1216 panel — 582px, which is the asset's own
          size — against a text column that starts at 29.2% and runs to the
          panel's right edge, so the rule covers roughly two thirds of that
          column rather than filling it. `w-full` made it span the whole column, which
          reads as a much heavier line the narrower the screen gets.

          Her own number is 68.4%: the column runs 29.2%..99.2% of the panel, so
          851.2px of 1216, and a 68.37% rule centred in it spans x=489.7..1071.7
          — her 490..1072 to within a third of a pixel. **61% is deliberately
          shorter than she drew it**, a client call rather than a conversion, and
          the caps come down with it (519px, 27.04vw) so the rule never draws
          wider than the share it is given. Change the percentage and change both
          caps, or the rule stops scaling with the column.
        */}
        <Image
          src={cardReference.dividerChampagne.src}
          alt=""
          width={cardReference.dividerChampagne.width}
          height={cardReference.dividerChampagne.height}
          className="mt-[clamp(calc(0.5rem*var(--card-scale)),calc(0.83vw*var(--card-scale)),calc(1rem*var(--card-scale)))] h-auto w-[61%] max-w-[27.04vw] lg:max-w-130"
        />

        <div className="mt-[clamp(calc(0.75rem*var(--card-scale)),calc(1.04vw*var(--card-scale)),calc(1.25rem*var(--card-scale)))] flex flex-col">
          {lines.map((line) => (
            <p key={line} className="font-light text-card-body tracking-wide text-cream">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
