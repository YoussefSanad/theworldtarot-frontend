# The Readings page

Built from **two** Figma frames, because the client drew two mockups:
`300:68` (`READINGS_08_05_FIXED (2)`, 1920x3293) and `311:324`
(`READINGS OVERVIEW PAGE MOBILE MOCKUP`, 375x1603). Both convert from PSDs in
`asset dump/readings page/`. Route: `src/app/(site)/readings/page.tsx`. Copy
lives in [`src/content/readings.ts`](../../content/readings.ts).

**`lg` (1024px) is the seam between the two designs** — one breakpoint for the
whole page, rather than a different one per component. Above it the desktop
frame, below it the mobile mockup.

Read [`src/app/README.md`](../../app/README.md) first — the token system, the
`.stack` rule and the "no absolute positioning for layout" rule all apply here.
This file only covers what is specific to this page.

## What the frame is, and what it isn't

The conversion is lossy in a way that matters when you compare this code to
the frame side by side. Every text node is a free-floating absolute box, so
**things Figma reports as centred usually aren't.** In the signature panel's
right-hand column the title, rule, body and button centre on four different
axes 84px apart; each reading card's rule sits 4px off its own card; the
"Traditional Tarot Readings" heading centres 33px left of the page while its
standfirst centres on it. None of that is a design decision — it is a PSD
flattened into boxes. **Everything on this page centres on its column.** Don't
"restore" the offsets.

The same goes for the overlaps: the frame has a reading card's body copy
running through its own button, and the gift panel's copy running past the
frame's bottom edge. Those are text boxes sized with leading, not overlapping
elements; the flow layout here resolves them.

Two spellings are corrected against the frame — Figma reads "wirtten" and
"interpratation" in the Traditional Tarot Readings standfirst. Typos in the
PSD, fixed in `readings.ts`.

## The panels

Figma exports each bordered panel as a bitmap — 482x775 for a reading card,
1493x479 for the signature panel, 1191x261 for the gift band. **None of those
are used.** All three are a 2px `--color-gold` rounded rectangle and nothing
else, and a bitmap of a hairline can't survive being scaled to a responsive
box, nor follow a card that grows when its copy wraps to a third line. The
rectangle is rebuilt from tokens, the way the gold buttons already are; only
the diamond ornaments ship as artwork, cropped out of those same exports.

[`components/ui/OrnateFrame.tsx`](../ui/OrnateFrame.tsx) is the markup half and
the "Framed panels" block in `globals.css` is the CSS half. Three things there
are load-bearing.

### A panel clips what it holds

Figma rounds each photograph's frame-facing corners in its alpha channel.
That cannot stay in register with the border: a baked curve is fixed in image
pixels and scales with the photo, while the frame's radius is set by the
panel, so the two only agree at one width and open a wedge of backdrop at the
corner everywhere else — which is exactly what it did. **The photographs now
ship opaque and square, and the frame clips them to its own curve.** One
source for that curve, so it can't disagree with itself.

`scripts/`'s asset pipeline is gone (see [`../../scripts/README.md`](../../scripts/README.md)),
so the flattening was done as a one-off: crop each export to its largest
fully-opaque rect, scale that back to full size as a base layer, lay the
original over it, drop the alpha. Figma puts black under the mask, so simply
removing the channel would have exposed black corners; only the corners ever
come from the base layer, and a stretched dark corner of the same photograph
is indistinguishable there.

The corollary is that **a photograph inside a panel has to fill its box.**
Left at its natural aspect the signature and gift photos come up a few pixels
short of the copy beside them, which reopens a band of backdrop along the
border. Both stretch to their row and take `object-fit: cover`.

The crest astride a card's top edge lives outside the frame for that reason —
a panel clips what it holds, and the crest is the one mark meant to escape, so
it shares a `.stack` cell with the whole panel. It also carries an explicit
`z-index`: sitting later in the stack is not enough, because the photograph
beneath it brightens on hover and a filter gets that image promoted to its own
compositing layer mid-transition, at which point it paints over a sibling
whose order was only implicit and the crest disappears under the picture.

### Radii are container-relative

