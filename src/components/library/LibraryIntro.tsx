"use client";

import { SuitNav } from "@/components/library/SuitNav";
import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { library } from "@/content/library";

/**
 * The Library's masthead, and the suit navigation under it.
 *
 * **The spacing is measured off her flattened render, not off Figma's node
 * boxes**, and the difference is the whole reason this masthead reads correctly
 * now. A text node's box is bigger than the ink inside it by whatever leading
 * and padding the layer carries, and taking those boxes as the layout gave a
 * masthead a third too tight — the type was right and the air between it was
 * not, which is what made the cards below look undersized.
 *
 * Ink extents in `LIBRARY_09_05.png` (frame coords, 1920 wide), and the gaps
 * between them, which are what the `clamp()` maxima below reproduce at
 * 1920/100 = 19.2 the way `src/app/README.md` describes:
 *
 * | band    | ink       | gap to the next |
 * |---------|-----------|-----------------|
 * | title   | 106..151  | 110px           |
 * | tagline | 261..281  |  29px           |
 * | blurb   | 310..336  |  75px           |
 * | nav     | 411..438  |  51px to cards  |
 *
 * All three lower lines measure the same 20-21px cap height, so they are one
 * size — 30px — and only the title differs, at 45px. Figma reported 30px for
 * all of them and was right; an earlier reading of this page put the navigation
 * at 41px by dividing its *width* by an assumed advance, which the pipes and
 * its own letter-spacing made nonsense of. **Cap height is the measurement to
 * trust here; width is not.**
 *
 * Two corrections stand between those ink gaps and the margins below, and both
 * are the kind that silently inflate a masthead:
 *
 * 1. **The rule is spaced to its artwork's box, not its ink.** The export is
 *    538x66 and the visible mark inside it spans 31px, so roughly 18px of
 *    transparency sits at each end. Spacing to the ink counts that twice.
 * 2. **Ink-to-ink is not box-to-box.** A caps-only line's em box stands about
 *    9px taller than its capitals at this size, mostly below the baseline, so
 *    each measured gap is reduced by the slack the boxes either side already
 *    contribute.
 *
 * Reconstructed that way the masthead comes to ~390px against her 383px, which
 * is as close as glyph metrics estimated from a raster will get. If this ever
 * needs revisiting, measure her render again rather than adjusting by eye.
 *
 * The 73% opacity on the standfirst is folded into the colour rather than set
 * on the element, following `ReadingsIntro` — it tints the text without dimming
 * whatever might later sit beside it.
 *
 * The navigation lives here because Figma draws it as part of this block, and
 * because on a suit page the masthead is what stays put while the grid below is
 * replaced.
 */
export function LibraryIntro({ current }: { current?: string }) {
  return (
    /*
      106px above, 51px below — 5.52vw and 2.656vw of a 1920px frame.

      **The lead-in is the frame's own, not a reduced one**, which is the
      World Tarot page's rule rather than the readings index's and is worth
      saying because this file took the wrong one first. Where the artwork is
      the point of the page, copy starting further down it *is* the design, and
      the masthead's height sits on top of this rather than being subtracted
      from it. The rotunda is exactly that kind of page: the client asks for as
      much of the room on show as it will give her, which is the same reason
      `LibraryPage` carries her 740px of it at the foot.

      `ReadingsIntro`'s 1.6vw is the other case — a frame that simply draws less
      air there — and copying it here cost about 75px of room.
    */
    <Section padding="none" className="pt-[clamp(2rem,5.52vw,6.625rem)] pb-[clamp(1.5rem,2.656vw,3.1875rem)]">
      <Container width="library" className="flex flex-col items-center text-center">
        {/*
          45px, not `text-h1`'s 60. This frame draws its title smaller than the
          homepage draws its own, and the difference showed: at 60 over a 1153px
          measure the masthead overpowered the 205px cards under it, which is
          the mismatch that made the grid look undersized when it was not.
          1920/100 = 19.2, so 45px is 2.344vw.
        */}
        <h1 className="font-display text-[clamp(1.5rem,2.344vw,2.8125rem)] leading-none tracking-[-0.01em] text-cream">
          {library.title}
        </h1>

        {/*
          **Measured to the artwork's box, not to its ink**, which is the trap
          here: the rule's export is 538x66 spanning frame y=170..236, but the
          visible mark inside it only runs y=188..219 — roughly 18px of
          transparent padding at each end. Spacing to the ink double-counts that
          padding and opens the masthead by about 35px.

          Title ink ends 151, the artwork's box starts 170: 19px. 19/19.2 =
          0.99vw.
        */}
        <Divider variant="heroWide" className="mt-[clamp(0.5rem,0.99vw,1.1875rem)]" />

        {/*
          30px — `text-nav`'s maximum, not `text-h3`'s 42.

          The artwork's box ends 236 and the tagline's ink starts 261: 25px.
          25/19.2 = 1.302vw.
        */}
        <p className="mt-[clamp(0.5rem,1.302vw,1.5625rem)] font-serif text-nav leading-none tracking-[0.01em] text-gold">
          {library.tagline}
        </p>

        {/*
          One line, which is how she draws it — her text box is 1703px wide and
          the sentence sits on a single line inside it.

          It is the longest thing in the masthead and the tightest fit on the
          page: about 890px of Gill Sans at her 30px, in a column that measures
          914px. Two dozen pixels is too fine a margin to leave to a font's
          rounding, and widening the column is not available — 914px is what
          keeps the masthead aligned with the cards.

          So the line holds one line by **scaling with the column instead of
          against it**. `--text-nav`'s own 1.5625vw ramp is what the column
          follows (`min(914px, 47.604vw)`), so type and box grow together and a
          fit at 1920 is a fit at every width above `lg` — the same reasoning
          `ReadingCard`'s `lg:whitespace-nowrap` subtitle rests on. The flat
          `3.2vw` clamp it had before topped out at 30px around 938px of
          viewport while the column kept shrinking, which is exactly the
          mismatch that would push an unwrappable line out of its box.

          Below `lg` it wraps like any other copy: the design stops scaling
          there and one line is not possible on a phone.
        */}
        <p className="mt-[clamp(0.375rem,1.198vw,1.4375rem)] font-light text-[clamp(0.75rem,3.2vw,1.875rem)] leading-[1.056] tracking-wide text-champagne/73 lg:text-[min(1.5625vw,1.875rem)] lg:whitespace-nowrap">
          {library.blurb}
        </p>

        <SuitNav current={current} />
      </Container>
    </Section>
  );
}
