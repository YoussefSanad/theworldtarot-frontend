# The World Tarot's own page

Built from the Figma frame `344:30` ("THE WORLD TAROT_09_05_26", 1920x3298).
Read [`src/app/README.md`](../../app/README.md) first — the token system, the
`.stack` rule and the "no absolute positioning for layout" rule all apply
here.

## There is no mobile mockup

Same situation as a reading's own page: the client drew this frame at 1920
and nothing else, so `lg` is not a design seam for *layout* here, only where
the two columns in the artist panel become one. Everything above that follows
the site's usual desktop-to-`lg` scale, `lg`-to-phone reflow pattern — nothing
page-specific was added for tablet.

**The backdrop is the exception, and it had to be.** With no mobile mockup to
follow, the desktop backdrop was carried straight down — and a width-driven
photograph on a page several thousand pixels long leaves screens of flat colour
above it on a phone. The readings index hit the same wall with a mockup in hand,
and the client's answer there was a second layer: a night sky across the top.
That layer is reused here below `lg` rather than a new asset being invented for
a frame she never drew. See "The backdrop stands on the floor" below.

## The frame's geometry, measured

Everything below is read off node `344:30` (1920x3298) rather than eyeballed
from a screenshot, which is how the first cut of this page went wrong — it
was built from proportions that looked right and were a tenth out.

| Element | x | y | w | h | centre-x |
| --- | --- | --- | --- | --- | --- |
| "The World Tarot" | 762 | 107 | 384 | 60 | 954 |
| Divider 1 | 691 | 183 | 538 | 66 | 960 |
| Tagline (2 lines, 40px) | 543 | 271 | 899 | 84 | 992 |
| Section 1 panel | 494 | 377 | 932 | 543 | 960 |
| Section 2 panel | 444 | 944 | 1029 | 1111 | 958.5 |
| Divider top | 691 | 2127 | 538 | 66 | 960 |
| Quote | 594 | 2201 | 733 | 51 | 960.5 |
| Divider bottom | 691 | 2257 | 538 | 66 | 960 |
| Gold button | 808 | 2340 | 305 | 54 | 960.5 |

**Everything centres on 960**, the page's own centre. The tagline's box reads
32px right of it and the title's 6px left — those are the PSD conversion
sizing text boxes by their leading, not a design decision, and the same trap
the readings frames set. Don't restore the offsets.

Vertical gaps, which are what the section padding reproduces: 16px title to
rule, 22px rule to tagline, 22px tagline to panel one, **24px between the two
panels**, 72px panel two to the closing rule, 8/5/17px through the closing
block — and **904px below the button**, which is 27% of the page and the
subject of the last section here.

**The two panels are different widths** — 932 and 1029, both centred — so the
page's measure is the wider and the mission panel takes 90.57% of it
(932/1029). Widening it to the measure is a design change and would put every
`cqw` in that file out by a tenth.

## Four sections, three of them rebuilt from tokens

`WorldTarotIntro`, `MissionStatement`, `ArtistPanel`, then the readings
index's own `ClosingSaying` given this page's copy. Figma ships every panel
border here as a bitmap — closed rounded rectangles with diamond studs
astride the top edge — and **none of them are used**, the same rule the
readings panels follow: `OrnateFrame`'s `panel` variant reproduces the
border from tokens, so it stays crisp at any width instead of stretching a
fixed-aspect export.

**The panel radius is borrowed, not re-derived.** Both panels here (932px
and 1029px) measure close enough to the readings gift/signature panels'
radius (52-70px on 1191-1493px, already merged into one `--ornate-radius:
4.5cqw` token) that a third value isn't worth adding — see the corner
comment on `.ornate-frame--panel` in globals.css.

**`--container-world-tarot` is 1029px, the wider of the two panels**, on the
same reasoning as `--container-readings` — the two content widths this frame
draws are close enough (932px and 1029px) that the page takes one measure and
both panels sit inside it, rather than each keeping its own.

## The top-edge marks are a trio on both panels

Both closed panels wear the same three marks: a stud (`ornaments.stud`) a
fifth of the way in from either end, and the small trio
(`ornaments.trioSmall`) in the middle — identical to the readings right
panel's `ReadingPanel`. **Neither panel opens its border for a legend** —
this frame draws no heading in the gap the way a reading page's moon panel
does, so there is no `legend`/`legendMark` prop in play here, only `marks`.

**The moth is not one of the three.** Figma centres it at (427,250) inside
the 932x543 mission panel — mid-body, between the two paragraphs — not on
the border. It looked like a natural swap for the trio at first glance and
isn't; check the frame's own coordinates before moving a mark, not the
screenshot's silhouette alone.

