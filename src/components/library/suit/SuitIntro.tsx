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

        **A quarter of the row, so the writing takes the other three.**

        What sets the floor is the keyword line: "EMOTION · INTUITION ·
        CONNECTION" is 34 characters of bold Cinzel caps at up to 36px, which
        wants roughly 760px and wrapped to two lines when the column gave it
        827. A quarter leaves about 925.

        **Pixel-measuring her frames does not settle this**, which is worth
        recording because it was tried: her wash reaches into the left margin at
        different densities per suit, so a threshold that finds the text on
        Swords finds watercolour on Pentacles. The figure is judged against the
        rendered page instead.
      */}
      <span aria-hidden className="hidden shrink-0 xl:block xl:w-[25%]" />

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

        **The ground is wider than the prose on purpose.** It sizes to the
        keyword line, which is the widest thing in the column, so there is a
        deliberate band of tint either side of the paragraphs beneath it —
        that is the padding her frame draws around this block, not slack to be
        removed. The paragraphs hold a much shorter measure for a reason given
        on their own wrapper below.
      */}
      <div className="card-reading-ground flex min-w-0 flex-col xl:mx-auto xl:w-fit">
        {/*
          **Two local overrides, both because a suit's heading is not a card's.**

          The title is 72px against `--text-card-name`'s 48. A figure read
          straight off her frame does not work here — the sheet is inset in her
          1920 frame and the page carries `--content-scale` and `--card-scale`
          on top, so her pixels have to be judged against the rendered page
          rather than multiplied out. An early attempt did multiply, and
          rendered the title at ~154px.

          The green rule is shorter. Its own measure is 582px, drawn under a
          card's name; her suit frames cut it to about the width of the title it
          sits under. `--measure-rule-green` is what `.divider--green` reads, and
          that rule's `aspect-ratio` keeps the artwork in proportion as it
          narrows.

          Both are set here rather than on the tokens, because the twenty-two
          card pages read those tokens.
        */}
        <div className="[--measure-rule-green:clamp(14rem,22vw,26rem)] [--text-card-name:clamp(2.625rem,3.75vw,4.5rem)]">
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

        {/*
          **The prose is narrower than the column it sits in**, where the
          heading and the keyword line above it run the column's full width.
          That is her frame: the title and keywords reach further right than the
          paragraphs, which hold a shorter measure so the three of them stack as
          an even block rather than running the width of the sheet.

          **And it is inset from the left, not flush with the heading.** Her
          frame centres the paragraph block under the title rather than hanging
          it on the column's left edge, so the three paragraphs sit inside the
          span of the words above them. `mx-auto` with the cap does exactly
          that: the block is narrower than the column and the remaining space
          falls either side of it.

          `max-w` rather than a narrower column, so only the paragraphs move —
          the heading and keywords keep the position they were set against.
          **A length, not a percentage**, now that the ground is `w-fit`: a
          percentage would be a share of a width that the content itself
          determines, and the two would chase each other. 30rem is the measure
          her paragraphs hold — a little under the keyword line above them,
          which is what sets the panel's width.

          **The measure is narrow so the block runs tall, and that is the
          point.** On Pentacles her coin pouch reaches furthest down the sheet,
          and with the paragraphs set wide this section ended above it — so
          KEY THEMES rode up into the artwork. Wrapping the same words into
          more lines lengthens the section and carries the rule clear of the
          painting. The three suits whose emblems are shorter gain the same
          proportions for free.

          So this number is a *vertical* control wearing a horizontal unit. If
          KEY THEMES ever collides with an emblem again, narrow it further; if
          a future sheet has no emblem to clear, it can widen.

          `xl`-only. Below that the column is the full measure and the prose is
          already centred under the heading, where a cap would read as an inset
          block.
        */}
        <div className="mt-[clamp(calc(0.875rem*var(--card-scale)),calc(2.917vw*var(--card-scale)),calc(3.5rem*var(--card-scale)))] flex flex-col gap-[clamp(calc(0.75rem*var(--card-scale)),calc(1.46vw*var(--card-scale)),calc(1.75rem*var(--card-scale)))] xl:mx-auto xl:max-w-88">
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
