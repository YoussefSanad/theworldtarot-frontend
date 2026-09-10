# The Library

> **Written 9 September 2026.** The Library page (Figma `344:98`, "LIBRARY_09_05") — a grid of
> the twenty-two Major Arcana over the library backdrop, with a small suit navigation above it.
> Card names are HTML text laid into the plaque the artwork already draws, not baked into the
> image, and every card links to its own reference page.
>
> This plan builds **the grid page and nothing else in finished form**. The Fool's reference page
> is the template for all twenty-two and has its own issue; the four suit pages each get their own
> design and none have been drawn yet. Both are stubbed here so no link on the page is dead.

---

## What the client supplied, and what it changes

Two deliveries matter, and reading them settled most of the design:

**`NO PLAQUE NAME LARGER IMAGES FOR LIBRARY CARDS/`** — twenty-two JPEGs, every one 1280x2120,
1–2.4MB. These are not bare card art. Each ships **the complete card chrome**: the gold border,
the roundel at the top carrying the Roman numeral, and the riveted gold plaque along the bottom —
with the plaque *empty*. The folder name is literal, and it is the whole brief for the overlay:
the name is the only thing missing, and HTML supplies it.

So there is no plaque to build. Earlier drafts of this plan had CSS reconstructing a bevelled
gold rectangle with rivets; that work does not exist, because the artwork already has one. What
is needed is text positioned into a box that is already there.

**The plaque sits in the same place on all twenty-two cards**, measured off the source pixels:

| Plaque edge | Fraction of the card |
|---|---|
| left / right | 29.38% / 70.55% — 41.2% wide, centred |
| top / bottom | 94.10% / 98.82% — 4.72% tall |

Because it is a fixed fraction, percentage positioning inside a `.stack` lands correctly at every
rendered size, which is the same thing `ProductCard` does with its framed art. No absolute
positioning for layout, per `src/app/README.md`.

## The plaque is small, and that is the real design problem

At the 205px card width Figma draws, the plaque interior is about **84x16px**. "THE HIGH
PRIESTESS" is not readable there, and no amount of care with the type makes it so at that size.

The client's own mockup answers this, and the answer is measurable. Her plaques carry the names
already, so "THE HIGH PRIEST" — fifteen characters — can be read straight off the frame: it sits
on one line and fills about 85% of the plaque's interior, at an implied type size of **~7.4px**.

Measured against that setting, only one name does not fit:

| Name | Width against plaque interior |
|---|---|
| DEATH | 31% |
| THE FOOL | 46% |
| THE WHEEL | 52% |
| JUDGEMENT | 55% |
| TEMPERANCE | 61% |
| THE HANGED MAN | 79% |
| THE HIGH PRIEST | 85% — the client's own reference |
| **THE HIGH PRIESTESS** | **103% — the only overflow** |

It misses by three percent, which is a tracking adjustment rather than a layout problem.

So the rule is: **fit the name on one line at 205px**, closing that 3% on the longest name with
slightly tighter letter-spacing. The frame is matched exactly at 1920px and `check:measure` still
passes.

What the table does *not* say is that 7.4px is comfortable — it is below the ~9px floor where
small caps stay readable on a real screen, so at 1920 the whole row is tight, not just the long
name. The lever for that is **above** 1920px: the site currently stops growing content there, and
the cards are allowed to keep scaling past it, so on the large displays this page will mostly be
seen on the names become genuinely legible. This is additive — it costs nothing at 1920 and
departs from the frame nowhere.

Two consequences for the type:

- **Sized in `cqw` off the card**, so the name tracks the card at every size rather than needing
  its own breakpoints.
- **One size for all twenty-two.** Per-card sizing would make short names larger than long ones
  and the row would stop reading as one engraving; only the tracking moves, and only where a name
  needs it.

The name is real text, so it is selectable, searchable, translatable and crisp at any zoom — the
reasons the client asked for it, recorded here because the tightness above is the cost of them.

## Card names

The mockup's plaques carry the client's own spellings, and two of them are typos while two others
are deliberate choices for this deck. The rule applied: **fix outright misspellings, keep
deck-specific naming.**

