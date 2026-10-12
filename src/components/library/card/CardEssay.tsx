import Image from "next/image";

import type { MajorArcanaContent } from "@/content/card-content";
import { Keywords } from "@/components/library/card/Keywords";
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
 * **The row starts at `lg`, and it used to start at `xl`.** That later
 * threshold was itself a fix: at 1024 the card took 257px of a 552px measure
 * and left the prose about 31 characters, where running prose wants 45 or more.
 * Two things have since changed it. The keywords moved out of the row entirely
 * (see below), so the `nowrap` line that used to break out of the sheet no
 * longer sits in this column at all; and the card's cap came down to 14.5rem.
 *
 * Measured on the current page, stacking through 1024..1280 was overshooting
 * rather than protecting: the prose ran **65 characters at 1024 rising to 77 by
 * 1200**, at and then past the top of the comfortable range, while the row at
 * 1280 came in at 39. So the single-column band was the wrong half of the
 * trade.
 *
 * **And it was feeding the sheet.** The parchment is drawn at its own aspect
 * from the content's height (see `.card-paper__sheet`), so a narrow column
 * makes a tall page and a tall page makes a wide sheet: through 1024..1200 the
 * sheet reached 100% of the viewport and had to be capped. Crossing into the
 * row at 1280 dropped the page 321px at a stroke — 2222 to 1901 on Justice —
 * and the sheet back to 82%. Moving the row to `lg` takes that saving across
 * the whole band.
 *
 * The 14.5rem cap is a trade against the plaque, which is a share of the card —
 * see `.library-card__name`, whose size the client has twice asked to raise.
 * 232px holds its capitals at 8.6px.
 *
 * **Below `lg` the artwork goes above the prose**, which is an addition — she
 * drew no mobile frame, and a 359px picture beside a 603px column has no honest
 * narrow form. See this folder's README for the full list of what was added
 * below `lg` and why.
 *
 * **The stacked cap is `min(14rem, 56%)`, and it is deliberately smaller than
 * the row's.** With the picture above the prose it has the whole column to
 * itself, so the old `min(20rem, 80%)` drew it as large as the column allowed —
 * which on this page is not free: every pixel of card height is a pixel of page
 * height, and the sheet's width follows the page's height. A narrower card
 * shortens the page and narrows the parchment with it. 56% of the column rather
 * than 80% keeps the plaque legible (the client's note about the plaque name is
 * the card's size, not the lettering) while giving that loop less to work with.
 *
 * The artwork is the deck file the Library grid already ships — gold border,
 * roundel and plaque baked in — so there is no chrome to rebuild here, and the
 * alt text is the client's specified format via `cardAlt`.
 */
export function CardEssay({ card, content }: { card: MajorArcanaCard; content: MajorArcanaContent }) {
  return (
    <div className="flex flex-col">
      {/*
        **Centred over the whole sheet, not over the prose column.**

        These two lines used to sit inside the prose column, beside the card.
        That column is 496px — the 748px measure less the 232px card and its gap
        — and it fitted The Fool's "Wonder • Trust • Beginning" with 44px to
        spare, which is why it survived a year as the only card on the site. The
        World's "Completion • Fulfillment • Wholeness" needs about 581px and ran
        past the paper's right edge.

        Lifting them out of the row gives them the full measure, where the
        longest line in the deck clears by 167px and every card keeps the single
        line her frame draws. It is also closer to her drawing, which sets both
        above the essay rather than beside the card.

        The keywords still wrap only at the bullets (see below), so a narrow
        viewport breaks them between phrases rather than mid-phrase.
        `text-balance` evens the result when it does.

        **Both gaps here are tighter than her frame** — 25px above the
        subtitle and 35px below it become 14 and 22. Hers measure between
        text boxes whose leading is part of the number, and both lines are
        set `leading-none`, so the drawn values open a hole between two lines
        that belong together as one heading.
      */}
      <Keywords keywords={content.keywords} />

      <p className="mt-[clamp(calc(0.438rem*var(--card-scale)),calc(0.729vw*var(--card-scale)),calc(0.875rem*var(--card-scale)))] text-balance text-center font-display text-nav leading-none tracking-[0.01em] text-card-ink-soft">
        {content.subtitle}
      </p>

      {/*
        Her 35px between the subtitle and the artwork below it, on the same
        clamp the rest of this frame uses.
      */}
      <div className="mt-[clamp(calc(0.547rem*var(--card-scale)),calc(1.823vw*var(--card-scale)),calc(2.188rem*var(--card-scale)))] flex flex-col items-center gap-[clamp(calc(1.5rem*var(--card-scale)),calc(3.02vw*var(--card-scale)),calc(3.625rem*var(--card-scale)))] lg:flex-row lg:items-start lg:gap-[clamp(calc(0.75rem*var(--card-scale)),calc(1.458vw*var(--card-scale)),calc(1.75rem*var(--card-scale)))]">
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
          **The `25.1vw` cap applies from `lg`**, where the card sits beside the
          prose and has to leave it a measure. Below that it stacks above the
          prose with the whole column to itself and takes the other cap.

          **Neither cap can be answered by the lettering instead.**
          `.library-card__name` is already at `3.7cqw`, which the note on that
          rule derives from the rivets in the artwork and which the client has
          twice asked to raise. It is a ceiling, not a preference. Since the
          letters are a share of the card, the only lever is the card itself:
          at `25.1vw` a 390px phone drew a 98px card and a 3.6px capital, which
          is the unreadable plaque the client reported.

          `min(14rem, 56%)` draws that phone at 218px and the capital at 8.1px —
          legible, and a good deal shorter than the 312px the old `80%` gave.
          The header note above records why the smaller figure is wanted here:
          card height is page height, and page height is the sheet's width.

          `sizes` follows both, or the browser keeps fetching the wrong
          candidate. Its breakpoint is `64rem` to match the `lg` the layout now
          switches at.
        */}
        <span className="library-card @container block w-full max-w-[min(14rem,56%)] shrink-0 lg:max-w-[min(14.5rem,25.1vw)]">
          <span className="stack">
            <Image
              src={card.image.src}
              alt={cardAlt(card)}
              width={card.image.width}
              height={card.image.height}
              className="h-auto w-full"
              sizes="(width >= 64rem) 14.5rem, min(14rem, 56vw)"
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
  
        {/*
          **`min-w-0`, because a flex item will not shrink below its content.**
          At `xl` this column sits beside the card in a flex row, and the default
          `min-width: auto` means its intrinsic width — the longest line of prose
          laid out unwrapped — becomes its floor. The longest essay in the deck
          (The World's, at 1423 characters against The Empress's 754) therefore
          pushed this column past the paper's right edge instead of wrapping
          inside it.
  
          `min-w-0` lets it shrink to the space the row actually gives it, which
          is what makes the text wrap rather than overflow. It is invisible on
          every card whose copy is short enough to fit either way.
        */}
        {/*
          **`max-w-prose` below `lg`, where this column has the whole sheet.**

          The sheet is full-bleed under `lg` (`--measure-card-paper` is the
          literal `100%` there), so with the picture stacked above it these
          paragraphs ran the entire viewport: measured at 88 characters on a
          768px tablet and 117 by 1023, against the 45..75 running prose wants.
          Capping the column centres it instead and holds it near 70.

          Dropped at `lg`, where the row takes over and the card beside it sets
          the measure.
        */}
        <div className="flex min-w-0 max-w-prose flex-col items-center text-center lg:items-stretch">

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

            The faint wash this copy reads on is **not set here** — the whole
            opening section carries it, from the keywords down to this last
            paragraph, so it is one ground rather than a tint behind the prose
            alone. See `.card-reading-ground` in globals.css, applied in
            `CardReferencePage`.
          */}
          <div className="mt-[clamp(calc(0.625rem*var(--card-scale)),calc(1.146vw*var(--card-scale)),calc(1.375rem*var(--card-scale)))] flex flex-col gap-[clamp(calc(0.75rem*var(--card-scale)),calc(1.46vw*var(--card-scale)),calc(1.75rem*var(--card-scale)))]">
            {content.essay.map((paragraph) => (
              <p
                key={paragraph}
                className="text-pretty font-light text-card-label tracking-[0.01em] text-card-ink-soft lg:text-left"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
