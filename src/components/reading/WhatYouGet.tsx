import Image from "next/image";
import { Fragment } from "react";

import { PanelHeading } from "@/components/reading/PanelHeading";
import { HouseName } from "@/components/ui/HouseName";
import { readingPageChrome, type ReadingPage } from "@/content/reading-pages";
import { readingPageArtwork } from "@/lib/assets";
import { cn } from "@/lib/cn";

/**
 * What arrives, in five lines each opened by a gold medallion.
 *
 * A list, not five paragraphs — this is the one piece of copy on the page a
 * visitor reads as a set of things rather than as prose, and the client draws
 * it with a mark against every line.
 *
 * The medallion is 43px against 30px type, so it stands taller than the line
 * it opens and cannot simply sit on the baseline. It hangs from the top of the
 * copy and is offset onto it: half a line down, then back up by half its own
 * height, both in `em` off the type — the measurement `WhatsIncluded` makes
 * for the homepage's much smaller bullet star.
 *
 * **A line that runs to two gets an eighth of a line more.** Three of the five
 * do. Centred on the first line, as Figma centres all five, a mark against two
 * lines of copy reads as riding high; centred on the whole block — which is
 * what `align-items: center` gives for free, and it was tried — it drops half
 * a line and reads as sitting low, and so does a quarter. An eighth is the one
 * number here that is neither Figma's nor arithmetic: it was settled by eye
 * against the rendered page, so move it by eye too.
 *
 * The line count comes from the copy's own shape: `included` is a list of the
 * places a line may break, chosen by the client, so a single phrase is a
 * one-line entry and anything longer sets two at the width she drew the panel.
 * One entry carries a third phrase it does not need there — see the note
 * against it in `reading-pages.ts` — because a phone's measure is narrower than
 * anything she drew, and a phrase that cannot fit wraps inside itself.
 */
export function WhatYouGet({ reading }: { reading: ReadingPage }) {
  return (
    <section>
      <PanelHeading className="text-h3">{readingPageChrome.included.heading}</PanelHeading>

      {/* 27px between lines at the 30px she sets them; 18px from mark to words. */}
      <ul className="mt-[clamp(1rem,3.23vw,3.875rem)] flex flex-col gap-[0.9em] px-[4.5cqw] text-nav leading-[1.07] tracking-[0.01em] font-light text-gold">
        {reading.included.map((item) => (
          <li key={item.join(" ")} className="flex items-start gap-[0.6em]">
            <Image
              src={readingPageArtwork.bullet.src}
              alt=""
              width={readingPageArtwork.bullet.width}
              height={readingPageArtwork.bullet.height}
              className={cn(
                "h-[1.433em] w-auto max-w-none shrink-0",
                /*
                  Line height is 1.0667em and the mark is 1.433em, so half its
                  own height is 0.7165em. One line: 0.5 × 1.0667 − 0.7165.
                  Two: 0.625 × 1.0667 − 0.7165.
                */
                item.length > 1 ? "mt-[-0.05em]" : "mt-[-0.183em]",
              )}
            />
            {/*
              `<Phrase>`'s own construction — inline-blocks joined by ordinary
              spaces, so a line rides one row where there is room and breaks
              *between* the client's phrases where there isn't — written out
              here rather than used, because these lines carry the house name
              and `<HouseName>` has to run inside each phrase rather than
              around the join. If the name ever leaves this copy this collapses
              back to `<Phrase parts={item} />`.
            */}
            <span>
              {item.map((part, index) => (
                <Fragment key={part}>
                  {index > 0 ? " " : null}
                  <span className="inline-block">
                    <HouseName>{part}</HouseName>
                  </span>
                </Fragment>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
