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

## The room below the button, and why her number is not spent in full

Her frame ends the last call to action at y=3032 of 3772, so **740px — 19.62% of
the page — is rotunda and nothing else.** This is the same "show as much of the
background as possible" that `world-tarot/README.md` records for the garden
path, and it is carried the same way: extra `pb-` on the page wrapper, on top of
what `ClosingSaying`'s own room-space already gives.

740/1920 = 38.54vw, and that is what the wrapper carried at first. **It reads as
a hole in the page**, which the client reported as too large a gap on desktop
and tablet.

The reason is the thing `world-tarot/README.md` says in passing and is worth
promoting here: **her frames draw neither a header nor a footer.** So 740px is
the air between the button and the bottom of her *artboard* — and the real page
then adds a 522px footer (at 1920) underneath it that she never drew. Spent
literally, the page ends on 740px of empty rotunda *and then* half a thousand
pixels of footer.

So this page departs from the frame where the World Tarot page does not, and the
departure is deliberate. The wrapper is tuned by eye against the rendered page
to about **290px between the button and the footer at 1920**. Two things
contribute to that gap besides this padding, and both have to come off before
the number is written down:

- **Half of `ClosingSaying`'s room-space box**, 94px at 1920. The box is
  `justify-center` with the button inside it, so it is air above *and* below —
  only half of it falls under the button. (The first attempt at this fix
  subtracted the whole box, which is the same mistake in the other direction.)
- **`SiteFooter`'s top margin**, 14px at its clamp maximum.

290 - 94 - 14 = 182px, and 182/1920 = **9.48vw**. **That is the knob** — move it,
not the closing block (which is shared with the readings pages) and not the
backdrop's sizing, which is width-driven.

Below `lg` nothing changes: the vw term only overtakes the `3rem` floor above
about 506px wide, so phones keep the padding they had, and the mobile page ends
on the room by the backdrop's floor anchor rather than by this padding.

The trim only became safe once the backdrop was re-exported. The old 1280x2515
crop ran out of photograph partway down a desktop page, so a shorter column
would have ended on bare colour; the 1920x3772 export is her frame at full
height, and the shorter column still ends on rotunda.

For reference, the rendered gap across the three pages that close this way:
`/library` 290px, `/world-tarot` 1017px (its frame's 904 spent in full, 26% of
the page), `/readings` 113px.

## The backdrop

`.page-atmosphere-library` is width-driven like every other backdrop on the
site, and above `lg` it hangs from the page's **top** edge — which is where it
parts from the parlour, the observatory and the path, all three of which stand
on the floor. The reason is that this photograph is **opaque to its own top
edge**: the dome and its clouds reach the top of the frame, so there is no
near-flat sky to dissolve into and a feather there would only fade the ceiling
out. The fade is spent on the bottom edge instead (`--room-sink`, below). It
takes no overhang at the top, which is where it parts from the path: the client
draws the room inside the frame. At the bottom it takes the path's own
`--path-drop` under the name `--room-drop`; see "The footer's margin was a gap,
not an edge" below.

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

There is no `overflow: clip` any more. A floor-anchored box capped at
`min(196.46vw, 100%)` cannot outrun a short page — the cap's second term is the
box itself — and the clip's real effect here was to eat `--room-drop`. The
document is kept from growing by `overflow-y-clip` on the layout column, which
is untouched.

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

The cause was a **colour seam**. The first crop's bottom edge averaged
`#1d242e`, and the page beneath it is `--color-night`, `#081525` — so ending the
image on a hard line butted a light grey-blue against a darker navy, and that
join read as a band clean across the page. (The client's re-export ends at about
`#0c121b` and no longer has this problem in the picture; the fade is kept
because it costs nothing and makes the edge safe against the next export.)

The fix is `--room-sink`: the last 18% of the image dissolves into the colour
under it rather than stopping on it, so there is no line to see at any page
height. It is the readings observatory's `--room-feather` upside down — that one
fades the *top* edge into the sky, this one fades the *bottom* edge into the
floor. The fade begins around y=3093 at 1920, which is past where the last
button ends (3032), so it lands on empty floor rather than over content.

**If a band ever appears again here, sample the artwork's edge colour against
the page colour before adjusting any geometry.**

### The footer's margin was a gap, not an edge

A band reported a second time, below `lg` and after the re-export — and *not*
the same fault, which is why the advice above did not find it. Sampling the
artwork's edge is the right first move and it came back clean: the new export
ends at about `#0c121b` against a `#081525` page, so there was no seam left to
see.

