import Image from "next/image";
import { Fragment } from "react";

import { cardReference } from "@/lib/assets";

/** The bullet her copy separates phrases with; see `LookFor`. */
const PHRASE_SEPARATOR = " • ";

/**
 * "LOOK FOR:" on her 1203px rule, over the Magically prose beneath it.
 *
 * **The rule runs through the words, not above and below them.** Her layer is
 * named "DIVIDER AROUND 'LOOK FOR'" and that is literal: one rule crosses the
 * full width with the label sitting in a gap in its middle, small dots finishing
 * each end. The first build drew two 582px rules instead, which is a different
 * shape entirely.
 *
 * So the rule and the label share a `.stack` cell and the label carries the
 * page's own ground colour as horizontal padding, masking the line behind it.
 * That keeps the gap the width of the words at every viewport, where a fixed
 * gap would show line through short words and clip long ones — and it is why
 * the label is `bg-card-parchment` rather than transparent.
 *
 * **The label and the phrases are one block, not a heading and a list.** Her
 * frame sets them as a single centred text node, and the phrases are a sentence
 * broken by bullets rather than items: a `<ul>` would have a screen reader
 * announce "list, six items" for what reads aloud as one line.
 */
export function LookFor({ lines }: { lines: readonly string[] }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="stack w-full items-center">
        <Image
          src={cardReference.dividerLookFor.src}
          alt=""
          width={cardReference.dividerLookFor.width}
          height={cardReference.dividerLookFor.height}
          className="h-auto w-full self-center justify-self-stretch"
          sizes="(width >= 64rem) 62.66vw, 100vw"
        />

        <p className="justify-self-center bg-card-parchment px-[clamp(0.75rem,1.04vw,1.25rem)] font-serif text-card-lead leading-none tracking-[0.01em] text-card-forest">
          LOOK FOR:
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

        `PHRASE_SEPARATOR` is the same bullet the content uses; a line with no
        bullet simply yields one span and behaves as before.
      */}
      <div className="mt-[clamp(0.5rem,0.83vw,1rem)] flex flex-col">
        {lines.map((line) => (
          <p key={line} className="text-pretty font-display text-card-lead leading-[1.444] tracking-[0.01em] text-card-forest">
            {line.split(PHRASE_SEPARATOR).map((phrase, index) => (
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
