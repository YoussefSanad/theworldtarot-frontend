# The Learn page

Built from the Figma frame `395:55`, but **the authority is the PSD export**,
`asset dump/learn/LEARN.png` (1920x3099). The PSD-to-Figma conversion is lossy
and moves text, so every line break, alignment and measurement on this page was
read off that PNG rather than off the node. Read
[`src/app/README.md`](../../app/README.md) first — the token system, the `.stack`
rule and the "no absolute positioning for layout" rule all apply here.

## Two cream bands, and what that costs

This is the only page on the site built from **alternating grounds**: night,
cream, night, cream. Two consequences follow, and both are deliberate.

**`<Section>` carries a background colour here for the first time.** That is the
split `Section`/`Container` already document — `Section` is full width and owns
the background, `Container` owns the measure — so the bands need no `w-screen`
trick and no negative margins. Nothing else changed to allow it.

**There is no `PageAtmosphere`.** Every other marketing page hangs its artwork on
one backdrop spanning the layout column; this page's sections each carry their
own ground, so there is nothing for an atmosphere to paint behind. The masthead
is therefore untouched too: the first band is the night hero, so the header sits
on dark as it does everywhere else, and none of the `:has()` machinery the light
card pages need is in play.

The ink on cream is `--color-ink`, the brand blue the header and footer already
use — not the card pages' pure black, which belongs to that page's own inversion.
Her navy line icons are drawn in this blue, so the type and the icons match.

## The artwork arrives composed

Everything in `asset dump/learn/` is finished. The three postcards carry their
own rotation, their rounded corners and the play glyph in their pixels; the
laptop carries its own darkness out to a transparent left edge, which is what
lets it dissolve into the night band instead of ending on a seam.

So **nothing in this folder rotates, crops, masks or tints an image**.
`PostcardFan` only translates its cards — a `rotate` there would tilt artwork
that is already tilted. If a card ever looks wrong, the fix is a new export, not
a transform.

The play glyphs are painted on, which is to say **they are not buttons**. The
courses do not exist yet. Nothing on this page plays, and the hero's button is
its one real action: it hands the visitor to the footer's signup, which is the
form this page would otherwise have to duplicate.

## There is no mobile mockup

Same situation as The World Tarot's own page: the client drew this frame at 1920
and nothing else, so the mobile reading was derived rather than followed. Type
and spacing are `clamp()`s and scale on their own, so `lg` and `sm` are spent
only where layout has to reflow:

- The hero and the Discover band go from two columns to one at `lg`.
- The laptop's right-edge bleed is desktop-only; below `lg` it sits inside the
  measure, since a photograph bleeding off a phone is just one with its subject
  cut off.
- The postcard fan drops to **one card** below `sm`, not three small ones. The
  overlap is what makes it a fan, and three cards in a phone-width column are
  three unreadable thumbnails.
- The four marks go 4 → 2 → 1; the three map icons go 3 → 1, skipping the two-up
  step that would strand a single card on its own row.

**There is no carousel on this page**, and that is a decision rather than an
omission: these are short icon-and-caption blocks that stack perfectly well, and
nothing in the design asks for swiping. If the client wants one after handover,
it is a small change then.

## Type on this page

**Every heading and every line of body copy is Gill Sans.** That is the page's
one typographic rule, checked against crops of all four bands rather than
assumed from one. Only the small caps — the eyebrow, the mark titles, the two
centred headings — are Cinzel (`font-serif`).

**The body copy is Gill Sans *Light*; the two big lines are Regular.** Measured
by stem width rather than by eye: the hero's lead sets 3px stems at 60px type,
while body copy sets 2px at 30px — proportionally much lighter. So every
paragraph and caption on the page carries `font-light`, and the lead and the
"Discover. Explore. Understand." heading do not.

This caught two mistakes worth recording, because the same trap is there for
the next person. `font-display` (Magically) is the site's usual heading face and
was the wrong reflex both times: her two big lines here are sans, not display.
And the sizes were short — her caps measure 42px on the lead and the heading,
which at Gill's ~0.70 cap ratio is 60px type (`text-h1`), and 21px on body copy,
which is 30px (`text-nav`).

## Her copy, and three corrections

The copy in `src/content/learn.ts` is transcribed from the PNG. Three
misspellings in her draft are corrected there — "cardt", "understading" and
"intuitve" — each noted at the line it belongs to so any can be put back if it
was deliberate. Her phrasing is otherwise untouched, including "one card a time",
which reads as a dropped "at" but scans as an echo of the hero's line.
