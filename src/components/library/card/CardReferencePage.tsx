import { AppearsPanel } from "@/components/library/card/AppearsPanel";
import { CardEssay } from "@/components/library/card/CardEssay";
import { CardHeader } from "@/components/library/card/CardHeader";
import { LookFor } from "@/components/library/card/LookFor";
import { MetaStrip } from "@/components/library/card/MetaStrip";
import { ShadowPanel } from "@/components/library/card/ShadowPanel";
import { SpheresCarousel } from "@/components/library/card/SpheresCarousel";
import { Container, Section } from "@/components/layout/Section";
import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { ClosingSaying } from "@/components/readings/ClosingSaying";
import type { MajorArcanaContent } from "@/content/card-content";
import type { MajorArcanaCard } from "@/content/library";

/**
 * A Major Arcana card's reference page (Figma `357:261`).
 *
 * The sections run in the client's order and each owns its own block; this file
 * composes them and owns the page's measures, its rhythm and its backdrop.
 *
 * **Two measures, because she draws two.** Her prose runs 1035px and her panels
 * run 1234px, so the dark panels and the meta strip break out past the text
 * rather than everything sharing one column — see `--container-card` and
 * `--container-card-wide`.
 *
 * **The masthead and footer are additions**, in the sense that her frame draws
 * neither: it begins at the paper's torn top edge. They stay because a visitor
 * arriving here from a search must be able to leave, the same reasoning behind
 * the mobile menu button. They are now the only way off this page: the back
 * link that used to sit under the closing line was removed at the client's
 * request, and there is still deliberately no prev/next.
 */
