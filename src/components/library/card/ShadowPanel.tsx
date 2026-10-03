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
 * **Two panels, split at `sm`: her picture above it, a drawn ground below.**
 *
 * Above `sm` this is the composite it has always been — one pre-composited
 * 1216x227 webp per card, the figure and the plaque she stands on baked
 * together, drawn `object-fill` across the box. That is the client's artwork
 * and it is what ships on a desktop.
 *
 * Below `sm` the same picture is wrong, and the figure is the reason. The
 * composite is a fixed 5.357:1 and the box is not: the text sets the height, so
 * `object-fill` stretches the bitmap to meet it — about +17% at 1920, which
 * passes, and **+218% at 390px**, where she is three times too tall and plainly
 * smeared. So the phone gets `.card-shadow-ground` instead: the same colour and
 * radius expressed as CSS, which cannot distort, and **no figure at all**.
 *
 * Losing her on a phone is the deliberate half of that. She was already dropped
 * below `sm` in the original design — the text offset below re-centres at the
 * same breakpoint for the same reason — so this restores that behaviour rather
 * than inventing it. A 254px figure in a 345px panel has nowhere to stand.
 *
 * **The client's cut-out assets replace the desktop composite when they land.**
 * At that point the ground is CSS at every width and the figure is her own
 * layer over it, which is why the ground below is written to stand alone.
 */
export function ShadowPanel({ lines, art }: { lines: readonly string[]; art: ImageAsset }) {
  return (
    <div className="stack card-shadow-panel">
      {/*
        **The ground and the picture are the same cell, one per breakpoint.**
        `max-sm:` and `sm:` rather than two components, so the text column below
        is written once and both panels put it in the same place.

        Neither sets a width: the image brings its own 1216-in-1234 dimensions,
        and the phone ground fills the gutter the way every other block on a
        phone does. See `.card-shadow-panel` in globals.css.
      */}
      <div className="card-shadow-ground sm:hidden" />

      <Image
        src={art.src}
        alt=""
        width={art.width}
        height={art.height}
        className="hidden size-full object-fill sm:block"
        sizes="(width >= 64rem) 63.33vw, 100vw"
      />

      {/*
        **Centred text, but not on the panel — on the space the figure leaves.**
        Her rule runs x=490..1072 of a 1216 panel, where centring it would put it
        at 317..899, so the whole column sits about 14% right of centre. That is
        not a quirk of the rule: everything in the block shares the offset,
        because the figure owns the left fifth and the words are centred in what
        remains. The margin is the figure's own 20.89% plus the air beside her.

        **The offset and the figure switch at the same breakpoint**, which is the
        point of using `sm` for both. Above it the composite is drawn and these
        margins hold her space; below it the picture is replaced by a bare
        ground with no figure on it, and the reason for the offset goes with
        her, so the column re-centres on the panel. At phone width the left
        fifth is barely 60px — a column pushed off it would have nothing left to
        centre in.

        **Centred vertically, for the phone panel's sake.** On the image side
        this is a no-op: the picture stretches to the cell either way. On the
        CSS side the ground can be taller than the words — the floor holds her
        5.357 ratio when the copy is short — and `justify-center` is what puts
        them in the middle of it rather than at the top.

        **This column is also what sets the panel's height when the copy is
        long**, on both sides of the breakpoint. The children of the `.stack`
        share one grid cell and the taller one wins: the panel asks for her
        ratio, this column asks for however many lines its card actually wraps
        to, and on a narrow screen that is the larger of the two. The padding is
        then the air above and below the words rather than a centring device.
        See `.card-shadow-ground` in globals.css for the full account.
      */}
      <div className="flex flex-col items-center justify-center py-[clamp(calc(1rem*var(--card-scale)),calc(1.56vw*var(--card-scale)),calc(1.875rem*var(--card-scale)))] text-center max-sm:px-[clamp(calc(1rem*var(--card-scale)),calc(2vw*var(--card-scale)),calc(2.4rem*var(--card-scale)))] sm:ml-[29.2%] sm:mr-[0.8%]">
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
