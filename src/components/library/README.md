# The Library

The Library page (Figma `344:98`, "LIBRARY_09_05", 1920x3772), built 9 September
2026. Read [`src/app/README.md`](../../app/README.md) first — the token system,
the `.stack` rule and the "no absolute positioning for layout" rule all apply
here. The plan this was built from is
[`docs/plans/library-page.md`](../../../docs/plans/library-page.md).

**The grid is the Library's default view, not a landing page in front of one.**
The masthead nav's LIBRARY lands on the cards; MAJOR ARCANA in the suit
navigation is the way back to them from a suit page, which is why it points at
`/library/` rather than at a section.

## The artwork is the whole card, plaque included

This is the thing most likely to be mis-assumed here, because it is the opposite
of how the Readings panels work. The client's delivery (`asset dump/readings
page/NO PLAQUE NAME LARGER IMAGES FOR LIBRARY CARDS/`) ships each card as a
complete unit: gold border, the roundel holding the Roman numeral, and the
riveted plaque along the bottom — with **the plaque empty**. Her folder name is
the brief.

So nothing here rebuilds chrome from tokens. There is one image and one line of
text laid into the plaque it already draws. If you find yourself writing CSS for
a bevel or a rivet, look at the image first.

The name is HTML rather than baked in because her earlier baked-in version was
not sharp enough to read, and because a picture of a word is invisible to
search, selection and translation.

## The name is a stack cell, and once was not

The first build rendered every plaque empty while the names sat correctly in the
HTML — worth recording, because the markup looked right and the bug was entirely
in the CSS.

The overlay was `position: absolute` inside `.stack`. But `.stack` is
`display: grid` and sets no `position`, so it establishes no containing block:
each name resolved against the nearest positioned ancestor — the page — and was
laid out far from the card it belonged to. `src/app/README.md` states the rule
that would have avoided it: **reach for `.stack` before `position: absolute`**,
and no element on this site is absolutely positioned for layout.

It is now a second cell in the same stack, so it *is* the card's box, and the
plaque is found by pushing the line to the bottom with the plaque's own height.
Two numbers do it, both shares of the card's height: the plaque's bottom edge is
1.18% up from the card's, and the plaque is 4.72% tall.

**One of them is in `cqw` and that is deliberate.** A percentage padding
resolves against the *inline* size on every side, so `padding-block-end: 1.18%`
would be a share of the width — 2.4px where 4px is wanted. Converted through the
card's aspect (1.18% x 2120/1280) it becomes `1.954cqw`, which lands the text
box on the plaque to within 0.00px and stays there at any card size. The text
box's own `height: 4.72%` needs no such correction, because percentage *heights*
do resolve against the parent's height.

## The plaque's geometry, and why it is a constant

Measured off the delivered 1280x2120 files, identical on all twenty-two:

| Plaque edge | Fraction of the card |
|---|---|
| left / right | 29.38% / 70.55% — 41.17% wide, centred |
| top / bottom | 94.10% / 98.82% — 4.72% tall |

Because it is a fixed *fraction*, the percentages in `TarotCardTile` hold at
every rendered size and the tile never needs to know how big it has been drawn.
This is why `scripts/optimize-library-cards.mjs` **asserts the source
dimensions**: a re-cut at another size would slide the plaque out from under the
name, and the failure would be silent and per-card. If the client re-delivers
the art, that assertion is the thing that tells you to re-measure.

## The plaque is small, and one name does not fit

At Figma's 205px card the plaque interior is about 84x16px. Her own mockup
letters the plaques, so the size is not a guess: "THE HIGH PRIEST" — the longest
name she set herself — fills about 85% of the interior at roughly 7.4px type,
which is `2.62cqw` of the card.

Measured against that, exactly one name in the deck overruns:

| Name | Against the plaque interior |
|---|---|
| DEATH | 31% |
| THE FOOL | 46% |
| THE HIGH PRIEST | 85% — her own reference |
| **THE HIGH PRIESTESS** | **103% — the only overflow** |

`.library-card__name--long` closes the gap, and `TarotCardTile` applies it by
name length (over fifteen characters) rather than by naming a card in CSS.

**The names are set bold**, which is what makes the rule do two things rather
than one. Cinzel loads as a variable face with a `400 900` axis, so 700 is a
real weight and not a smear, and it earns its place: the plaque prints at about
7.4px on a 1920px frame, below where small caps stay comfortable, and the extra
stem weight is what keeps the engraving off the gold.

It also costs 3-5% of width, on the one name that had already overrun by 3. So
the rule spends tracking first — `-0.03em`, about as tight as this face takes
before the capitals cramp, recovering roughly 5% — and takes the remainder off
the size, `2.52cqw` against the row's `2.62cqw`. That lands it near 97-99% of
the plaque. **The split is the point**: 4% of size is imperceptible beside a
neighbouring plaque, where the further 0.04em of negative tracking it would
otherwise need is not. Only the longest name in the deck is touched at all.

What none of that fixes is that 7.4px is below the size small caps stay
comfortable at. The lever for it is *above* 1920px, where the rest of the site's
content stops growing and these cards do not — so on a large display the names
become genuinely legible. That is additive: at 1920 the frame is matched exactly
and `check:measure` is unaffected.

## The names are hers, with her typos fixed

`content/library.ts` holds them, and the rule applied is **fix outright
misspellings, keep deck-specific naming**: `THE EMPORER` and `THE HANGMAN` are
corrected; `THE HIGH PRIEST` (not Hierophant), `THE WHEEL` (not Wheel of
Fortune) and `JUDGEMENT` are hers and are kept. An official list from her later
lands in that one array.

**Her mockup's grid order has a slip and is not followed.** Her first row runs
The Fool, The Magician, *The Tower*, The Empress — The Tower in the slot
belonging to The High Priestess, and again in its own place at XVI. Figma's own
layer names disagree with her pixels there (the layer in that slot is `II - THE
HIGH PRIESTESS`), so it is a stray layer rather than an instruction. The grid
runs 0 through XXI.

## The images had to be re-encoded, and this is not optional

`next.config.mjs` sets `images.unoptimized: true` — the export is static and
Next's optimiser never runs, so **whatever is referenced ships byte for byte**.
Her twenty-two files are 1-2.4MB each, 35.4MB across the deck, to be drawn a few
hundred pixels wide.

`scripts/optimize-library-cards.mjs` converts them to 640x1060 webp in
`public/figma/library-cards/` — 1.9MB for the set, a 95% saving. Unlike the
gitignored `assets:optimize` pipeline (see [`scripts/README.md`](../../../scripts/README.md))
this one needs no credentials and is committed; re-running it is the documented
way to redo the conversion. The sources stay in `asset dump/`, not in `public/`,
because everything under `public/` is deployed.

## What is deliberately unfinished

The twenty-two card pages and the four suit pages are **placeholders**, and
`ComingSoonPage` is a statement that the content does not exist yet rather than
a template for what will:

- The Fool's page is the confirmed template for all twenty-two Major Arcana and
  has its own issue. The other twenty-one are waiting on the client for artwork
  and text.
- Each suit gets **one** page describing the suit — not a page per card — and
  each is to have its own design rather than share a template. None have been
  drawn.

They were still worth routing: the grid links to twenty-two cards and the
navigation to four suits, and a page that answers beats a 404 while she writes
them. They keep the masthead and the suit navigation so a visitor who lands
there is still somewhere and can leave the way they came.

The four suit routes are their own directories rather than another dynamic
segment — static segments beat `[card]` in Next's matching, which is what stops
`/library/swords/` resolving as a card named "swords".

## The active state is an addition

Figma draws no current-section state, because a static mockup has none to draw.
`SuitNav` adds one — full-strength gold plus a glow against dimmed siblings, and
`aria-current` in the markup so it never rests on colour alone. This is the same
kind of deliberate addition as the mobile menu button and the carousel dots
(`src/app/README.md`), not a departure from the frame.

The pipes between the items are drawn in CSS rather than typed into the markup,
so they are never read aloud and never land inside a link's own text.

## Reused rather than rebuilt

`ClosingSaying` already takes the 538px rule this frame draws (`heroWide`, added
for World Tarot) and the gold tone the readings index uses, so the Library's
closing block is a call with this page's words rather than a fifth copy of it.
GET MY READING goes to `/readings/` because this page sells nothing itself —
the rule `content/site.ts` sets for the whole site.

## The masthead type is smaller than the site's usual

Worth stating because the first build got it wrong and the symptom pointed at
the wrong thing: the cards looked undersized, when what was actually oversized
was the type above them.

Her frame sets this page's title at **45px** and its tagline at **30px**,
against `text-h1`'s 60 and `text-h3`'s 42. Taking the site defaults made the
masthead overpower a 205px card. The cards were right the whole time — 207.5px
rendered against her 205px — so the fix is those two sizes, set explicitly.

## The masthead shares the grid's measure

**The masthead and the cards are one column in her frame**, and this is the
thing to hold on to: the intro block is 838px at x=539, the cards 914px at
x=499, both centred — within 76px of each other, reading as the same width.

So the intro takes `--container-library`, the grid's own 914px, rather than the
1153px `measure` the other pages' intros use. That measure is ~240px wider than
the cards and makes the masthead visibly overhang the grid.

Two wrong answers were tried first, and both are worth knowing about:

- **1153px**, the site's usual intro measure. The nav fits, but the masthead
  sprawls past the cards — it is what made the grid look undersized when the
  cards were correct all along.
- **838px**, the intro block's own bounding box. Too tight: that box is where
  her *text happens to land*, not a measure she imposes, and the suit navigation
  needs 797px of it. 41px of slack is nothing, and the nav folded to two lines.

914px is the one that satisfies both — 117px of slack for the nav, and a
masthead the same width as the cards under it.

### Two lines in this masthead must not wrap, and they set its width

Both are single lines in her frame, and between them they decide how narrow this
column may be. Check both before changing it:

| Line | Width at 30px | Slack in 914px |
|---|---|---|
| the suit navigation | 797px (Figma's own measurement) | 117px |
| `Explore the imagery, stories, and wisdom woven through the Tarot` | ~890px | ~27px |

The blurb is the binding one, at about 97% of the column. Two dozen pixels is
too fine to leave to a font's rounding, so it does not rely on the margin being
right: **it scales on the same `vw` ramp as the column it sits in**
(`min(1.5625vw, 1.875rem)` against the measure's `min(914px, 47.604vw)`), so the
ratio is constant and a fit at one width is a fit at every width above `lg`.
Both cap at 1920, so it holds on ultrawide too.

The flat `3.2vw` clamp it started with is the trap to avoid: it reaches its 30px
maximum at about 938px of viewport while the column keeps shrinking below that,
so the line and its box stop moving together and an unwrappable line is pushed
out of its column. If this copy ever changes, re-check it at `lg` as well as at
1920 — the failure shows up at the narrow end, not the wide one.

## The room below the button is the client's, and it is measured

Her frame ends the last call to action at y=3032 of 3772, so **740px — 19.62% of
the page — is rotunda and nothing else.** This is the same "show as much of the
background as possible" that `world-tarot/README.md` records for the garden
path, and it is carried the same way: extra `pb-` on the page wrapper, on top of
what `ClosingSaying`'s own room-space already gives.

740/1920 = 38.54vw, and that padding is the number to move if she wants more of
it or less — not the backdrop's sizing, which is width-driven.

## The backdrop

`.page-atmosphere-library` is width-driven like every other backdrop on the
site, and above `lg` it hangs from the page's **top** edge — which is where it
parts from the parlour, the observatory and the path, all three of which stand
on the floor. The reason is that this photograph is **opaque to its own top
edge**: the dome and its clouds reach the top of the frame, so there is no
near-flat sky to dissolve into and a feather there would only fade the ceiling
out. The fade is spent on the bottom edge instead (`--room-sink`, below). It
keeps `overflow: clip` and takes no overhang, which is where it parts from the
path: the client draws the room inside the frame.

### Below `lg` the room turns over, and a sky opens above it

The top anchor is right at 1920, where the room's 196.46vw covers all but the
last fifth of the frame. It inverts the page on a phone: the same width-driven
scale puts the room's 737px at 375 at the *top* of a page several thousand
pixels long, so the dome sits behind the intro copy, the whole Major Arcana grid
scrolls over flat colour, and the page ends on empty `--color-night` under the
closing button — the exact opposite of the frame, where the room is what the
page ends on.

So below `lg` the artwork is re-anchored to the floor and the readings index's
mobile sky takes the top edge it vacates. Three declarations change and nothing
else does — same asset, same `cover`, same `block-size` cap, so the room is
neither rescaled nor cropped differently:

| | `lg`+ | below `lg` |
| --- | --- | --- |
| `background-position` | `center top` | `center bottom` |
| `inset` | `0 0 auto 0` | `auto 0 0 0` |
| mask | `--room-sink`, bottom edge out | `--room-feather` 12%, top edge out |

The mask is the half worth understanding. `--room-sink` fades the *bottom*
edge, and that is exactly what must not happen once the room stands on the
floor — that edge is what it stands on, and fading it would hollow the room out
from underneath. It is replaced by the parlour's own top feather, the dome
dissolving up into the sky above it. (`--room-sink` is still inherited below
`lg`, but the mask that read it is gone, so it is inert there.)

`overflow: clip` is kept from the desktop rule and is now doing the parlour's
job rather than nothing: a floor-anchored box capped at `min(196.46vw, 100%)`
can run taller than a short page.

The sky itself is the readings index's layer verbatim — the client's 375x850
night sky at its own scale, fading downwards. It keeps its own scale rather than
stretching to meet the room; see the readings index's "mobile sky" note in
globals.css for why. `LibraryPage` carries `max-lg:-top-20` on the atmosphere
for the same reason the readings index does: the sky hangs from a box that
starts under a transparent masthead, and flush it would open on a hard
horizontal edge at the header's bottom.

### The flat band above the footer was an edge, not a height

Reported after the first build: a thin flat strip where the artwork stopped,
above the footer's own dark pane. The instinct is to reach for the layer's
height or its position; both were fine.

The cause was a **colour seam**. The rotunda's own bottom edge averages
`#1d242e`, and the page beneath it is `--color-night`, `#081525` — so ending the
image on a hard line butted a light grey-blue against a darker navy, and that
join read as a band clean across the page.

The fix is `--room-sink`: the last 18% of the image dissolves into the colour
under it rather than stopping on it, so there is no line to see at any page
height. It is the readings observatory's `--room-feather` upside down — that one
fades the *top* edge into the sky, this one fades the *bottom* edge into the
floor. The fade begins around y=3093 at 1920, which is past where the last
button ends (3032), so it lands on empty floor rather than over content.

**If a band ever appears again here, sample the artwork's edge colour against
the page colour before adjusting any geometry.**

**The artwork came from the composed frame, not from Figma's raw fills**, and
this is the World Tarot README's warning repeating itself. `download_assets` on
the BACKGROUND node returns three raw images: a 1920x3772 one that is exactly
frame-sized and is a **flat navy plate**, a 2029x4096 one that is the rotunda
**undarkened** — hazy and white, because the client darkens it with layer
blending in the PSD — and a 240x472 thumbnail. None is what the page shows. The
node's own *render* is, and that is what `public/figma/library-rotunda.webp` is
cropped from. Check a raw image's pixels against what the frame actually looks
like before shipping it.
