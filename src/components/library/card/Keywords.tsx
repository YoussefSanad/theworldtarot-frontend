import { Fragment } from "react";

/**
 * The keyword line under a reference page's first rule — "WILL • FOCUS •
 * CREATION" on a card, "EMOTION · INTUITION · CONNECTION" on a suit.
 *
 * **Lifted out of `CardEssay` so both page kinds share one implementation.**
 * The markup and all the reasoning below are that component's, moved unchanged
 * — the split rule in particular is worth exactly one copy of itself.
 *
 * Her suit frames separate with `·` where her card frames use `•`, so the split
 * takes both. The join stays `•`: it is what the card pages render today, and a
 * suit's line is read from her copy rather than rebuilt from the separator.
 */
/*
  **It wraps at the bullets and nowhere else.**

  This was `sm:whitespace-nowrap`: one line in her drawing, and the
  bullets separate rather than break, so a wrap mid-phrase would read as
  three items instead of one. That held while The Fool's
  "Wonder • Trust • Beginning" was the only line on the site. It does not
  hold for twenty-two: The World's "Completion • Fulfillment • Wholeness"
  is 36 characters against his 28, and at this type size beside a
  232px-wide card it ran past the paper's right edge.

  So the promise is kept where it matters and dropped where it cannot
  be. Each phrase is wrapped in `nowrap` so it can never break inside
  itself, and the line is free to wrap *between* phrases when the column
  is too narrow — which is exactly what the bullets are for.

  **The separator sits outside the spans, and that is the whole trick.**
  It used to live inside them — `{index > 0 && " • "}` was the first
  child of each `nowrap` span — and the note here claimed the separators
  "keep their own spaces either side, so a break lands after a bullet".
  They did not. React renders these spans adjacent with no text node
  between them, so the only spaces on the whole line were the two
  flanking each bullet, and both were sealed inside a
  `white-space: nowrap` span. A line with no breakable space cannot
  wrap at any width: `Endings • Release • Transformation` measured 424px
  of content in a 352px box and simply hung out of it. Hoisting the
  separator into the `<Fragment>` puts those spaces back in the
  paragraph's own flow, where they are the break opportunities the
  bullets were always meant to be.

  `text-balance` then evens the two lines when it does wrap.

  **The `22rem` cap is what the wrap needs on a phone**, because the
  shell will not supply it. Below `lg` this line is a flat 22px — the
  clamp's `1.875vw` term does not beat its own 22px floor until a
  1173px viewport, and `--card-scale` is only declared above `lg` —
  while the shell is the whole screen less two 20px gutters. So the box
  grows and the type does not, and the longest lines in the deck sit on
  one line well past the point where the sheet's painted border has
  closed in on them. The sheet is full-bleed below `lg` with that border
  *inside* it, so a line filling the gutter sits on the artwork rather
  than the pale centre — the words poking out of the parchment.

  22rem was derived, not tuned. It cleared the deck's widest single
  phrase ("Transformation", 219px as rendered) so no phrase could break
  inside itself, and its widest two-phrase run ("Completion •
  Fulfillment") so the wrap stayed 2+1 rather than three stacked words.
  Above `lg` it is released and never binds: every line in the deck fit
  her single line there on its own.

  **Those two measurements predate the `uppercase` below and no longer
  hold.** They were taken with the deck's title-case and lower-case lines
  rendering as Cinzel small capitals; forcing full capitals widens every
  phrase, so both the widest single phrase and the widest two-phrase run
  are now wider than the numbers above. The cap itself is unchanged and
  still does its job — keeping the line off the painted border — but the
  clearances it was chosen for want re-measuring, and some lines that sat
  on one line below `lg` will now wrap.

  Previously verified in-browser across all 22 cards at
  360/440/520/768/1024/1440: no overflow, and no phrase wider than its
  box. That sweep needs redoing in full capitals.
*/
/*
  **`uppercase` rather than capitals in the copy**, for the reason the
  meta strip's value cell gives: the client asks this line to read in
  caps and the content is inconsistent about it. The deck ships four
  lines in full capitals (Magician, High Priestess, Hierophant, Hanged
  Man), two in lower case (Empress, Emperor) and sixteen in title case.

  **Cinzel is what makes that visible.** It is an all-capitals face with
  no true lower case — lowercase codepoints are drawn as small capitals —
  so the three casings render at three different glyph heights from one
  `font-size`. The client read that as three different font sizes across
  the Fool, the Magician and the Empress, and they were right to: the
  type size is identical at every width, the drawn height is not.

  Casing here means the rule holds for whatever case the remaining copy
  arrives in rather than relying on each entry being typed correctly in
  `card-content.ts` — the same argument, and the same fix, as `MetaStrip`.
*/
export function Keywords({ keywords }: { keywords: string }) {
  return (
    <p className="mx-auto max-w-[22rem] text-balance text-center font-serif text-card-lead uppercase leading-none tracking-[0.01em] text-card-ink lg:max-w-none">
      {keywords
        /*
          Split on the separator itself, not on `" • "`. The Emperor's line
          reads "authority •structure • leadership" — a missing space
          that ships verbatim at the client's instruction — and a
          space-delimited split would have left "authority •structure"
          welded into one unbreakable phrase.

          **Both separators, because she uses both**: `•` on the card frames
          and `·` on the suit frames. The join below is always `•`, so a suit
          renders in the same hand as a card.
        */
        .split(/[•·]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((phrase, index) => (
          <Fragment key={phrase}>
            {index > 0 && " • "}
            <span className="whitespace-nowrap">{phrase}</span>
          </Fragment>
        ))}
    </p>
  );
}
