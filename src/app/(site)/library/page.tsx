import type { Metadata } from "next";

import { LibraryIntro } from "@/components/library/LibraryIntro";
import { MajorArcanaGrid } from "@/components/library/MajorArcanaGrid";
import { Container, Section } from "@/components/layout/Section";
import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { ClosingSaying } from "@/components/readings/ClosingSaying";
import { library } from "@/content/library";
import { headerActions, siteName } from "@/content/site";

export const metadata: Metadata = {
  title: `Library — ${siteName}`,
  description: library.metaDescription,
};

/**
 * The Library (Figma `344:98`), and **the Major Arcana grid is its default
 * view** rather than a landing page in front of one: the nav's LIBRARY lands
 * here on the cards, and MAJOR ARCANA in the suit navigation is the way back to
 * this page from a suit.
 *
 * The closing block is `ClosingSaying` with this page's words. It already takes
 * the 538px rule this frame draws (`heroWide`, added for World Tarot) and the
 * gold tone the index uses, so there is nothing here to define — the point of
 * that component's props. GET MY READING goes to the readings index because
 * this page sells nothing itself, which is the rule `content/site.ts` sets for
 * the whole site.
 */
export default function LibraryPage() {
  return (
    /*
      **The room below the button is the client's, and it is measured.** Her
      frame ends the last call to action at y=3032 of 3772, so 740px — 19.62% of
      the page — is rotunda and nothing else. That is the same "show as much of
      the background as possible" the World Tarot page carries extra padding
      for, and it is the number to move if she wants more of it or less.

      **Her 740 is not spent in full here, and that is a deliberate departure
      from the frame.** The reason is the one `world-tarot/README.md` states
      outright: *the frame draws neither a header nor a footer.* So the 740 is
      air between the button and the bottom of her artboard — and the real page
      then puts a 522px footer (at 1920) underneath it, which she never drew and
      never budgeted for. Spending the number literally, as the World Tarot page
      does with its own 904, stacked about 1008px of empty rotunda on top of that
      footer and read as a hole in the page rather than as room.

      Trimmed by eye against the rendered page to roughly 290px between the
      button and the footer at 1920, which is this value plus the two things
      that are not this value's to give: half of `ClosingSaying`'s centred
      room-space box falls below the button (94px at 1920 — the box is
      `justify-center` with the button inside it, so only half of it is air
      underneath), and `SiteFooter`'s own top margin adds 14px. 290 - 94 - 14 =
      182px, and 182/1920 = 9.48vw.

      **So this is the knob, and 290px at 1920 is what it was tuned to.** Like
      the World Tarot page's two overhangs, it cannot be read off the frame,
      because what it compensates for is not in the frame.

      The re-exported backdrop is what lets the column be this short without
      going flat: the old 1280x2515 crop ran out of photograph partway down a
      desktop page, so trimming the padding would have ended the page on bare
      colour. The 1920x3772 export is her frame at full height, so the shorter
      column still ends on rotunda.

      **Below `lg` nothing changes.** The vw term only overtakes the 3rem floor
      above about 506px wide, so phones keep exactly the padding they had; the
      mobile page ends on the room by the backdrop's own floor anchor rather
      than by this padding.
    */
    <div className="relative isolate min-h-full pb-[clamp(3rem,9.48vw,11.375rem)]">
      {/*
        `max-lg:-top-20` is the readings index's arrangement, carried here for
        the mobile sky that now opens this page below `lg` (see
        `.page-atmosphere-library` in globals.css, where the rotunda turns
        floor-anchored to make room for it). The sky hangs from this element's
        top edge, and that edge sits under a masthead which is transparent so
        artwork can run behind it — flush, the sky would start on a hard
        horizontal line at the header's bottom. 5rem clears that header at
        every width below `lg`.

        The element moves; the artwork does not. `overflow: clip` on the
        atmosphere means the layer's own reach ends 5rem higher, which costs no
        picture — the sky is `cover` on a width-driven box, so the taller box
        simply shows more of the top of it.

        Above `lg` this is inert: the rotunda hangs from the top there, as the
        client draws it, with no sky in front of it.
      */}
      <PageAtmosphere variant="library" className="max-lg:-top-20" />

      <LibraryIntro />

      <Section padding="none" className="pb-[clamp(2rem,4.6vw,5.5rem)]">
        <Container width="library">
          <MajorArcanaGrid />
        </Container>
      </Section>

      {/*
        Champagne, not gold. The client read this line as off against the rest
        of the site, and it was: the World Tarot page and a reading's own page
        both closed in `--color-champagne` while this one and the readings index
        closed in gold. This page moved first; the readings index followed for
        the same note, and champagne is now `ClosingSaying`'s default rather
        than a thing each page asks for. `tone` is still passed here to keep the
        call explicit alongside the other three props.
      */}
      <ClosingSaying
        saying={[library.closing]}
        action={headerActions.cta}
        width="library"
        rule="heroWide"
        tone="champagne"
      />
    </div>
  );
}
