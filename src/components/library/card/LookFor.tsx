import Image from "next/image";
import { Fragment } from "react";

import { lookForGap } from "@/components/library/card/look-for-gap";
import { cardReference } from "@/lib/assets";

/**
 * The separators her copy breaks phrases on; see `LookFor`.
 *
 * **Two of them, because she uses two**: `•` through the card pages' LOOK FOR
 * lines and `·` through the suit pages' KEY THEMES. `SEPARATOR_PATTERN` is what
 * splits, `PHRASE_SEPARATOR` is what is drawn back between the pieces — so both
 * kinds of line render in the one hand her card frames set.
 */
const PHRASE_SEPARATOR = " • ";
const SEPARATOR_PATTERN = /\s*[•·]\s*/;

/**
 * "LOOK FOR:" on her 1203px rule, over the Magically prose beneath it.
 *
 * **The rule runs through the words, not above and below them.** Her layer is
 * named "DIVIDER AROUND 'LOOK FOR'" and that is literal: one rule crosses the
 * full width with the label sitting in a gap in its middle, small dots finishing
 * each end. The first build drew two 582px rules instead, which is a different
 * shape entirely.
 *
 * So the rule and the label share a `.stack` cell, and the label sits in the
 * gap **her asset already carries**: measured on `divider-look-for.webp`, the
 * 1203x8 rule is drawn with a 229px transparent span at x=490..718 — 19% of its
 * width, centred at 50.2% — with small dots finishing each end.
 *
 * **So the label is transparent from `lg` up, and keeps its mask below.** It
 * painted `bg-card-parchment` at every width on the belief that the rule ran
 * unbroken behind it; above `lg` that was covering a gap rather than making one,
 * and once the section gained its own translucent ground it read as a
 * parchment-coloured block sitting on the wash.
 *
 * Something still has to hold the words clear of the line at narrow widths,
 * because **her gap is proportional and the type is not**. The gap is a fixed
 * 19% of the rule, which narrows with the viewport, while `--text-card-lead`
 * bottoms out at its 22px floor — and `--card-scale` is only declared above
 * `lg`, so the label stops shrinking while the gap keeps closing. On a phone the
 * words are wider than the space drawn for them and would sit on the rule.
 *
 * **So the rule is cut rather than the label painted.** A block of colour behind
 * the words only looks right where it matches what is behind it, and what is
 * behind it here is a watercolour vignette under a translucent wash — nothing a
 * flat swatch can match, which is why the parchment patch read as a smear.
 * `.look-for__rule` masks the image instead: a transparent band through its
 * middle, sized in `ch` off the label's own font so it tracks the words at every
 * width. The line really is interrupted, there is no patch to notice, and the
 * mechanism is the same one her own asset uses — it simply follows the type.
 *
 * **The label and the phrases are one block, not a heading and a list.** Her
 * frame sets them as a single centred text node, and the phrases are a sentence
 * broken by bullets rather than items: a `<ul>` would have a screen reader
 * announce "list, six items" for what reads aloud as one line.
 */
export function LookFor({ lines, label = "LOOK FOR:" }: { lines: readonly string[]; label?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="stack w-full items-center">
        {/*
          **The cut in the rule follows the label**, rather than being the fixed
          12ch the CSS declares. The suit pages put "KEY THEMES" in this rule,
          which is longer than "LOOK FOR:" and would sit on the line at the
          default. See `lookForGap`, and `.look-for__rule` in globals.css for
          how the band is masked.
        */}
        <Image
          src={cardReference.dividerLookFor.src}
          alt=""
          width={cardReference.dividerLookFor.width}
          height={cardReference.dividerLookFor.height}
          className="look-for__rule h-auto w-full self-center justify-self-stretch"
          sizes="(width >= 64rem) 62.66vw, 100vw"
          style={{ "--look-for-gap": lookForGap(label) } as React.CSSProperties}
        />

        <p className="justify-self-center px-[clamp(calc(0.75rem*var(--card-scale)),calc(1.04vw*var(--card-scale)),calc(1.25rem*var(--card-scale)))] font-serif text-card-lead leading-none tracking-[0.01em] text-card-forest">
          {label}
        </p>
      </div>

      {/*
        **Each phrase is its own inline span, so a wrap lands on a bullet.**

        The client's note is that these break in unnatural places. They are one
        centred text node in her frame and stay one paragraph here — see the
        docblock above on why this is not a list — but a plain string wraps
        wherever the measure runs out, which on a narrow screen is usually
        inside "unexpected beginnings" rather than between phrases.

        Splitting on the bullet and marking each phrase `whitespace-nowrap`
        moves every break onto a separator. The bullets stay in the flow as
        their own spans rather than being re-inserted by CSS, so the line still
        reads and copies as she wrote it, and a screen reader still hears one
        continuous phrase rather than a list.

        `SEPARATOR_PATTERN` matches both separators her copy uses; a line with
        neither simply yields one span and behaves as before.
      */}
      <div className="mt-[clamp(calc(0.5rem*var(--card-scale)),calc(0.83vw*var(--card-scale)),calc(1rem*var(--card-scale)))] flex flex-col">
        {lines.map((line) => (
          <p key={line} className="text-pretty font-display text-card-lead leading-[1.444] tracking-[0.01em] text-card-forest">
            {line.split(SEPARATOR_PATTERN).map((phrase, index) => (
              <Fragment key={phrase}>
                {index > 0 ? <span> {PHRASE_SEPARATOR.trim()} </span> : null}
                <span className="whitespace-nowrap">{phrase.trim()}</span>
              </Fragment>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