`10.37cqw` on a card is the 50px Figma drew at 482px. It's a proportion rather
than a fixed corner so a card that's half that width on a phone doesn't keep a
desktop radius. That's also why the radius can't live on the panel itself — an
element can't query the container it establishes — hence the `@container`
wrapper every panel carries. Anything inside a panel can size off that same
container, which is what the reading cards do with their type.

### The signature panel's open top edge

Three columns and a **first row with no height at all**. That zero-height row
*is* the top edge: a heading placed in it with `align-self: center` straddles
the line exactly as Figma draws it, and the middle column is the gap — so it
is the heading's own width that opens the border, with no measurement to keep
in sync as the type scales or the words wrap.

Both edge pieces span the panel's full height, and that is the whole point.
The obvious construction was tried first and is worth not repeating: rules
that carry the corners *inside the heading row*, and a body that carries the
sides. It breaks visibly, because the corner arc reaches a radius below the
line while the body's straight side border starts only half a heading below
it — the two cross and leave a lens-shaped nick in every corner. Here no arc
is ever met by a border that began somewhere else.

The heading's lower half hangs into the panel, which is what putting a heading
on a border means; the body's top padding is the room the artwork needs to
clear it (half a line of the legend's own type — 24px against Figma's 18px at
the frame's width, and unlike a fixed 18px still correct when the type
scales).

**Below `sm` the heading comes off the border entirely** and sits above a
panel that becomes an ordinary closed frame. A heading set into a border needs
room either side of it for the rule to read as a rule; by 640px the panel is
about 600px and this heading is 365px of it at the type's floor, so what's
left are stubs, and below about 490px it wraps and hangs into the artwork.
Moving it out keeps the ornaments bracketing the words — the part that carries
the design — and hands the frame back an unbroken top edge.

## The two designs

The mobile mockup is not a narrower desktop. Each panel turns on its side:

| | Desktop (`lg`+) | Mobile |
| --- | --- | --- |
| Reading card | photograph on top, copy under it, price inside the border | photograph left, copy right, **price outside the border**, full width beneath |
| Signature panel | photograph left, price under the copy | identical, except the price steps outside the border |
| Section heading | "Traditional Tarot Readings" and its standfirst | **absent** — five panels run as one uninterrupted list |
| Card titles | "Month Ahead Reading", "In-Depth Reading" | shortened to "Month Ahead", "In-Depth" so they hold one line |
| Gift band | title, small caps, rule, copy — no crest | title, **rule, small caps** — and it grows a crest |
| Descriptive copy | shown | dropped on the reading cards and the gift band — a 169px column in a 135px frame has no room, and the client cut it. **Kept on the signature panel**, which she keeps |
| Photograph edge | dissolves downwards | dissolves rightwards |
| Backdrop | the room behind the whole page | the room in the bottom third, flat above it |

The button moving out of the frame is the structural one. A border can only
wrap what it contains, so the border is **its own grid item** rather than a box
around the content: it spans the price at one width and stops short of it at
another. One link, one button, one set of copy at both — nothing is rendered
twice and hidden.

The signature panel is the same problem with an open top edge in the way, and
it is solved rather than dodged. Below `lg` **both** wrappers dissolve —
`display: contents` on `OrnateFrame`'s body and on the panel's own row — so
media, copy and price all land as items of the panel's grid, where the price
gets a row the border doesn't span. The grid grows two column lines to make
that possible: the photograph's edge at 45.8% and the border's gap at 9% and
91.2% are all lines in one template, so it can place the top edge's three
pieces and the row of content beneath them at once. Above `lg` the columns go
back to `1fr auto 1fr` and the gap is the heading's own width again.

Three things there are easy to get wrong.

The legend's font size has to be set as a *utility* on the element, not in the
stylesheet — a Tailwind utility outranks the components layer, so a
`font-size` on `.ornate-legend` is silently discarded. And it has to be a
responsive pair: `--text-h2`'s 24px floor is wider than the gap the border
opens on a phone, and the heading wraps to four lines and hangs out of the
panel.

The border runs through the heading's **first line**, not through the middle of
the block. Those are the same thing while the heading is one line and the
difference between right and wrong once it wraps to two, so the legend hangs
from the line and is pulled back half a line rather than being centred on it.