**And the four blank lines it sits in are not all margin.** The gap between
her paragraphs runs y=217 to y=345, and the moth occupies y=250..317 of it,
so the air is 33px above and 28px below — not 128px halved. Treating those
blank lines as pure margin put 64px on each side and added about 67px to the
panel's height on its own, which together with over-generous block padding
had this panel standing 161px taller than she draws it.

## Where this page departs from the frame

Four places, all at the client's request while reviewing the built page, and
all worth knowing before someone "corrects" them back:

- **The mission panel's block padding** is about 1cqw over her own on each
  edge — 13.98/11.94 against 12.98/10.94 — so the copy breathes a little
  inside the border. It stays **asymmetric, as the frame is**: the panel sits
  slightly low in its own border, and evening the two out is what makes it
  look wrong. That comes to a panel ~18px taller than the 543 she draws.
- **The masthead gap** keeps the frame's full 107px lead-in rather than
  discounting it for our header — see below.
- **The tagline's gap to the first panel** is 56px (`2.92vw`) where the frame
  draws 22px, so the gold tagline and the mission panel are not crowded. The
  frame's own number is kept in the comment in `WorldTarotIntro`.
- **"SKY & STONE" is recoloured** to `--color-gold`, the gold the site's other
  headings use, rather than the pale wash her own export carries. It is
  artwork, so this is pixels and not a token — see the note on
  `worldTarotArtwork.skyStone` in `src/lib/assets.ts` for what was changed and
  why re-exporting from `asset dump/` would undo it.
- **The backdrop's two overhangs**, `--path-rise` and `--path-drop`, which
  the frame cannot describe because it draws no site chrome.
- **The closing block's rule** is the 538px `heroWide`, where both readings
  frames draw 448px — which is why `ClosingSaying` took a `rule` prop rather
  than being copied.

## The panels carry a night wash, and it is hers

Both panel exports measure a flat `rgba(0,2,2,130)` — 51% — edge to edge, so
the panels are not transparent over the path the way the readings panels are
over the parlour. That is `bg-ink/50` on each body: the same wash the reading
page's right panel already uses, shipped as a colour rather than as a
932x543 and a 1029x1111 bitmap, on the same reasoning as every other rebuilt
panel here.

Without it the garden path reads straight through the copy, which is what
the first cut did — a legibility problem *and* a departure from the frame,
which is worth stating because the fix looks like a readability tweak and is
actually just the design.

## The masthead gap is the frame's, undiscounted

`ReadingsIntro` spends about a third of its frame's 106px lead-in, on the
grounds that the frame draws no site header and ours does. **This page keeps
all 107px of its own** (`5.57vw`), and the masthead's height sits on top of
it rather than being subtracted from it — the client's point here is the
artwork, so copy starting further down the path is the design rather than
wasted space. If that gap ever needs to close, this is the number, and the
readings reasoning is the argument against it.

## Panel internals are `cqw`, with a `max()` floor

Both panels size their contents as a share of their own box, per the rule in
[`src/app/README.md`](../../app/README.md) — the same reason `ProductCard`
and the reading panels do. The first cut used viewport `clamp()`s here and
was wrong everywhere except 1920px: a `vw` value shrinks on the viewport
while the panel shrinks on its own measure, and the two do not track.

What a pure `cqw` cannot do is floor itself. Below `lg` a panel is 81.33% of
a phone, where the mission panel's 3.22cqw body would set at about 10px — so
each type size is `max(<floor>, <cqw>)`, the floor being the one the nearest
`--text-*` token holds. The floor only binds on a narrow panel; above about
530px of panel the `cqw` wins and the frame's proportion is exact.

## The heading pair is two pictures, indented and touching

"Between" sits at x=413 and "SKY & STONE" at x=499 — **86px (8.36cqw)
further in**. So the script word overhangs the caps to the left rather than
sitting flush above them, which is the whole look of that pair; setting them
flush-left loses it, which is what the first cut did.