The band was not the artwork's edge at all. `SiteFooter` carries
`mt-[clamp(0.5rem,0.73vw,0.875rem)]`, and **a margin belongs to neither box** —
so between the backdrop's bottom and the footer's own scrim there is a strip of
the layout column with nothing painted in it, showing flat colour. No fade
covers that, because there is nothing there to fade; only reaching across it
does.

This is verbatim the World Tarot path's `--path-drop`, and it is carried here
under the name `--room-drop` (2rem — past the margin so the crossing is not
hairline-exact at any width, but not generous, because the surplus lands under a
scrim that is 77% rather than opaque). Two notes:

- It goes on the **mobile** rule's bottom inset. Above `lg` the room hangs from
  the top and has already faded into the page colour long before the footer, so
  there is nothing there to reach with.
- **It cost the parent its `overflow: clip`**, and that is the same trap the
  World Tarot block records: a clip on the element cuts off exactly the overhang
  the drop creates, so the band survives and no value ever appears to work.

So the page now has two different bands on its record, with two different cures:
an *edge* (cure: fade it, `--room-sink`) and a *gap* (cure: reach across it,
`--room-drop`). Check which one you have before reaching for either.

**The artwork came from the composed frame, not from Figma's raw fills**, and
this is the World Tarot README's warning repeating itself. `download_assets` on
the BACKGROUND node returns three raw images: a 1920x3772 one that is exactly
frame-sized and is a **flat navy plate**, a 2029x4096 one that is the rotunda
**undarkened** — hazy and white, because the client darkens it with layer
blending in the PSD — and a 240x472 thumbnail. None is what the page shows. The
node's own *render* is, and that is what `public/figma/library-rotunda.webp` is
cropped from. Check a raw image's pixels against what the frame actually looks
like before shipping it.

## The client's revision round (LIBRARY.FEEDBACK.pdf)

Four of her notes land on this page, and three of them undo something that was
built deliberately. That is the point of recording them here: each was a
considered decision, and each is now overruled by the person whose page it is.

**The suit navigation rides `--text-nav`, not a flat `vw` of its own.** She
asked for it "much smaller … see the PSD for the intended size", and the
ceiling was never wrong — both it and the tagline above it top out at the 30px
she draws. The *slope* differed: `3.1vw` reached 30px at about 968px of
viewport and then sat there, while `--text-nav`'s `1.5625vw` does not arrive
until 1920. Between those widths the nav was the only line in the masthead
still at full size — 30px beside a 22.5px tagline at 1440. **A clamp that
agrees with the drawing at 1920 can still be wrong at every width below it;
match the ramp, not just the maximum.**

**The plaque type fills the brass now.** "Much, much larger so they're easy to
read", for the second time. The plaque is 42% of the card (x=188..456 of 640,
measured off the delivered art) and `2.62cqw` was her own mockup's size, at
which the longest name occupies about a third of the card's width. It was
faithful to her lettering, and her lettering was never sized to be read at grid
scale. `3.05cqw` puts "THE HIGH PRIEST" hard against the rivets, which is as
far as the geometry goes — the rest of the legibility had to come from the
cards being drawn larger, which the mobile grid change below supplies.

**The deck is a grid at every width.** It was a swipeable carousel below `40rem`
(and one column below `30rem`), on the reasoning that twenty-two full-height
cards is four screens of scrolling on a phone. She asked for it gone by name:
"keep the responsive grid with two columns, rather than a horizontal carousel.
No horizontal scrolling." So `MajorArcanaCarousel` is deleted, `MajorArcanaGrid`
is a plain `<ul>` that needs no client JavaScript at all, and `< 64rem`'s two
columns simply carry on down. The page is long on a phone; that is the trade she
has chosen, and it should not be re-solved with a carousel.

**The closing line is champagne.** She called it "the wrong color — please match
it to the corresponding text on the other pages", and she is right about which
way round it was: World Tarot and a reading's own page both close in
`--color-champagne`, and only this page and the readings index closed in gold.
So this joins the majority rather than the frame it was copied from.

She later gave the same note on the readings index, which was the last gold
holdout. **Champagne is now `ClosingSaying`'s default** rather than something
each page asks for; see that component for the current rule.

Two notes in that PDF are **not** implemented here and remain open: the
**background replacement** (she has supplied a toned-down rotunda so the artwork
competes less with the cards — `asset dump/LIBRARY_BACKGROUND.REPLACEMENT.jpg.zip`,
which needs the `library-rotunda.webp` pipeline above run over it), and the
**Love/Career/Money card height** reduction of 15–20%, which is the homepage's
and not this page's.
