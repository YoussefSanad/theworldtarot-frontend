import Image from "next/image";

import { PanelHeading } from "@/components/reading/PanelHeading";
import { OrnateFrame } from "@/components/ui/OrnateFrame";
import { readingPageChrome } from "@/content/reading-pages";
import { readingPageArtwork } from "@/lib/assets";

const { gate } = readingPageChrome;

/**
 * The picture the page turns on: a lit archway, under a heading the beetle
 * presides over.
 *
 * The beetle is the client's own silver drawing (`asset dump/readings page/
 * BUG.png`), not the gold one the Figma conversion exports — the same 74x83
 * mark, redrawn in the silver the rest of this panel's headings are set in.
 *
 * Figma draws the photograph and a 616x457 gold rectangle as two separate
 * layers, three pixels apart on every side. They are one thing — a framed
 * picture — so this is an `OrnateFrame` with the picture inside it, which
 * clips the artwork to the frame's own curve rather than leaving a baked
 * radius to drift out of register with it. Same rule as every photograph in a
 * panel on the readings index; see that folder's README.
 *
 * **The two braziers are lit.** The photograph itself never moves — the flames
 * are two small overlays laid exactly over the fires already in it, and the
 * light they throw on the surrounding stone is a wider, fainter layer under
 * each. All of it is CSS; the artwork is untouched. See `.gate-brazier` in
 * globals.css for where the two are anchored and how the flicker avoids
 * reading as a loop.
 */
export function BeyondTheGate() {
  return (
    /* 97px under the last line of Your Reading. */
    <section className="mt-[clamp(1.5rem,5.05vw,6.0625rem)] flex flex-col items-center text-center">
      <Image
        src={readingPageArtwork.bug.src}
        alt=""
        width={readingPageArtwork.bug.width}
        height={readingPageArtwork.bug.height}
        className="h-auto w-[10.79cqw] max-w-none"
      />

      <PanelHeading className="mt-[clamp(0.5rem,1.51vw,1.8125rem)] text-h3">{gate.heading}</PanelHeading>

      <p className="mt-[clamp(0.125rem,0.31vw,0.375rem)] text-nav leading-none tracking-[0.01em] font-light text-gold">
        {gate.subtitle}
      </p>

      {/* 616px of the 686px panel. */}
      <OrnateFrame variant="inset" className="mt-[clamp(0.75rem,1.93vw,2.3125rem)] w-[89.8cqw]">
        {/*
          The artwork's own 609x453, stated. The picture would set that box
          anyway, but the flames are anchored in percentages measured off the
          artwork — so the box they resolve against has to be the artwork's and
          not whatever the row happens to work out to.
        */}
        <span className="stack aspect-609/453">
          <Image
            src={gate.image.src}
            alt={gate.imageAlt}
            width={gate.image.width}
            height={gate.image.height}
            className="h-full w-full object-cover"
          />

          {/*
            The fires. Decoration over a photograph rather than layout, which
            is the one thing this codebase does position absolutely — the same
            licence `.page-atmosphere` and the value props' backdrop take.
          */}
          <span aria-hidden className="gate-braziers">
            <span className="gate-brazier gate-brazier--left" />
            <span className="gate-brazier gate-brazier--right" />
          </span>
        </span>
      </OrnateFrame>
    </section>
  );
}