| # | Name | Source file | Note |
|---|---|---|---|
| 0 | The Fool | `0-the-fool` | |
| I | The Magician | `01-the-magician` | |
| II | The High Priestess | `02-the-high-priestess` | |
| III | The Empress | `03-the-empress` | |
| IV | The Emperor | `04-the-emporer` | typo fixed |
| V | The High Priest | `05-the-high-priest` | **deck's own name**, not Hierophant |
| VI | The Lovers | `06-the-lovers` | |
| VII | The Chariot | `07-the-chariot` | |
| VIII | Strength | `08-strength` | |
| IX | The Hermit | `09-the-hermit` | |
| X | The Wheel | `10-the-wheel` | **deck's own name**, not Wheel of Fortune |
| XI | Justice | `11-justice` | |
| XII | The Hanged Man | `12-the-hangman` | typo fixed |
| XIII | Death | `13-death` | |
| XIV | Temperance | `14-temperance` | |
| XV | The Devil | `15-the-devil` | |
| XVI | The Tower | `16-the-tower` | |
| XVII | The Star | `17-the-star` | |
| XVIII | The Moon | `18-the-moon` | |
| XIX | The Sun | `19-the-sun` | |
| XX | Judgement | `20-judgement` | British spelling, as the client writes it |
| XXI | The World | `21-the-world` | |

Every name lives once, in `src/content/library.ts`. An official list from the client later is a
one-file edit.

**The mockup's grid order has a slip and is not followed.** Row one reads The Fool, The Magician,
**The Tower**, The Empress — The Tower standing in the slot belonging to The High Priestess, and
appearing again correctly at XVI. Figma's own layer names disagree with the pixels there (the
layer in that slot is `II - THE HIGH PRIESTESS`), so this is a stray layer in the mockup, not an
instruction. The grid renders 0 through XXI in numerical order.

## Images

`next.config.mjs` sets `images.unoptimized: true` — the export is static and Next's optimiser
never runs, so **whatever is referenced ships byte for byte**. Referencing the delivered JPEGs
directly would put roughly 35MB of images on one page to draw them at a few hundred pixels each.

A one-off script re-encodes the twenty-two to webp at 640x1060 into
`public/figma/library-cards/` — 2x the largest size a card reaches, so retina-sharp with room to
spare. It uses `sharp`, already a dependency and almost certainly what the (gitignored, local-only)
`assets:optimize` used; see `scripts/README.md` for why that pipeline is not in the repo. The
script is committed alongside the QA scripts, since unlike the asset pipeline it needs no
credentials and re-running it is the documented way to redo this conversion.

The source JPEGs then come out of `public/`, because everything under `public/` is deployed —
they are client deliverables and belong in `asset dump/`, where the rest live.

The card aspect needs no cropping: 205/340 = 0.603 and 1280/2120 = 0.604.

## Alt text

Every card image takes `"<Name> tarot card from The World Tarot"`, from the ticket. It is derived
from the name in `library.ts` rather than written out twenty-two times, so it cannot drift from
the display name.

The numeral in the roundel and the name on the plaque are both *inside* the image, and the name is
also present as real text beside it. So the alt text does not repeat the numeral — a screen reader
gets the name once from the overlay and once from the alt, which is the useful amount.

## Routes

```
src/app/(site)/library/page.tsx                      the grid — the default Library view
src/app/(site)/library/[card]/page.tsx               22 stubs, via generateStaticParams
src/app/(site)/library/{swords,cups,wands,pentacles}/page.tsx    4 stubs
```

**Major Arcana is `/library/` itself.** The ticket is explicit that it "acts as the way back to
the default grid view", not a distinct content route, so the suit nav's first item points at the
page it is already on when the grid is showing.

Stubs render the card's image, name and numeral over a short line saying the full reference is
coming — real, correct-looking routes that do not pre-empt the designs that own them. Suit stubs
are the suit name and the same line.

## Components — `src/components/library/`

