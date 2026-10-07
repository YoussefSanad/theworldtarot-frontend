# The suit reference pages

One page per suit — Cups, Pentacles, Swords, Wands — describing the suit rather than its cards.
Built from the client's four frames, each 1920x3237, which is the same frame the Major Arcana
card pages are drawn on.

## The emblem is in the parchment

The chalice, the coin pouch, the sword and the torch are **painted into each sheet**, not
layered over it. There is no emblem component and nothing to position; `suitPaper(slug)` returns
one image and that image carries the artwork.

What the page does instead is leave the emblem room. `SuitIntro` is the card page's two-column
arrangement with the first column empty — see the `aria-hidden` span in it — so the prose starts
where her frame starts it and the sheet's own painting shows through beside it. Everything below
that section runs the sheet's full measure and passes over the emblem where it extends: the
sword and the torch run most of the sheet's height, the chalice and the pouch stop in the upper
third.

## What is shared with the card pages, and what is not

**Shared, and a change to any of them lands on both page kinds:**

- `CardHeader` — the name and the green rule. Takes primitives, and its `eyebrow` is optional
  because a suit has no Roman numeral.
- `Keywords` — the keyword line. Splits on both `•` (her card frames) and `·` (her suit frames),
  and always joins with `•`.
- `LookFor` — the rule with words cut into it. Takes a `label`, which the suit pages set to
  "KEY THEMES"; the cut in the rule follows the label's length via `lookForGap`.
- `SpheresCarousel`, `ClosingSaying`, `Divider`, `.card-paper`, `.card-reading-ground` and the
  whole `--card-scale` measurement system.

**Deliberately not shared: `CardEssay`.** It looks like `SuitIntro` and is not. It draws the
*card tile* — the plaque with the name laid into it, the long-name rule for THE HIGH PRIESTESS,
the `xl` switch that puts the card beside the prose, the `25.1vw` cap that leaves the prose a
measure. A suit has no tile and no plaque, and its emblem bleeds off the sheet rather than
sitting in the column. Bending that component to cover both would mean a prop that switches off
most of what it does.

**Not used at all:** `AppearsPanel`, `ShadowPanel`, `MetaStrip`. A suit has no element, planet,
sign or yes/no, and no "when it appears in a reading" columns. None of her four frames draws
them.

## The sheets

Converted by `scripts/optimize-suit-assets.mjs`, which checks rather than transforms. Her
delivered sheets are ~1460x2850 — wider than a card's 1337, which costs nothing because
`.card-paper` is a box the image fills, so a sheet's width is only its aspect.

**All four must share that aspect**, and the script throws if one does not. This is not
hypothetical: her first export was trimmed to each layer's own bounds, which spread the widths
1084..1460 — a 33% spread of aspect ratios, which no CSS renders as one box undistorted — and
cut the torn right edge off three of the four. She re-exported on a fixed canvas and both faults
went away. If a suit sheet ever looks wrong in this layout, check its aspect before changing any
CSS.

The phone sheets are 390x3500, the same as the card pages', and need no new machinery.