export function CardReferencePage({
  card,
  content,
}: {
  card: MajorArcanaCard;
  content: MajorArcanaContent;
}) {
  return (
    <div className="library-card-page min-h-full pb-[clamp(3rem,8.9vw,10.7rem)]">
      {/*
        **This wrapper is deliberately not `relative`**, which is what lets the
        artwork reach up behind the transparent masthead.

        `PageAtmosphere` is `absolute inset-0`, so it resolves against the
        nearest positioned ancestor. With `relative` here that was this div —
        which begins *below* the header, so no amount of lifting could ever
        reach the top of the window; every attempt just dragged the picture
        away from the page and left a band of `body`'s night above it. Without
        it the atmosphere resolves against the layout column instead, which is
        exactly what `(site)/layout.tsx` is positioned for: it "spans header,
        main and footer", in that file's own words.

        `isolate` is gone for the same reason — the layout already establishes
        the stacking context the `-z-10` needs, and a second one here would
        trap this layer inside the page again.

        The remaining lift in globals.css is small and does a different job:
        it covers the masthead's own height. See
        `.page-atmosphere-card-reference`.
      */}
      <PageAtmosphere variant="card-reference" />

      {/*
        **Everything below lives on the sheet**, which is the page's structure
        rather than its decoration — see `.card-paper` in globals.css. Her paper
        runs y=171..3166 of a 3237 frame, so the space above it is the top
        margin here and the page's own bottom padding is the space below.

        **The top margin is hers again**, 171px of her 1920 frame. It briefly
        carried the masthead's height as well, from a period when this page's
        wrapper was positioned and the artwork could not reach up behind the
        nav — the paper had to start below the header by itself. The atmosphere
        spans the layout column now (see the note above it), so the header sits
        over the page's own artwork and this margin is back to being what she
        drew: the space between the top of the page and the torn edge of the
        sheet.
      */}
      {/*
        **The room under the closing line is padding on the sheet**, not a
        spacer element after it. Her paper runs 305px past that line — empty
        paper, the same "let the artwork breathe" the Library page records —
        and `.card-paper` is sized by its content with its torn bottom edge
        pinned at `top: 100%`, so with nothing holding that room open the
        deckle closes up against the saying.

        A spacer div was the wrong way to hold it: it grows the sheet the same
        as any other content, and the sheet is already taller than both things
        drawn behind it. The paper's middle is a 2947px tile on `repeat-y` and
        the atmosphere's wash is a fixed 169.32vw, so every pixel added here
        walks the tile's seam further up the page and pushes the bottom deckle
        past the end of the wash onto flat parchment. Padding puts the room
        *inside* the box that was already there rather than adding to it.
      */}
      <div className="card-paper mt-[clamp(1.5rem,5.28vw,6.34rem)] pb-[clamp(3.813rem,12.708vw,15.25rem)]">
        {/*
          **Her gold `FRAME` ornament is gone at the client's request** — the
          1229x604 flourish that used to hang 57px below the torn top edge, with
          the numeral and the essay stacked over it. Its asset is deleted too,
          so there is nothing to restore it from.

          What it leaves behind is this: the heading's top padding was measured
          to her frame, not to the ornament, so it is unchanged. The `.stack`
          that layered the two is gone with it — with one child there is
          nothing left to layer — and this is a plain column again.

          Her numeral starts at y=297 against a sheet that begins at y=171, so
          126px down to the heading and 176 more to the essay. Explicit here for
          the same reason the gaps below are: a shared `Section` padding gives
          every block the same air, and hers are all different.
        */}
        <div className="flex flex-col">
          <Section padding="none" className="pt-[clamp(1.969rem,6.563vw,7.875rem)]">
            <Container width="card">
              <CardHeader card={card} />
            </Container>
          </Section>

          <Section padding="none" className="pt-[clamp(0.875rem,2.917vw,3.5rem)]">
            <Container width="card">
              <CardEssay card={card} content={content} />
            </Container>
          </Section>
        </div>

        {/*
          **The gaps are hers, one at a time, rather than a shared rhythm.**
          Her frame spaces these blocks 34, 35, 41 and 69px apart — they tighten
          through the middle of the page — so a single `Section` padding cannot
          produce them. Each is the Figma gap as the clamp's maximum and that
          gap / 19.2 as its vw term, the conversion `src/app/README.md` requires.

          Three are tighter than her frame: the gap above this panel, the one
          above the meta strip and the one above the closing line. Her numbers measure to a *text box* whose
          empty tail is part of the gap, and the same value applied to a box
          that ends at its last line reads as far more air.

          **The panel sits close under the essay, and her frame is the reason.**
          She starts it at y=1119 while the essay column's own box runs to
          y=1166 — they overlap by 47px, because that column is sized for the
          artwork beside it rather than for the prose, which ends higher. So the
          gap here is small by design: the air the essay appears to have below it
          is the empty tail of its own column, not spacing.
        */}

        <Section padding="none" className="mt-[clamp(0.5rem,1.25vw,1.5rem)]">
          <Container width="cardWide">
            <AppearsPanel cardName={card.name} columns={content.appears} />
          </Container>
        </Section>

        {/*
          **Wider than her 35px, at the client's request.** Every other gap on
          this page is her frame's own figure (see the note above), and this one
          was `clamp(0.531rem, 1.771vw, 2.125rem)` — 34px at the top end.

          The panel above it is a dark, hard-edged block and LOOK FOR is a rule
          with words in it, so at her spacing the rule read as though it
          belonged to the panel rather than to the section it introduces.
          Doubling it detaches the two. It is the one gap on the page that is
          deliberately not hers; the rest of the rhythm is untouched.
        */}
        <Section padding="none" className="mt-[clamp(1.25rem,3.6vw,4.25rem)]">
          <Container width="cardWide">
            <LookFor lines={content.lookFor} />
          </Container>
        </Section>

        <Section padding="none" className="mt-[clamp(0.547rem,1.823vw,2.188rem)]">
          <Container width="cardWide">
            <SpheresCarousel cardName={card.name} spheres={content.spheres} />
          </Container>
        </Section>

        <Section padding="none" className="mt-[clamp(0.641rem,2.135vw,2.563rem)]">
          <Container width="cardWide">
            <ShadowPanel lines={content.shadow} />
          </Container>
        </Section>

        {/*
          **Tighter than her 69px**, which is the same correction as the two
          gaps noted above: hers measures from the shadow panel's text box,
          whose empty tail is part of the number, so the drawn value reads as
          far more air than she shows. 28px sets the strip close under the
          shadow panel, so the two dark blocks and the strip read as one run.
        */}
        <Section padding="none" className="mt-[clamp(0.438rem,1.458vw,1.75rem)]">
          <Container width="cardWide">
            <MetaStrip meta={content.meta} />
          </Container>
        </Section>

        {/*
          `action={null}` is the case this block already has for a page with
          nowhere to send the reader — `/redeem/` uses it — and it is right here
          for the same reason the Library index sells nothing: her frame draws
          the saying between two rules and no button under it.

          `hugRule` because there is no button, so the box that would centre
          one is pure empty height — up to 256px of it under a closing line
          that her frame ends on. It used to come free with `className`, back
          when that prop did both jobs; the two were separated so a caller
          could ask for one without the other, and this is the caller that
          wants both.
        */}
        <ClosingSaying
          className="mt-[clamp(0.313rem,1.042vw,1.25rem)]"
          saying={content.closing}
          action={null}
          width="cardClosing"
          rule="green"
          tone="ink"
          hugRule
        />

      </div>
    </div>
  );
}
