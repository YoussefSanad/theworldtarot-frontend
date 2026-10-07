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
    <div className="flex flex-col items-center gap-[clamp(calc(0.75rem*var(--card-scale)),calc(1.46vw*var(--card-scale)),calc(1.75rem*var(--card-scale)))] xl:flex-row xl:items-start">
      {/*
        **The emblem's room.** It draws nothing — the parchment behind it
        already carries her artwork — and exists so the column beside it starts
        where her frame starts it. `aria-hidden` because there is nothing here
        to announce: the emblem is part of the page's background.

        The share is the one `CardEssay` gives the card tile at `xl`, so the
        prose on a suit page and the prose on a card page begin at the same x.
      */}
      <span aria-hidden className="hidden shrink-0 xl:block xl:w-[min(14.5rem,25.1vw)]" />

      {/*
        **The whole of the writing is in this one column, heading included.**

        Her frame sets the title, the rule under it and the keyword line
        against the *prose's* measure rather than the sheet's: they share the
        body's right edge, and the chalice has the left of the sheet to itself
        from the torn top edge down to the KEY THEMES rule. Centring the
        heading across the full sheet — which an earlier build did — put it
        over the emblem and broke that column.
      */}
      <div className="flex min-w-0 flex-col">
        <CardHeader heading={title} />

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
