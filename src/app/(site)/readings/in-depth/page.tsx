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
import { inDepth, readingPageChrome } from "@/content/reading-pages";
import { siteName } from "@/content/site";

export const metadata: Metadata = {
  title: `In-Depth Reading — ${siteName}`,
  description:
    "One question, twelve cards, a deeper story revealed. A written reading of the patterns shaping your story, delivered by email within 48 hours.",
};

export default function InDepthReadingPage() {
  /*
    The backdrop is scoped to the page's own content, as it is on the readings
    index and for the same reason — the client's frames draw no site footer and
    ours is opaque, so a room anchored to the layout column would spend its
    height behind the footer and never be seen. See the note in
    `../page.tsx`; `isolate` keeps its `-z-10` inside this box.

    The mobile offset is the index's, and for the index's reason. Above `lg`
    this page does open on flat colour — the observatory stands on the floor and
    nothing reaches the top — but below it `.page-atmosphere-reading::before`
    hangs the same night sky the index hangs, from this box's top edge. That
    edge is `main`'s, which is the masthead's bottom, and the masthead is
    transparent: left flush, the sky starts in a hard line under a strip of flat
    colour, and the header reads as a solid block sitting on the page. 5rem
    lifts the start of the picture above the header, the same clearance and the
    same number as `../page.tsx` — it is tuned to the masthead's height, so it
    moves when `SiteHeader`'s padding does.
  */
  return (
    <div className="relative isolate">
      <PageAtmosphere variant="reading" className="max-lg:-top-20" />

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
              <ReadingHero reading={inDepth} />
              <ReadingOrder reading={inDepth} />
            </ReadingPanel>

            {/*
              Right: what arrives, where it leads, and somebody who bought it.
              The wash is Figma's `right-panel-bg` — a flat `#0a1421` at 51%,
              which is `--color-ink`, so it ships as a colour rather than a
              682x1987 export. Both panels are filled, and neither the same
              way: the left one holds weather, this one settles the room
              behind the half of the page that explains.
            */}
            <ReadingPanel
              /*
                The two panels do not start at the same height: Figma sets this
                one's top border 28px below the other's, so the right column
                reads a beat after the left rather than alongside it. It is the
                panel that drops, not its contents — the border moves with it —
                so it is a margin on the grid item and not more body padding.
                Below `lg` there is no second column to be out of step with, so
                the offset is desktop-only.
              */
              className="lg:mt-[min(1.458vw,1.75rem)]"
              bodyClassName="bg-ink/50 px-[4.37cqw] pt-[17.93cqw] pb-[5.69cqw]"
            >
              <WhatYouGet reading={inDepth} />
              <BeyondTheGate />
              <ReadingTestimonial reading={inDepth} />
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
        saying={inDepth.closing}
        action={{ label: readingPageChrome.closingAction, href: `#${readingPageChrome.checkout.anchor}` }}
        tone="champagne"
        width="reading"
      />
    </div>
  );
}