Measured off the client's own render (`asset dump/readings page/THE WORLD
TAROT_09_05_26.png`) rather than the frame's text boxes, which disagree —
the "Between" node reports a 137x48 box for a 139x57 drawing. Her ink runs
y=110..167 for the script and starts y=168 for the caps, so **the caps begin
2px under the script's lowest descender**: they stack tight, and they do not
overlap.

**Both are images, and neither can be set as type.** "Between" is Malliya
Signature, letterspaced and hand-adjusted past what the live face gives, and
"SKY & STONE" is a gradient fill with an outline no font supplies at all.
Both ship from `asset dump/readings page/` rather than from the Figma
conversion, whose exports are flattened onto the backdrop with no alpha. The
signature under the bio is the same substitution — her silver drawing, not
the conversion's black one — and it is the same call the reading page already
made for its beetle.

**So the site does not load Malliya Signature, and should not.** An earlier
pass registered it in `app/layout.tsx` and gave it a `--font-signature`
theme token, back when the heading was live type; once both halves became
artwork nothing rendered from it, and a webfont fetched for zero glyphs is
pure cost. The font file, the `localFont` call and the token are all gone. If
a later heading wants this face *set* rather than drawn, it returns to
`layout.tsx` — the token is not worth reviving on its own.

Because the pair is pictures, `artistNote.legend` is the alt text for the
whole heading ("Between Sky & Stone") and the script word carries none of
its own, rather than a screen reader hearing the two halves separately.

## Colours were sampled, not guessed

Every piece of copy on the page was measured against the token palette from
her render. All six land exactly: the title, mission body and bio are
`--color-cream`, the tagline is `--color-gold`, and **the closing quote is
`--color-champagne` at distance 0.0** — which at the time was not what
`ClosingSaying` gave by default, so this page passes `tone="champagne"` for it,
the same tone a reading's own page takes. Champagne has since become that
component's default, the readings index having been the last frame closing in
gold; the explicit prop here is now belt and braces rather than a correction.

## The artist panel's photo is two images, not a clip

`world-tarot-photo-frame.webp` is a transparent octagonal border exported on
its own box (359x522), offset from the photo's box (294x459) by Figma's own
pixels: -32px left, -33px top, which is -10.88%/-7.19% of the photo's own
size once both share a `.stack` cell. The photo (`world-tarot-artist-photo.webp`)
already ships pre-clipped to its octagon in the export's own alpha — same
reasoning as the reading panels' inset photographs (see that README): trust
the export's clip rather than laying a second CSS `clip-path` over it, which
could drift out of register with the frame drawn on top of it.

The "serafina" signature under the bio is a **different** asset: a genuine
cursive image export (`world-tarot-signature.webp`, cropped from Figma's own
153x94 layer, not the oversized 1029x1111 canvas `get_design_context`'s raw
image list returns it inside — check a raw image's own dimensions against
its Figma metadata before shipping it, the list isn't ordered to match).

## The backdrop stands on the floor, opaque edge to edge

`.page-atmosphere-world-tarot` in globals.css follows the reading
observatory's construction — width-driven, floor-anchored, `overflow: clip`
— rather than the readings parlour's, because this photograph (unlike the
parlour's) is opaque at every height Figma drew it: the canopy and moon
reach the frame's own top border, so there is no near-flat sky for it to
dissolve into. The feather on its own top edge only matters once the page
runs taller than the 3298px frame at its own width.

**That opacity is a statement about the desktop frame, and below `lg` the page
is always in the case it excludes.** "Only matters once the page runs taller
than the frame at its own width" is a phone's permanent condition, not an edge
case: a width-driven photograph on a page several thousand pixels long cannot
fill it.

### Below `lg` the path gives up the top of the page, and a sky takes it

**The sky is the second half of this change, not the first.** Adding it alone
does nothing visible, and the reason is worth writing down because the desktop
rule reads as though it were already floor-anchored:

The path *was* pinned at **both** ends — `inset` set `top` and `bottom` with no
height — so `cover` filled the whole page. That meant the path's box *was* the
page; the photograph is opaque edge to edge; and `::after` paints over
`::before`. A sky added behind it was therefore drawn and then immediately
covered, everywhere except the 4% its own feather fades out.

So the path takes the readings parlour's construction instead — a height and
one edge, rather than two edges.

**That construction is now used at every width, and the two-pinned-edges
version is gone.** It began as a `< lg` override, on the reading that pinning
both edges was right at 1920 "where the frame and the page are near enough the
same shape". They are not near enough: the page runs taller than 3298px once
the copy is in, so `cover` was sizing the picture to the box's *height* and
pushing its sides off-screen — about 29% of the image's width at a 1440px
viewport, and worse the narrower the screen. The client reported it as the
background being scaled too large and cut off at the sides.

So "width-driven" was true below `lg` and false above it, while every comment
here and in globals.css said it was true throughout. It is now true throughout:

| | every width |
| --- | --- |
| `inset` | `auto 0 calc(-1 * --path-drop) 0` |
| `block-size` | `min(171.77vw + rise + drop, 100% + rise + drop)` |

`--path-rise` moves onto `block-size`, because a box hanging off the floor has
to lengthen upwards to still reach behind the masthead; `--path-drop` stays on
`bottom`. Below `lg` the rise is still spent to zero, which is all that `@media`
block does now.

171.77vw is the artwork's own height at full width (3298/1919), so at 375px it
stands about 644px tall on the floor of the page and everything above it is
free. Nothing about the picture changes — same `cover`, same width-driven
scale, same floor anchor, same top feather. What changes is only how much of
the page the box claims. `--path-drop` survives on the bottom edge, because the
footer's margin still needs covering at every width.

The sky is then the readings index's layer verbatim: the client's 375x850 night
sky hung from the top edge at its own scale (226.67vw is its height at full
width), fading downwards into the flat colour the path fades up into. See the
"mobile sky" note in globals.css for why it keeps its own scale rather than
stretching to meet the path.

**`--path-rise` is spent to zero with it.** The rise carries the path up behind
the masthead on desktop, which is the client's composition. On a phone the path
is nowhere near the masthead — the sky is what is up there — so it has nothing
left to lift, and against a floor-anchored box it would only push the artwork
down off its own floor. The header clearance moves to `max-lg:-top-20` on the
atmosphere in `world-tarot/page.tsx`, the readings index's arrangement exactly:
the element moves, the artwork inside it does not.

**`overflow: clip` still must not go on the parent**, for the reason the base
rule gives: `--path-drop` is an overhang and a clip would cut it off. A
height-capped box cannot overflow the top the way the parlour's can, and the
bottom overhang is deliberate, so there is nothing here to clip.

**The client wants as much of this path on show as the page allows, and the
frame puts a number on it.** The last thing drawn is the button, at y=2394
of a 3298px frame — so **904px, 27% of the page, is artwork and nothing
else.** Because the artwork stands on the floor, the lever for that is
vertical room between the last section and the footer rather than anything
about the atmosphere: `WorldTarotPage`'s wrapper carries `47.08vw` of bottom
padding, which is that 904/1920 exactly, with `ClosingSaying`'s own
room-space sitting inside it. If the page gains content above the fold, that
padding is the number to revisit, not the backdrop's sizing.

**It reaches up into the masthead and down under the footer**, and both
overhangs are deliberate. Above `lg`, `--path-rise` (3rem) carries the top edge
about half way up the header, so the path climbs behind the chrome instead of
starting hard at its bottom edge; `--path-drop` (2rem) carries the bottom past
the footer's top margin, which is 14px at its clamp maximum. Both are tuned by
eye against the rendered page — they are the two values on this page that cannot
be derived from the frame, since the frame draws neither a header nor a footer.

Below `lg` the rise goes to zero and the mobile sky takes the masthead instead;
the drop is unchanged at every width. See the section above.

**The gap above the footer had three causes, and they had to be fixed in
order.** It took several passes because closing one left the other two
looking identical from outside:

1. **`overflow: clip` on the atmosphere itself** — copied from the readings
   and reading blocks, where the artwork is inset and must be clipped. Here
   the picture is *meant* to escape at both ends, so the clip cut off exactly
   the overhangs meant to cross the gap. While it was there, **no value of
   `--path-drop` could ever have worked**, which is what made the first two
   attempts look like they simply needed a bigger number. It is gone; the
   layout column's own `overflow-y-clip` is all that was ever needed.
2. **The wrapper not reaching the footer.** `main` is `flex-1` in a
   `min-h-screen` column, so on a short page it stretches past its content,
   and a plain block child does not stretch with it — leaving a gap that grew
   with the viewport, so no fixed overhang could have covered it either. The
   page wrapper carries `min-h-full`, which resolves because a `flex-1`
   item's height is definite.
3. **`SiteFooter`'s own top margin**, which belongs to neither box. That one
   is genuinely `--path-drop`'s to cross, and always was.

**The fix stays on the page, not in the layout.** Making `main` a flex column
stretches the wrapper for free and was tried — but most pages here return a
fragment, so `main` holds the homepage's nine sibling sections rather than one
wrapper, and flex would turn each into a flex item and stop their margins
collapsing. That is a change to pages this ticket has no business touching.

The drop stays small for its own reason: the footer's scrim is
`rgba(15,26,39,0.77)`, not opaque, so a long overhang would tint it.
`overflow-y-clip` on the layout column stops either overhang from lengthening
the document.

## The photograph is inset further on a phone

Below `lg` the picture is a share of the panel rather than the grid column it
occupies at `lg`, and that share is set by the **frame** rather than the
picture: the ornament overhangs it by 10.88% left and 7.19% above, so it is
the gold that approaches the panel's border, not the photograph. At 70% the
two lines read as touching; it is 58% with `my-[4cqw]` of its own, which
holds a clear margin on every side — the vertical air being needed because
the overhang would otherwise eat into the grid gap.