The marks bracket the heading's **first line**, and on a phone that heading
wraps — so they are not siblings of the heading, they live *inside* the first
phrase. As a sibling of the block a mark sits out at the width of the longest
line, which on this heading is the second one, leaving it floating ~16px clear
of the words above it instead of hugging them. At `lg` the two phrases share a
line and the block *is* the first line, so the desktop pair goes back to being
a sibling; each placement only ever needs one of the two crops.

**The border has to reach them**, and how it does that differs by width. Above
`lg` the gap between the edge pieces is a grid column sized by the legend
itself, so it meets the marks with nothing in between — measured at 0.0px. Down
here the columns are already carrying the photograph's edge, so the gap is a
fixed share of the panel and the heading floats inside it; two `flex: 1` rules
inside the legend fill from the column edge in to whatever the heading leaves,
which lands them on the marks.

That only works if the heading can shrink to its own lines, which means its
phrases go **block** below `lg` and inline above. Inline, the heading's
max-content is both phrases on one line — wider than the panel, so it fills
whatever it is given and the rules get nothing. It was this that left the
border stopping 22px clear of the marks.

Vertically they hang from the first line rather than centring on the row, and
both they and the border are placed off a single number,
`--ornate-legend-lift`. Half a line looks like the right value for it and is
not: that centres the border on the first line's *line box*, and Cinzel's
capitals ride high in theirs, which lands the rule three pixels under the
middle of the letters at 18px where she runs it through them. 0.383em is half
a line less that offset — measured off the rendered type, because this face
ships two disagreeing metric sets and the font tables can't be asked.

And the mobile type is smaller than this project's global floors in three
places — the intro standfirst is 12px in her mockup against a 17px `--text-body`
floor, the panel title 24px against a 28px floor, and the panel's button 18px
against 14px. Those are set as responsive pairs on the elements. **The 12px
standfirst is below the usual 16px readability floor** and is there because the
mockup asks for it; it is the first thing to revisit if it reads too small on a
real handset.

## Where the lines break

The client is specific about it, and the two frames disagree on purpose — a
tagline set on one desktop line becomes two mobile lines broken at a point she
chose, not wherever the measure ran out. Copy is therefore stored the way each
frame structures it, never as finished lines:

- Short copy is a list of *phrases* rendered by
  [`<Phrase>`](../ui/Phrase.tsx): each is an `inline-block` joined by ordinary
  spaces, so the browser sets them on one line while they fit and breaks
  *between* them when they don't — never inside one. One copy of the words, no
  breakpoint, and the breaks land exactly where the frames draw them.
- A paragraph that wraps to its measure in both frames is one string, left to
  wrap, with a `max-width` matching the box Figma sets it in. The card bodies
  and the page standfirst are like this: the frame draws no break in any of
  them, and freezing their rendered desktop lines into every width was the bug
  this replaced.

The one hard break on the page is the intro's, which Figma really does set as
two paragraphs — broken mid-sentence before "traditional" so the desktop
measure lands on three even lines.

The reading-card copy is worth a note, because setting it to the measure Figma
boxes it in (407, 381, 421px) *very nearly* works and is a trap. Our Gill Sans
renders a shade wider than the PSD's, and reproducing her three-card break
needs a width between 411 and 418px — a seven-pixel window on a 482px card that
any change of font fallback would slide out of. Phrases state the breaks
instead of computing them.

Two more places the frames differ, both handled without a second copy of the
text: the mobile card titles drop "Reading", stored as a `titleTail` the
desktop adds back rather than two titles; and the "Traditional Tarot Readings"
heading is `sr-only` below `lg` rather than deleted, because dropping it
outright would leave three `h3` cards hanging off the page's `h1` with nothing
to group them — a document-outline problem her mockup has no way to show.

## The photographs dissolve

The client's PSD fades each photograph into the panel along the edge where it
meets the copy; the Figma conversion drops it and leaves the artwork cut off on
a hard line. `.photo-fade` puts it back, and the direction is a custom property
so it can follow the layout — down when the copy is under the picture,
sideways when the copy is beside it.

