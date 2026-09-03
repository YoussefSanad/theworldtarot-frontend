import type { ReactNode } from "react";

import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { Container, Section } from "@/components/layout/Section";
import { BeyondTheGate } from "@/components/reading/BeyondTheGate";
import { ReadingFeatures } from "@/components/reading/ReadingFeatures";
import { ReadingHero } from "@/components/reading/ReadingHero";
import { ReadingPanel } from "@/components/reading/ReadingPanel";
import { ReadingTestimonial } from "@/components/reading/ReadingTestimonial";
import { WhatYouGet } from "@/components/reading/WhatYouGet";
import { ClosingSaying } from "@/components/readings/ClosingSaying";
import { readingPageChrome, type ReadingPage } from "@/content/reading-pages";

/**
 * A reading page with a hole where the commerce goes: what the reading **is**,
 * and nothing about what it costs.
 *
 * The three routes under `app/(site)/readings/` are this composition with
 * `ReadingOrder` in the hole, and they differ from each other in a `ReadingPage`
 * and a `<title>` — which is what the README has claimed since the second page
 * landed, and what a hundred lines copied three times had stopped being.
 *
 * The second caller is `/redeem/`, which puts `RedeemPanel` in the slot — the
 * code's state and the question, in commerce's place, collecting no money. See
 * `components/redeem/RedeemGift.tsx`.
 *
 * **The seam is here rather than at `/redeem/` because of when.** Frontend
 * `docs/adr/0003-redemption-is-a-page-of-its-own.md` gives redemption a page of
 * its own and makes it "a reading page with the commerce taken out": the name,
 * the artwork, what arrives, and none of the price, wallet row, checkout button
 * or `Gift a Reading`. A page that renders the whole composition and hides half
 * of it in one mode is two pages sharing a file, and `ReadingOrder`'s state
 * would grow a third axis on top of `gifting` and `offer`.
 *
 * ## What the slot is, and what it is not
 *
 * **`commerce` is a slot, not a flag.** The caller passes what it is selling
 * and this file never asks which page it is on — no `variant`, no `redeeming`,
 * nothing here to keep in step with a second caller. It is not called `order`
 * because an order is a thing with a price in `CONTEXT.md`, and what
 * `/redeem/` will pass is the code's state and the question: commerce's place
 * on the page, holding something that collects no money.
 *
 * **Empty is a supported state**, and the one F1's gate asked for: the
 * presentation half alone, both panels, the gate, the props and the closing
 * line, with nothing that sells. Absent, `null` and `false` all mean empty,
 * because the natural way to fill this slot is a condition, and a slot that
 * treated `false` as full would put the closing button back on a page with
 * nothing to scroll to.
 *
 * **No route renders it empty today.** `/presentation-probe/` did, and went at
 * #79 once `/redeem/` had mounted this composition for real. The state stays
 * supported rather than being tightened to a required prop: what fills the slot
 * on `/redeem/` is decided by a lookup, and a caller that has not resolved a
 * code yet is exactly the condition this was taught for.
 *
 * **What is not in the slot is deliberate.** `BeyondTheGate` and
 * `ReadingFeatures` sell nothing — an archway, three props and a promise about
 * delivery — and `ReadingTestimonial` is somebody's sentence about the reading
 * rather than an offer of one. They are presentation, so they stay above the
 * seam and `/redeem/` inherits them.
 *
 * The metadata stays on the route. A `<title>` is the route's own answer and
 * Next reads it from the page module, so it is the one thing here that could
 * not have moved.
 */
export function ReadingPresentation({ reading, commerce }: { reading: ReadingPage; commerce?: ReactNode }) {
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
              Left: the reading, and then whatever this page does with it.
              Where it sells one, the slot is `ReadingOrder` — the question
              or, in gift mode, the recipient, with the payment under it, and
              the one piece of state on that page. On `/redeem/` it is the
              code's state and the question, and nothing here changes; see
              `docs/adr/0003-redemption-is-a-page-of-its-own.md`.

              Top padding is 78px of the 687px panel, which also clears the
              half of the moon hanging below the border. See `ReadingPanel`.

              The sky is this panel's fill, the way the wash is the other
              one's — Figma draws it behind the page, cut to this panel's box.
              See `.reading-panel-sky`.
            */}
            <ReadingPanel moon bodyClassName="reading-panel-sky px-[4.44cqw] pt-[11.35cqw] pb-[8.59cqw]">
              <ReadingHero reading={reading} />
              {commerce}
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
              <WhatYouGet reading={reading} />
              <BeyondTheGate />
              <ReadingTestimonial reading={reading} />
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

        Which is why the button follows the slot rather than the saying above
        it. The id it scrolls to is inside `commerce` — `ReadingOrder` puts it
        on its wrapper, in every one of its own states — so on a page with an
        empty slot this would be a call to action pointing at an element that
        is not in the document. The saying stays either way: it is the
        reading's own last line, and copy rather than commerce.

        Whatever fills the slot owns that anchor, and that is the one thing a
        second caller has to agree with. It is prose rather than a type
        because the alternative is the caller passing its own closing action,
        which is three routes repeating one line to say the thing they all
        say.
      */}
      <ClosingSaying
        saying={reading.closing}
        action={
          commerce
            ? { label: readingPageChrome.closingAction, href: `#${readingPageChrome.checkout.anchor}` }
            : null
        }
        tone="champagne"
        width="reading"
      />
    </div>
  );
}