| Component | What it is |
|---|---|
| `LibraryIntro` | "The World Tarot Library" (Magically, 45px), divider, "AN ARCHIVE OF THE SYMBOL AND MEANING" (Cinzel gold, 30px), and the body line (Gill Sans cream at 73%, Figma's own opacity). Follows `ReadingsIntro`. |
| `SuitNav` | The `MAJOR ARCANA \| SWORDS \| CUPS \| WANDS \| PENTACLES` row, Gill Sans gold 30px. |
| `MajorArcanaGrid` | Four columns at desktop, reflowing below; the last row's two cards centred as Figma draws them. |
| `TarotCardTile` | The `@container` card: `Link` wrapping the image and the plaque overlay in a `.stack`. |
| `LibraryClosing` | "The library - worlds without end" between two dividers, then GET MY READING. |

`LibraryClosing` reuses `ClosingSaying` with this page's copy, the way `WorldTarotPage` already
does. The button goes to `/readings/` — `site.ts` documents that rule: a page that sells nothing
directly sends GET MY READING to the readings index.

**The suit nav gains an active state Figma does not draw.** A static mockup cannot show one, but a
navigation that cannot say where you are is a usability hole rather than a faithful rendering:
the current section renders in full gold against the others dimmed, and carries `aria-current`.
This is the same kind of deliberate addition as the mobile menu button and the carousel dots
(`src/app/README.md`).

Hover on a card answers **with light only** — a gold `drop-shadow`, no movement — which is what
`ProductCard` does and what the grid needs, since the cards run close together and anything that
grows would overlap its neighbours.

## Grid geometry

From the Figma frame: the `THE CARDS` block is 914px wide at x=499, cards are 205x340, columns at
x = 0 / 239 / 472 / 707 and rows at y = 0 / 366 / 734 / 1106 / 1481 / 1849. That is a 233px
column pitch and a ~368px row pitch — **28px gutters both ways**, which is the number the grid
uses rather than the raw offsets.

Twenty-two cards fill five rows of four with two left over, centred.

Below `lg` the design stops scaling and the gutter does the work, per `src/app/README.md`; the
grid drops to two columns and then one on the narrowest phones. As with the reading pages and
World Tarot, **the client drew this frame at 1920 and nothing else**, so there is no mobile
mockup to match and the reflow follows the site's existing pattern rather than inventing a
page-specific one.

## Content — `src/content/library.ts`

The twenty-two cards (slug, numeral, name, image, alt) and the four suits (slug, label, href).
Components import and render; they own no strings, per `src/content/README.md`.

## Nav

`site.ts`'s `LIBRARY` entry becomes `/library/`. That file documents the rule: a path carries its
trailing slash once its route is built and not before, because `trailingSlash: true` makes an
unslashed link to a real route cost a 308.

## Steps

1. `scripts/optimize-library-cards.mjs`, run it, verify twenty-two webps land at 640x1060.
2. Move the source JPEGs out of `public/figma/` to `asset dump/`.
3. Register the images in `src/lib/assets.ts` following the existing `asset()` pattern.
4. `src/content/library.ts` — the twenty-two cards and four suits.
5. `TarotCardTile`, then `MajorArcanaGrid`.
6. `LibraryIntro`, `SuitNav`, `LibraryClosing`.
7. `src/app/(site)/library/page.tsx`, with `PageAtmosphere` and metadata.
8. The `[card]` and four suit stubs.
9. `site.ts` — slash the Library link.
10. Lint, typecheck, build; confirm 27 routes in the static export.

## Verification

`npm run lint`, `npm run typecheck`, `npm run build`. The build is the real check here: it proves
all twenty-seven routes export statically and that `generateStaticParams` covers every card slug.

Visual checking is the user's own, in their browser — no dev server, no headless screenshots.

## The backdrop

The library interior is one photograph, as the reading observatory is. It gets a
`page-atmosphere-library` variant in `globals.css` and an entry in `PageAtmosphere`'s
`AtmosphereVariant`.

**It follows World Tarot's construction, not the readings parlour's** — width-driven,
floor-anchored, `overflow: clip`, and no mask on the top edge. The check the World Tarot README
describes was run: this artwork is opaque to its own top edge, the domed ceiling and its clouds
reaching the frame's top border, so there is no near-flat sky for a feather to dissolve into. A
mask there would only fade the ceiling out.

Figma draws the layer at 2137x4312 against a 1920x3772 frame — wider and taller than the page, and
positioned at (-124, -380), so it is already meant to overflow and be cropped. `background-size`
is width-driven with `height: auto` for the reason `src/app/README.md` gives: a second percentage
would squash the art whenever the page runs taller or shorter than the frame.
