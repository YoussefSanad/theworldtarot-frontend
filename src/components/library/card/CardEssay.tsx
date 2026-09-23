import Image from "next/image";

import type { MajorArcanaContent } from "@/content/card-content";
import { LONG_NAME } from "@/components/library/TarotCardTile";
import { cardAlt, type MajorArcanaCard } from "@/content/library";
import { cn } from "@/lib/cn";

/**
 * The card's artwork beside its keywords, subtitle and three paragraphs.
 *
 * Her frame sets the artwork at 359x593 on the left and the prose in a 603px
 * column on the right, both inside the page's 1035px measure.
 *
 * **The gutter is tighter than her frame too**, 28px rather than 58, and only
 * at `xl` and up: below that the same `gap` is the vertical space between the
 * stacked picture and the prose, where the drawn value is right.
 *
 * **The artwork is drawn narrower than her frame**, at 232px rather than 359.
 * Hers leaves the prose a measure that runs long for its type size; giving the
 * picture back widens the text column without touching the page's own measure,
 * and the card stays legible at that size because it is still nearly three
 * times the Library grid's tile.
 *
 * **The row starts at `xl`, not `lg`, and that is a fix rather than a
 * preference.** At 1024 the page's measure is 552px and the card was taking
 * 257 of it, which left the prose 280px — about 31 characters, where running
 * prose wants 45 or more. The keywords line is `nowrap` and needs roughly 340,
 * so it broke out of the sheet, which is how the fault was reported. Stacked
 * through that range the prose has the whole measure instead: 46 characters at
 * 768px rising to 72 by 1200.
 *
 * The card's own cap came down with it, from 16.25rem to 14.5rem, so the row
 * opens at about 49 characters rather than 46 and widens from there. Both
 * numbers are a trade against the plaque, which is a share of the card — see
 * `.library-card__name`, whose size the client has twice asked to raise. 232px
 * holds its capitals at 8.6px.
 *
 * **Below `xl` the artwork goes above the prose**, which is an addition — she
 * drew no mobile frame, and a 359px picture beside a 603px column has no honest
 * narrow form. See this folder's README for the full list of what was added
 * below `lg` and why.
 *
 * The artwork is the deck file the Library grid already ships — gold border,
 * roundel and plaque baked in — so there is no chrome to rebuild here, and the
 * alt text is the client's specified format via `cardAlt`.
 */
export function CardEssay({ card, content }: { card: MajorArcanaCard; content: MajorArcanaContent }) {
  return (
    <div className="flex flex-col items-center gap-[clamp(1.5rem,3.02vw,3.625rem)] xl:flex-row xl:items-start xl:gap-[clamp(0.75rem,1.458vw,1.75rem)]">
      {/*
        **The name is laid into the plaque here exactly as the grid does it**,
        and for the same reasons: her artwork ships the plaque empty ("NO PLAQUE
        NAME" is her own folder's title), her baked-in version was not sharp
        enough to read, and a picture of a word is invisible to search,
        selection and translation.

        `@container` with the tile's own `cqw` sizing, so one set of
        measurements holds at whatever width this column gives the card —
        `.library-card__name` in globals.css owns where it sits on the plaque.
        `TarotCardTile` carries the long-name rule for the one name in the deck
        that overruns; it cannot bite here, where the card is drawn four times
        the grid's size, but it is applied for consistency with that tile.
      */}
      {/*
        **The `25.1vw` cap only applies from `xl`**, where the card sits beside
        the prose and has to leave it a measure. Below that it stacks above the
        prose with the whole column to itself, and the cap was making it far
        smaller than it needed to be — the client's note that the plaque name
        is unreadable on mobile is this, not the lettering.

        The name cannot answer it on its own: `.library-card__name` is already
        at `3.7cqw`, which the note on that rule derives from the rivets in the
        artwork and which the client has twice asked to raise. It is a ceiling,
        not a preference. Since the letters are a share of the card, the only
        lever left is the card, and at `25.1vw` a 390px phone was drawing a
        98px card and a 3.6px capital. At 80% of the column it is 312px and
        11.5px — the same plaque, legible.

        `sizes` follows, or the browser keeps fetching the small candidate for
        a box three times the width. Its breakpoint is `80rem` to match the
        `xl` the layout now switches at.
      */}
      <span className="library-card @container block w-full max-w-[min(20rem,80%)] shrink-0 xl:max-w-[min(14.5rem,25.1vw)]">
        <span className="stack">
          <Image
            src={card.image.src}
            alt={cardAlt(card)}
            width={card.image.width}
            height={card.image.height}
            className="h-auto w-full"
            sizes="(width >= 80rem) 14.5rem, min(20rem, 80vw)"
            priority
          />

          <span
            className={cn(
              "library-card__name pointer-events-none",
              card.name.length > LONG_NAME && "library-card__name--long",
            )}
          >
            <span className="library-card__name-text">{card.name}</span>
          </span>
        </span>
      </span>

      <div className="flex flex-col items-center text-center xl:items-stretch">
        {/*
          **Centred over the prose, and on one line.** Her frame sets both above
          the essay rather than beside it, so they stay centred where the
          paragraphs below turn left-aligned at `lg` — the column is the shared
          measure, not the alignment.

          `whitespace-nowrap` on the keywords: they are one line in her drawing
          and the bullets are separators rather than break points, so a wrap
          would read as three items rather than one phrase. `text-balance` on
          the subtitle for the narrow widths where it has to give.

          **Both gaps here are tighter than her frame** — 25px above the
          subtitle and 35px below it become 14 and 22. Hers measure between
          text boxes whose leading is part of the number, and both lines are
          set `leading-none`, so the drawn values open a hole between two lines
          that belong together as one heading.
        */}
        {/*
          `nowrap` only from `sm`. It is one line in her drawing and the bullets
          separate rather than break, which the docblock above records — but on
          the narrowest phones "WONDER • TRUST • BEGINNING" is wider than the
          column at the 22px floor these tokens now carry, and `nowrap` there
          overflows the sheet rather than keeping a promise. Below `sm` it may
          wrap at a bullet; `text-balance` keeps the two lines even when it
          does.
        */}
        <p className="text-balance text-center font-serif text-card-lead leading-none tracking-[0.01em] text-card-ink sm:whitespace-nowrap">
          {content.keywords}
        </p>

        <p className="mt-[clamp(0.438rem,0.729vw,0.875rem)] text-balance text-center font-display text-nav leading-none tracking-[0.01em] text-card-ink-soft">
          {content.subtitle}
        </p>

        {/*
          **`text-pretty` on the paragraphs, not `text-balance`.** The client's
          note is that single words sit alone on a line. `text-balance` is the
          tempting answer and the wrong one here: it evens out a *whole* block
          and browsers cap it at a few lines (Chrome stops at four), so on
          three paragraphs of running prose it either does nothing or squares
          off the whole shape. `text-pretty` targets exactly the reported
          fault — it forbids the last line being a single short word — and has
          no line cap.

          The leading is the token's now, rather than the 1.273 that used to be
          set here. `--text-card-label` carries 1.222 to meet the client's
          22/18, and a local override would have quietly kept the old ratio on
          the longest-running copy on the page.
        */}
        <div className="mt-[clamp(0.625rem,1.146vw,1.375rem)] flex flex-col gap-[clamp(0.75rem,1.46vw,1.75rem)]">
          {content.essay.map((paragraph) => (
            <p
              key={paragraph}
              className="text-pretty font-light text-card-label tracking-[0.01em] text-card-ink-soft xl:text-left"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