**How far it runs is measured, not guessed.** Differencing the client's own
flattened PSD render against the Figma export, row by row, puts the divergence
flat until 94% and spiking over the last few percent — on the signature panel's
right edge it starts at 95%. So this is a soft edge, not a long dissolve;
`--photo-fade-solid` is the one number to turn if it wants to be softer.

It has to be a **mask**, and both of the obvious alternatives are wrong:

- A gradient laid over the top would fade to a *colour*, and a panel has no
  fill — the parlour shows through it. In the client's own render you can see
  the room through the dissolving edge of the wood. Fading to a colour paints a
  band that isn't there.
- Alpha baked into the webp can't hold two directions, and the direction
  changes with the layout.

### The mobile measure is doing more than margin

`--measure-readings` is 81.33% below `lg` — the 305 of 375 her mockup insets
every panel to — where the page gutter's floor alone would leave 335. That
30px is not just whitespace. The cards size their type and insets in `cqw`, so
a card 10% too wide renders every word in it 10% too large: the button label
came out at 19.8px against the 18px she sets, the title at 26px against 24.
Narrowing the measure put all of it back on her numbers without touching a
single type value, which is the point of sizing a card off its own box. If a
panel ever reads as mistyped on a phone, check its width before its font.

### One trap worth naming

`.divider--hero` carries a `max-width` — the 448px Figma draws that rule at.
Clearing it with `max-w-none` looks harmless and isn't: the rule is
aspect-sized, so freed of the cap it stretches to its column and grows *taller*
with it. In the signature panel's 812px column that rendered a 55px rule at
90px, which reads as too much air around it rather than as an oversized rule.
Any `max-w-none` on a divider needs an `lg:max-w-(--measure-flourish)` beside
it if the desktop column is wider than 448px.

## The reading cards

`ReadingCard` is sized entirely in `cqw` off its own box, exactly as
`ProductCard` is on the homepage and for the same reason: it holds the
proportions Figma drew at 482px whether it's one of three columns or the only
thing on a phone. Every number in that file is a Figma measurement over 482 —
48px of type is 9.96cqw, the 25px under the photograph is 5.19cqw.

Two departures. The price button takes `mt-auto` on top of the copy's own
bottom margin: Figma puts a flat 34px above it, which works only because all
three cards are drawn with the same amount of copy, and they don't have the
same amount of copy. Three buttons finishing at three different heights is
worse than one seam absorbing the slack. The 34px stays on the copy because
`auto` resolves to nothing when there's no free space to absorb — a one-up
card on a phone would otherwise run its copy into the price.

The small-caps subtitle is set 0.05em tight and `nowrap` on all three cards.
Figma squeezes only the longest of them ("discover what lies ahead") to hold
one line; the row reads better with one setting across it, and the difference
on the short two is a pixel. `nowrap` is safe because the type is `cqw` — what
fits at 482px fits at every width, since both sides of that comparison scale
together.

## What is reused, and what is new

Reused rather than re-exported, after checking the pixels:

- **Every 448x55 rule on this page is `divider-hero.webp`**, already in the
  repo. Figma exports it six separate times (`DIVIDER FRAME 1`-`5`, both
  bottom-saying rules) and all six are byte-identical to each other and
  pixel-identical to the existing asset. The masthead's 538x66 `TOP DIVIDER`
  is the same art again at 120%, so `divider--hero-wide` changes the measure,
  not the image.
- **Every colour** already had a token: the frame borders are `--color-gold`,
  the titles `--color-cream`, the standfirsts `--color-champagne`, the button
  ink `--color-ink-deep`.
- **Every gold button** is `.btn-gold`; Figma's button bitmaps go unused, as
  on the homepage.
- **The backdrop's flat base layer** is a solid `#0a1421`, which is exactly
  `--color-ink` — so it ships as a background colour rather than a second
  1920x3293 export.
- **The photographs' alpha channels**, which did nothing but round the corners
  the frame now clips (plus a pixel of antialiasing) — dropped, which is why
  they ship opaque.

