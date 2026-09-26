import Image from "next/image";

import { cardReference } from "@/lib/assets";

/**
 * The shadow panel: the card's warnings, on near-black, with the silhouette
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
 * **The figure is her own element, not part of the panel.** `Layer 17` is the
 * empty rounded panel — checked, there is no one on it — so she is drawn over
 * it as a separate layer, standing at the left end with the text centred in
 * what is left.
 *
 * **She drops out below `sm`.** Her frame gives her 254px of a 1216px panel to
 * stand in, and at phone width she would sit under the words rather than beside
 * them. An addition, recorded in this folder's README with the rest.
 */
export function ShadowPanel({ lines }: { lines: readonly string[] }) {
  return (
    // `relative` because the figure below is absolutely positioned against this
    // box and `.stack` sets no `position` of its own — the omission that once
    // rendered every plaque in the Library grid empty, recorded in
    // `src/components/library/README.md`.
    <div className="stack relative">
      <Image
        src={cardReference.shadowGround.src}
        alt=""
        width={cardReference.shadowGround.width}
        height={cardReference.shadowGround.height}
        className="size-full object-fill"
        sizes="(width >= 64rem) 63.33vw, 100vw"
      />

      {/*
        **The layer is not the artwork, and that is the whole difficulty here.**

        Her frame places the figure at 254x214, panel-relative (5, 13), in a
        1216x229 panel. But her export is 269x239 with **11px of transparent
        glow on every side**, so the drawn rock inside it measures 246x218.
        Sizing the layer to her node box therefore renders the rock about 6%
        small and holds it clear of both edges — which is exactly the "too
        contained" look the first attempts had.

        So the layer is scaled until its *artwork* measures her 254 wide
        (x1.0325) and then offset so that artwork lands at (5, 13). The layer
        itself consequently runs 22.84% x 107.76% of the panel, starting a hair
        left of it and ending 8.48% below — she breaks both edges, as the
        drawing shows, and the glow is what covers the difference.

        `absolute` rather than a stack cell, because the box now extends past
        the panel on two sides and a grid cell would stretch the row to fit it.
        This is the exception `src/app/README.md` allows: positioning a picture
        over a box, not laying out the page.
      */}
      <Image
        src={cardReference.shadowSilhouette.src}
        alt=""
        width={cardReference.shadowSilhouette.width}
        height={cardReference.shadowSilhouette.height}
        className="pointer-events-none absolute bottom-[-8.48%] left-[-0.52%] hidden h-[107.76%] w-[22.84%] max-w-none object-contain sm:block"
        sizes="(width >= 64rem) 14.47vw, 23vw"
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
