import type { Metadata } from "next";

import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { Container, Section } from "@/components/layout/Section";
import { BeyondTheGate } from "@/components/reading/BeyondTheGate";
import { ReadingFeatures } from "@/components/reading/ReadingFeatures";
import { ReadingHero } from "@/components/reading/ReadingHero";
import { ReadingOrder } from "@/components/reading/ReadingOrder";
import { ReadingPanel } from "@/components/reading/ReadingPanel";
import { ReadingTestimonial } from "@/components/reading/ReadingTestimonial";
import { WhatYouGet } from "@/components/reading/WhatYouGet";
import { ClosingSaying } from "@/components/readings/ClosingSaying";
import { monthAhead, readingPageChrome } from "@/content/reading-pages";
import { siteName } from "@/content/site";

export const metadata: Metadata = {
  title: `Month Ahead Reading — ${siteName}`,
  description:
    "One month, five cards, a clear path ahead. A written reading of the weeks to come, thoughtfully interpreted and delivered by email within 24 hours.",
};

export default function MonthAheadReadingPage() {
  /*
    The backdrop is scoped to the page's own content, as it is on the readings
    index and for the same reason — the client's frames draw no site footer and
    ours is opaque, so a room anchored to the layout column would spend its
    height behind the footer and never be seen. See the note in
    `../page.tsx`; `isolate` keeps its `-z-10` inside this box.

    No mobile offset here, unlike the index. That page hangs a night sky from
    the top of this box and needs to clear a transparent masthead; this one
    stands its room on the floor and opens on flat colour, so there is no edge
    at the top to hide.
  */
  return (
    <div className="relative isolate">
      <PageAtmosphere variant="reading" />

      {/*
        Figma sets the pair 144px under a frame that draws no masthead; ours
        renders one, so this is only the air between the two. 79px of floor
        under the panels before the props.
      */}
      <Section padding="none" className="pt-[clamp(1rem,2.6vw,3.125rem)]">
        <Container width="reading">
          {/*
            687 + 58 + 686. `items-start` because the two panels are different
            heights and the client draws them that way — the left one runs 54px
            longer. Below `lg` they stack in source order, which is the order
            the desktop frame reads in too.
          */}
          <div className="grid gap-y-[clamp(2rem,4.17vw,5rem)] lg:grid-cols-2 lg:items-start lg:gap-x-[min(3.021vw,3.625rem)]">
            {/*
              Left: the reading, then the order — the question or, in gift
              mode, the recipient, and the payment under it. That is the one
              stateful thing on the page; see `ReadingOrder`.

              Top padding is 78px of the 687px panel, which also clears the
              half of the moon hanging below the border. See `ReadingPanel`.

              The sky is this panel's fill, the way the wash is the other
              one's — Figma draws it behind the page, cut to this panel's box.
              See `.reading-panel-sky`.
            */}
            <ReadingPanel moon bodyClassName="reading-panel-sky px-[4.44cqw] pt-[11.35cqw] pb-[8.59cqw]">
              <ReadingHero reading={monthAhead} />
              <ReadingOrder reading={monthAhead} />
            </ReadingPanel>

            {/*
              Right: what arrives, where it leads, and somebody who bought it.
              The wash is Figma's `right-panel-bg` — a flat `#0a1421` at 51%,
              which is `--color-ink`, so it ships as a colour rather than a
              682x1987 export. Both panels are filled, and neither the same
              way: the left one holds weather, this one settles the room
              behind the half of the page that explains.
            */}
            <ReadingPanel bodyClassName="bg-ink/50 px-[4.37cqw] pt-[17.93cqw] pb-[5.69cqw]">
              <WhatYouGet reading={monthAhead} />
              <BeyondTheGate />
              <ReadingTestimonial reading={monthAhead} />
            </ReadingPanel>
          </div>
        </Container>
      </Section>

      <ReadingFeatures />

      {/*
        The frame draws this button and gives it nowhere to go. On a page that
        sells one reading it belongs at that reading's checkout, and that
        checkout is on this page — so it returns to the panel rather than
        leaving for one. The pages that sell nothing in particular send the
        same button to the readings index instead; see `content/site.ts` and
        `closingCta` in `content/home.ts`.
      */}
      <ClosingSaying
        saying={monthAhead.closing}
        action={{ label: readingPageChrome.closingAction, href: `#${readingPageChrome.checkout.anchor}` }}
        tone="champagne"
        width="reading"
      />
    </div>
  );
}