New: three type steps (`--text-h1-sm` 56px, `--text-h2-lg` 50px,
`--text-h2-md` 48px — the design sets all three against each other on one
screen, so they aren't merged into one), two measures, the parlour backdrop,
five photographs and five ornament crops.

**Five, not three, because her two frames draw the same ornaments at different
proportions** — the trio is 36x33 on the desktop card and 26x16 on the mobile
one; the pair bracketing the signature heading is 26x56 against 15x19. Scaling
one to the other's box gives the wrong mark rather than a smaller one, so both
crops ship and the markup switches at `lg`. They are 0.4KB each.

## The backdrop

`.page-atmosphere-readings` is the parlour photograph at 66%, baked into the
webp's alpha the way the homepage's layers are, over `--color-ink`.

The artwork **stands on the floor of the page and dissolves into the flat
colour at the top**, which is what the mobile mockup draws: the room in the
bottom third of a 375px screen, flat above it. That one rule reads correctly at
every width — the only thing the viewport changes is how far up the page the
room reaches. It is width-driven rather than `cover`-to-fill, because filling a
page three times taller than the frame means cropping the room down to a
vertical slice; nothing is cropped horizontally here and no edge is ever cut,
since the feather is on the only edge that can meet flat colour.

Three details are load-bearing. The image is a `::after` rather than a
background on the element itself, so the feather can be a mask in the
*artwork's* terms without also masking the flat colour underneath it. Its
height is `vw` rather than an `aspect-ratio`, which looks like the tidier way
to write it and isn't — pairing `aspect-ratio` with a height cap makes the
browser hold the ratio by shrinking the *width*, and the artwork came out
1610px wide on a 1920px screen. And the backdrop is scoped
to the page's own content, not the layout column — the client's mockups draw no
site footer, and ours is opaque, so anchored to the column the artwork would
spend its whole height behind the footer on a phone and never be seen. See the
wrapper in `page.tsx`.

Figma's `IN DEPTH READING BLUE WINDOW PANE` (1508x299 at 45%) is dropped. It
is a near-uniform `rgb(15, 26, 38)` wash behind the card row that resolves to
under two levels of difference against the backdrop it sits on — a PSD
artefact rather than a visible layer, and not worth a 1508px asset.

## Deviations from the frame

- **Gift a Reading is a link.** Figma gives that panel no control of any kind:
  it describes a product and leaves the visitor nowhere to go. Rather than
  invent a button the design doesn't draw, the whole panel navigates and
  answers a pointer with the gold glow the product tiles already use.
  Everything visible is still exactly what Figma draws.
- **The rules flanking "Traditional Tarot Readings" are borders, not the two
  359x18 bitmaps.** The line inside those is 2px; scaled to a responsive
  column it goes sub-pixel. Only the diamond mark closing each rule ships as
  artwork, sized in `em` off the heading so the bracket keeps its relationship
  to the words at every width. It also lets the heading wrap on a phone with
  the bracket still around it, which the fixed-width version couldn't.
- **The gold buttons hug their labels.** Figma draws them as fixed boxes —
  458x81 on the signature panel, 427x70 on a reading card, 384x68 at the foot
  of the page — and the widths are mostly air: the signature button's label is
  383px inside a 458px box. Each one keeps the Figma *height* exactly (the
  vertical padding is derived from it) and takes `w-fit` with 0.9em of
  horizontal padding, which lands within ~15px of the drawn width on the two
  that were close to their text already. One consequence worth knowing: the
  three price buttons in the card row no longer match each other exactly, since
  "$125 BEGIN YOUR READING" is a dozen pixels wider than "$52". Pin them to the
  widest if that reads as untidy.
- **The page's lead-in is shorter than the frame's 106px.** That frame draws
  no site masthead at all; ours renders one, so the space here is only the air
  the design leaves between the two.

## Page atmosphere moved

This page is the reason `(site)/layout.tsx` no longer owns the backdrop. It
used to render the homepage's nine-layer atmosphere for every route in the
group. Each page now renders its own
[`<PageAtmosphere>`](../layout/PageAtmosphere.tsx) as its first element, which
fills the layout's positioned column. `isolate` on that column is load-bearing:
the atmosphere sits at `-z-10` so page content paints over it without every
section needing a z-index of its own, and without a stacking context there that
negative layer would resolve against the root and disappear under `body`'s own
background. `#hero-sky` keeps its id — `SunriseAtmosphere` still portals the
animated sun and globe into it.
