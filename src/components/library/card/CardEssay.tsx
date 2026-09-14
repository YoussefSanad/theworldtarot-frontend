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
 * **Below `lg` the artwork goes above the prose**, which is an addition — she
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
    <div className="flex flex-col items-center gap-[clamp(1.5rem,3.02vw,3.625rem)] lg:flex-row lg:items-start">
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
      <span className="library-card @container block w-full max-w-[min(22.4375rem,34.7vw)] shrink-0">
        <span className="stack">
          <Image
            src={card.image.src}
            alt={cardAlt(card)}
            width={card.image.width}
            height={card.image.height}
            className="h-auto w-full"
            sizes="(width >= 64rem) 22.4375rem, 80vw"
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

      <div className="flex flex-col items-center text-center lg:items-stretch">
        {/*
          **Centred over the prose, and on one line.** Her frame sets both above
          the essay rather than beside it, so they stay centred where the
          paragraphs below turn left-aligned at `lg` — the column is the shared
          measure, not the alignment.

          `whitespace-nowrap` on the keywords: they are one line in her drawing
          and the bullets are separators rather than break points, so a wrap
          would read as three items rather than one phrase. `text-balance` on
          the subtitle for the narrow widths where it has to give.
        */}
        <p className="whitespace-nowrap text-center font-serif text-card-lead leading-none tracking-[0.01em] text-card-ink">
          {content.keywords}
        </p>

        <p className="mt-[clamp(0.75rem,1.3vw,1.5625rem)] text-balance text-center font-display text-nav leading-none tracking-[0.01em] text-card-ink-soft">
          {content.subtitle}
        </p>

        <div className="mt-[clamp(1rem,1.82vw,2.1875rem)] flex flex-col gap-[clamp(0.75rem,1.46vw,1.75rem)]">
          {content.essay.map((paragraph) => (
            <p
              key={paragraph}
              className="font-light text-card-label leading-[1.273] tracking-[0.01em] text-card-ink-soft lg:text-left"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
