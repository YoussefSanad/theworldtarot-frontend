import { CardHeader } from "@/components/library/card/CardHeader";
import { Keywords } from "@/components/library/card/Keywords";
import type { SuitContent } from "@/content/suit-content";

/**
 * A suit page's opening block: the name, the rule, the keywords and the three
 * paragraphs — with the emblem's room beside them.
 *
 * **The left column is empty on purpose, and that is the whole layout.** Her
 * emblem — the chalice, the pouch, the sword, the torch — is painted *into the
 * parchment*, in exactly the band where a card's tile sits on a card reference
 * page. So this is that page's two-column arrangement with nothing in the first
 * column: the sheet supplies the picture, and the prose sits beside it.
 *
 * **That is why this is not `CardEssay`.** That component draws the card tile —
 * the plaque, the name laid into it, the long-name rule for THE HIGH PRIESTESS,
 * the `25.1vw` cap that leaves the prose a measure — and a suit has none of
 * those things. Reusing it would have meant a prop that switches off most of
 * what it does, which is two components wearing one name.
 *
 * **The type is `CardEssay`'s**, deliberately: `text-pretty` against the
 * client's note about single words stranded on a line, `--text-card-label` for
 * its 22/18, and the same gap between paragraphs. Her suit frames set the prose
 * identically to her card frames.
 *
 * Below `xl` the empty column collapses and the prose runs the full measure,
 * which is where the phone sheet's own emblem placement takes over — see
 * `suitPaperMobile`.
 */
export function SuitIntro({ title, content }: { title: string; content: SuitContent }) {
  return (
    /*
      The gap is vertical-only above `xl`: the 15% reserve beside this row is
      measured to where her prose *begins*, so a column gap on top of it would
      push the writing past her left edge and narrow the column again.
    */
    <div className="flex flex-col items-center gap-[clamp(calc(0.75rem*var(--card-scale)),calc(1.46vw*var(--card-scale)),calc(1.75rem*var(--card-scale)))] xl:flex-row xl:items-start xl:gap-x-0">
      {/*
        **The emblem's room.** It draws nothing — the parchment behind it
        already carries her artwork — and exists so the column beside it starts
        where her frame starts it. `aria-hidden` because there is nothing here
        to announce: the emblem is part of the page's background.

        **A quarter of the row, so the writing takes the other three.** This
        figure has been wrong in both directions: it began as `CardEssay`'s
        `min(14.5rem, 25.1vw)` — the card-tile slot, which left the column
        cramped — and was then cut to 15% off a pixel measurement of where her
        prose starts, which overshot the other way and made it too wide.

        Pixel-measuring those edges is unreliable: her wash reaches into the
        margin at different densities per suit, so a threshold that finds the
        text on Swords finds watercolour on Pentacles. So this is set against
        the rendered page instead, which is the thing the proportion is
        actually judged on.

        **Half the row, at the client's direction.** The figure has moved
        several times — the card tile's 25.1vw, then 15%, 25%, 20% — because
        two other things were distorting what it looked like: the sheet was
        being squeezed horizontally (see `.suit-paper`) and the section sat in
        the narrower `card` measure. Both are fixed, and 50% is the proportion
        judged against the corrected page.
      */}
      <span aria-hidden className="hidden shrink-0 xl:block xl:w-[50%]" />

      {/*
        **The whole of the writing is in this one column, heading included.**

        Her frame sets the title, the rule under it and the keyword line
        against the *prose's* measure rather than the sheet's: they share the
        body's right edge, and the chalice has the left of the sheet to itself
        from the torn top edge down to the KEY THEMES rule. Centring the
        heading across the full sheet — which an earlier build did — put it
        over the emblem and broke that column.
      */}
      {/*
        **The reading ground sits on this column alone**, not across the row.
        Her first section is the one place on the page where the wash belongs
        to the writing and not to the section: the emblem's half of the sheet
        is her painting at its heaviest and must stay uncovered, while the
        prose beside it reads on the tint. An earlier build put the ground
        around both columns, which laid a panel over the chalice.
      */}
      <div className="card-reading-ground flex min-w-0 flex-col">
        {/*
          **A little larger than a card's name, not three times it.**

          The first attempt at this read the cap height straight off her frame —
          107–109px of 1920 — and converted it as though the frame mapped 1:1 to
          the viewport, which gave ~154px and rendered enormous. It does not map
          1:1: the sheet is inset in her frame and the page carries its own
          `--content-scale` and `--card-scale` on top, so a figure taken from
          her pixels has to be read against the rendered page rather than
          multiplied out. Judged there, the title wants 58px at desktop where
          `--text-card-name` gives 48.

          The vw term is 58/19.2 to match, and the floor keeps the same ratio
          to the maximum that the shared token does. Local because the
          twenty-two card pages read that token.
        */}
        <div className="[--text-card-name:clamp(2.125rem,3.02vw,3.625rem)]">
          <CardHeader heading={title} />
        </div>

        {/*
          Her keyword line, in the same component the card pages use — see
          `Keywords` for why the separator splitting is shared rather than
          retyped. **Bold here where a card's is not**: her suit frames set this
          line considerably heavier than the title above it.
        */}
        <div className="mt-[clamp(calc(0.875rem*var(--card-scale)),calc(2.917vw*var(--card-scale)),calc(3.5rem*var(--card-scale)))] font-bold">
          <Keywords keywords={content.keywords} />
        </div>

        <div className="mt-[clamp(calc(0.875rem*var(--card-scale)),calc(2.917vw*var(--card-scale)),calc(3.5rem*var(--card-scale)))] flex flex-col gap-[clamp(calc(0.75rem*var(--card-scale)),calc(1.46vw*var(--card-scale)),calc(1.75rem*var(--card-scale)))]">
          {content.essay.map((paragraph) => (
            <p
              key={paragraph}
              className="text-pretty text-center font-light text-card-label tracking-[0.01em] text-suit-ink xl:text-left"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
