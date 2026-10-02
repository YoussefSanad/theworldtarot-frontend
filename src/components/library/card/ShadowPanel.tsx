import Image from "next/image";

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
 * **The ground is CSS and the figure is gone for now.** It has been an image
 * twice: first an empty rounded panel (`Layer 17`) with the figure positioned
 * over it by arithmetic reverse-engineered from the 11px of transparent glow
 * around her export — which fitted The Fool and nothing else — and then one
 * pre-composited 1216x227 picture per card, panel and figure baked together.
 *
 * The panel half of those twenty-two pictures was the same flat rounded
 * rectangle every time, so it is `.card-shadow-ground` now: a colour, a radius
 * and an aspect ratio, which scale cleanly where a bitmap was being stretched.
 * **The silhouette is a separate image in a later step, once the client's
 * cut-out assets are ready** — the text offset below is kept exactly as it was
 * so she has her space to come back to, and the panel is the layer she will be
 * laid over rather than composited into.
 *
 * Until then the panel's left fifth is deliberately empty. That is the
 * interim state, not the design.
 *
 * **`.card-shadow-panel` is the width, and it is on the stack for a reason.**
 * Her panel is 1216 inside a 1234 container — an inset the old image got for
 * free from its own dimensions and a `<div>` does not — and the text column's
 * offsets below are percentages of the panel rather than of the container, so
 * the ground and the words have to measure against the same box. See
 * `.card-shadow-ground` in globals.css.
 */
export function ShadowPanel({ lines }: { lines: readonly string[] }) {
  return (
    <div className="stack card-shadow-panel">
      <div className="card-shadow-ground" />

      {/*
        **Centred text, but not on the panel — on the space the figure leaves.**
        Her rule runs x=490..1072 of a 1216 panel, where centring it would put it
        at 317..899, so the whole column sits about 14% right of centre. That is
        not a quirk of the rule: everything in the block shares the offset,
        because the figure owns the left fifth and the words are centred in what
        remains. The margin is the figure's own 20.89% plus the air beside her.

        **The offset stays while the figure is away.** She is coming back as her
        own image over this ground, so the gap she leaves is held rather than
        reclaimed — closing it now would mean reopening it, and the client reads
        these pages between steps.

        Below `sm` the offset is dropped: at phone width the left fifth is barely
        60px and a column pushed off it has nothing left to centre in, so the
        words take the whole panel. That was true when she was drawn here too.

        **Centred vertically, which the image used to do.** The words no longer
        sit in a cell sized by a picture, so `justify-center` holds them in the
        middle of the panel on the cards whose copy is shorter than her
        1216/227 — which is most of them at desktop width.

        **This column is also what sets the panel's height when the copy is
        long.** The two children of the `.stack` share one grid cell and the
        taller one wins: the ground asks for her ratio as a minimum, this column
        asks for however many lines its card actually wraps to, and on a narrow
        screen that is the larger of the two. The padding is then the air above
        and below the words rather than a centring device. See
        `.card-shadow-ground` in globals.css for the full account.
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
