# The remaining Major Arcana reference pages

Wiring the rest of the Major Arcana onto the template The Fool's
page established (`src/components/library/card/README.md`), from the client's
`LIBRARY PACKETS` delivery and her `LIBRARY CARDS CONTENT 1` sheet.

Read the card page's own README first. This document only records what the
remaining cards change, and the short answer is: **less than it looks.** The
template was built to take one content object per card with no code change, and
that mechanism holds. What needs work is the asset pipeline, because her
packets are shaped differently from the single PSD the Fool's assets came from.

## What her delivery actually contains

Measured, not assumed — `LIBRARY PACKETS/` holds **twenty-one packets**: twenty
numbered `02`–`21` (numerals II–XXI) plus `REVISED MAGICIAN TEST PACK/` for
card `I`, which sorts last rather than first and is easy to miss. Each holds a
card image, a background, a shadow layer and three to four icons. Four findings
change the plan:

**The icons are byte-identical across every packet.** All twenty-nine of them —
four elements, twelve signs, ten planets, three verdicts — hash the same
wherever they appear, so `FIRE.png` in Strength's folder is the same file as
`FIRE.png` in The Tower's. They are **a shared library the client happened to
copy into every folder**, not per-card art, and they are deduped once rather
than twenty-one times.

**Those icons are pure black silhouette masks** (measured: `rgb(0,0,0)` across
every opaque pixel), where the Fool's shipped symbols are grey-taupe
`rgb(120,115,105)`. This is the exact trap `optimize-card-assets.mjs` documents
in its header about Figma's `rawImages` — except this time it is her own export
that is untinted, so **the tint moves into the pipeline** rather than being
something her file already carried.

**The card images are already shipped.** Every packet's card JPG is 1280x2120,
which is the same source `optimize-library-cards.mjs` already converts into
`public/figma/library-cards/`, and `CardEssay` already draws `card.image`. The
packets' copies are redundant and are ignored.

**The backgrounds are the parchment sheet alone**, transparent outside it —
the per-card equivalent of the Fool's `Layer 21`, not a full-frame composite.
The night sky behind them (`page-clouds.webp`) stays shared.

## The parchment is the one real problem

Her sheets are **not a consistent size or position.** Measured solid bounds,
per card:

| | width | height |
|---|---|---|
| narrowest | 1314 (The Magician) | 2691 (Justice) |
| widest | 1466 (The Devil) | 3087 (The Devil) |

against the Fool's hardcoded 1337. Horizontal offset ranges 217–304px inside
the 1920 canvas, so they are not even centred consistently. `.card-paper`
currently encodes one sheet's geometry — `--paper-deckle: calc(100% * 24 /
1337)` and a `--measure-card-paper` — and twenty-two different widths cannot
share it.

**They are normalized to one canonical sheet, and nothing is cut off.** Two
distinct operations, and the distinction matters because "crop" sounds
destructive:

1. **The transparent margin around the sheet is removed.** Those are empty
   pixels in her 1920-wide canvas, outside the paper. The torn deckle edges are
   part of the paper and are kept whole — the crop is to the solid bounds, and
   the ragged alpha inside them is untouched.
2. **The cropped sheet is scaled to a single width.** Sheets run 1314–1466, so
   normalizing means some scale up ~6% and some down ~4%.

That scale is safe for the reason the existing CSS already stretches the mid
tile vertically: **this layer is a paper grain with no figure in it and no
horizon to skew.** A few percent is invisible where a seam never is. The
alternative — twenty-two sets of measured geometry in CSS — buys fidelity no
one can perceive and adds twenty-two things to verify.

The deckle depth is measured per sheet rather than assumed. Her tearing
finishes within 5–13px depending on the card, where the Fool's was 24, so the
slice depth comes from a per-sheet edge scan — alpha where she supplied it,
luminance for the two flattened sheets — and every sheet still yields the three
layers `.card-paper` expects: a top strip, a bottom strip, and a large flat
middle (2691–3087px) to stretch between them.

## The shadow panel flattens

The Fool's panel composites two layers, and `ShadowPanel` carries twenty-three
lines of comment explaining how `shadow-silhouette`'s 11px of transparent glow
on every side was reverse-engineered so the rock inside it lands on her
node box at x1.0325 scale.

**That maths does not generalise**, and it does not need to. Per the decision
taken on 2026-09-28, **the ground and the figure become one flat per-card
image** sized to the panel. `ShadowPanel` draws one image where it drew two,
`cardReference.shadowSilhouette` leaves the asset map, and the glow arithmetic
and its comment are deleted rather than multiplied by twenty-two.

The Fool's own flat cut is already in the repo as
`public/figma/card-reference/shadow-ground.png` (added 2026-09-28). Verified
against the two layers it replaces: same figure, same cliff, same left-edge
bleed, identical rounded corners, and it sits **entirely inside the 1216x229
box** where the old silhouette overhung the bottom by 8.48% — that overhang
being precisely the hand-tuned geometry that could not travel.

### Her shadows are uniform; the padding hid it

The heights looked like the problem and were not. Trimmed to content bounds,
**every one of the twenty-one is 1216 wide and 227 tall** — the panel's own
geometry, with the figure in the same left position:

| | file | trimmed | padding |
|---|---|---|---|
| The High Priestess | 1239x437 | 1216x**260** | 42% |
| The Hermit | 1216x430 | 1216x227 | (white) |
| Justice | 1243x356 | 1216x227 | 38% |
| The World | 1216x319 | 1216x227 | 29% |
| The Magician | 1216x229 | 1216x227 | 1% |

So the apparent 248–437 spread was transparent margin, up to 42% of the file.
**The pipeline trims to content bounds and nothing is scaled**, which removes
the distortion risk a resize would have carried. Two files — The Hermit's
`shadow9.jpg` and Death's `shadow13.jpg` — are JPEGs padded with white rather
than alpha, and trim to the same 227 by luminance, the same dual-mode detection
the backgrounds need.

**The High Priestess is the one outlier at 260 tall**: her figure reaches
higher above the panel than the rest. She is not cropped to 227 — the panel is
what the artwork overhangs, exactly as the Fool's silhouette did, so the extra
33px is drawn and allowed to break the top edge.

### The panel fill is unified to opaque

The Fool's flat cut and her packets reach the same look by different means, and
they are not quite the same colour:

- **The Fool's:** near-black `rgb(1,0,3)` at **alpha 181** — translucent, so
  the parchment shows through. Over `#ebe2cf` that composites to `rgb(69,66,62)`.
- **Her packets:** **opaque** `rgb(56,56,56)` at alpha 255, flat and neutral.

A ~13-point difference, and warmer on the Fool because it picks up paper tone.
Per the decision taken on 2026-09-29, **all twenty-two use the packets' opaque
fill**: they are the majority and the newer cut, and an opaque panel renders
the same whatever sits behind it. The Fool's flat asset is re-flattened onto
`rgb(56,56,56)` so it matches, which is the only pixel change to that approved
page besides its URL.

## The content maps onto the existing type

Her sheet is **column-per-card** (`I`–`XXI` across, field labels down), 48 rows,
and every field the template needs is filled for all twenty-one, which is
exactly the set of packets. The mapping is mechanical:

| Sheet row | `MajorArcanaContent` |
|---|---|
| 3 word summary | `keywords` |
| Subtitle | `subtitle` |
| Main body text | `essay` (newline-split) |
| Column 1–4 title/text | `appears[n].label` / `.body` |
| Look for text | `lookFor` |
| Love / Career / Money text | `spheres` |
| Bullet points | `shadow` (all but last line) |
| Closing phrase | `shadow` (last line) |
| Element / Planet / Astro sign / Keyword / Yes-No | `meta` |
| Quote | `closing` |
| Page title, Alt text | `metaDescription` source |

Three shape mismatches to absorb, each measured:

- **`essay` is three paragraphs for every card** except The Magician, which has
  four. The type is `readonly string[]`, so this needs no change.
- **`lookFor` is one or two lines** depending on the card, where the Fool's is
  two. Also already `readonly string[]`.
- **`shadow` is her bullet line(s) plus a closing phrase.** The Fool's is three
  strings: two bullet lines and a closing. Cards whose bullets are one line
  yield two strings, not three. The type allows it; `ShadowPanel` must be
  checked for anything that assumes three.

`appears` stays the tuple of exactly four — her sheet has exactly four columns
for every card, which is what that type was asserting.

**The U+00A0 warning in `card-content.ts` applies to this import.** The Fool's
sphere strings contain non-breaking spaces that pin orphaned last words, and
they are invisible in an editor. The generated cards will not have them; if the
client flags an orphan on a new card, that is the fix, not CSS.

### The copy is transcribed as delivered

**Per the decision taken on 2026-09-28, the sheet is matched as it is.** This
is a deliberate departure from the rule `library.ts` and `card-content.ts`
record for the Fool — where `the unkown` was corrected to "the unknown" — and
the departure is the instruction, not an oversight.

So the following ship **as she wrote them**, and are raised with her rather than
absorbed:

- `SOVREIGNTY` — The Emperor's keyword.
- `fufillment` — in The Empress's three-word summary.
- The Wheel and The Hermit sharing the quote `"Go within to see clearly"`.
- The Magician's shadow text being The Fool's verbatim.

Two things are **not** copy and do not change: `JUDGMENT` in the sheet stays
`Judgement` in `library.ts`, and `HERMIT` stays `The Hermit`. Those are the
card's *name* — already set, already in the grid, already in a URL — and the
sheet's spelling of a name it is not defining does not move them. Only the
per-card copy this import writes is taken verbatim.

**This makes the Fool inconsistent with its twenty-one siblings**: its one
correction stays, because that page is approved and shipped. Worth a line to
the client so the difference is a decision rather than a discovery.

## The URL suffix changes

Her sheet specifies `-tarot-meaning`; the live Fool page is
`-tarot-card-meaning`. **Per the decision taken on 2026-09-28 the sheet wins
and all twenty-two move to `-tarot-meaning`.**

This is contained because the URL is derived rather than stored — `CARD_SUFFIX`
in `content/library.ts` is the one spelling, exactly as that file's comment
promised. The full set of touch points:

- `CARD_SUFFIX` — the constant.
- `CARD_PATH_PATTERN` — the regex beside it.
- `card-path.test.ts` — one fixture string.
- Four comments and two README/docs lines that quote the old URL.

There is no sitemap route, no redirect config and no robots rule referencing
it, so nothing else moves. **The Fool's approved URL changes**, which is worth
saying out loud even though nothing external depends on it yet; her sheet is
the client's own instruction, so it is her call to have made.

The sheet's slug column itself is **not** used. It is internally inconsistent —
`wheel-tarot-meaning` and `world-tarot-meaning` drop the article that
`the-star-tarot-meaning` keeps, and `the-hang-man-tarot-meaning` splits a word
`library.ts` spells `the-hangman`. Deriving all twenty-two from `slug` keeps
one rule; only the suffix is taken from her sheet.

## All twenty-one cards ship

**Nothing is blocked.** An earlier reading of this delivery had three cards
held back; all three resolved on closer measurement, and the record of how
matters because two of them need a different code path.

**The Magician is in `REVISED MAGICIAN TEST PACK/`**, not a numbered folder —
which is why a folder listing sorted after `21` appeared to skip card `I`. Its
`01_MAGICIAN WATERCOLOR BKGRND.png` has **proper alpha and sheet bounds of
1314x2972**, squarely among its siblings, so it takes the ordinary path. Two
things about this packet are its own:

- It carries a `SECTION 6 BACKGRND.png` (1221x237) the other packets do not.
  That is the meta strip's backdrop — the per-card equivalent of
  `meta-strip-bg.webp`, which every other card currently shares from the Fool's.
  **It is ignored for now**: one card having its own is not a pattern, and
  wiring a per-card meta strip for a single packet would add a lookup that
  twenty cards fall through. Worth asking whether she intends to deliver these
  for the rest.
- Its `SHADOW1.png` is **1216x229, tight to the panel**, where every other
  packet's shadow carries up to 42% transparent padding around the same
  content. It is the newest asset she has cut and needs no trimming, which is
  the shape the others are trimmed to.

**Temperance is unblocked by an asset added mid-session** (2026-09-28 15:35):
`TEMPERANCE-BKGRND.png` sits beside the unreadable `.pbm`, which is now
ignored. **The Wheel keeps its existing `10-THE WHEEL BKGRND.jpg`.** Per the
decision taken on 2026-09-28, both ship with what we have now and are swapped
in a later session if she delivers cleaner exports.

Those two need one extra step, and it is the only asymmetry in the pipeline.
Both are **flattened onto opaque white** rather than carrying transparency, so
the sheet is found by keying white to alpha instead of reading alpha directly.
Measured, this is safe:

- Their torn edges are **as ragged as the alpha sheets'** — Temperance varies
  7px across sampled rows and The Wheel 30px, against Star's 9px and World's
  27px. The deckle is intact; it is simply sitting on white.
- The transition is a **~3px antialiased ramp** (255 → 249 → 231 → 208 across
  the edge), so keying yields a soft edge rather than a hard clip.
- The paper's own tone is ~190 luminance, far below any sensible key threshold,
  so **no paper is keyed away.**

The pipeline therefore detects which mode a background needs rather than being
told, and asserts the bounds it finds are plausible — a sheet narrower than
~1250 or wider than ~1500 means the detection picked the wrong thing and should
throw rather than ship a mis-cropped page.

## To raise with the client

Nothing here blocks the build. Every item ships as delivered and is flagged, in
the same class as the two Fool slips her README already records.

**Copy, shipping as she wrote it** (see "The copy is transcribed as delivered"):

1. **`SOVREIGNTY`** — The Emperor's keyword, for `SOVEREIGNTY`.
2. **`fufillment`** — The Empress's three-word summary, for `fulfillment`.
3. **The Magician's shadow text is The Fool's, verbatim** — "recklessness •
   impulsivity • ignoring important details…" and "ground enthusiasm with
   awareness and preparation". Every other card's is its own. Reads as a paste
   error in the sheet.
4. **The Wheel and The Hermit share a quote**, `"Go within to see clearly"`,
   which fits The Hermit and not obviously The Wheel.
5. **The Fool keeps its one correction** (`the unkown` → "the unknown"), so it
   is the only page whose copy is not verbatim. A decision, not a discovery.

**Assets:**

6. **No "Appears in a Reading" icons, and no keyword symbol, in any packet.**
   Only the Fool's five exist, so all twenty-one pages **reuse the Fool's four
   column icons and its key symbol**. The content type already holds an icon per
   column, so per-card glyphs are a data-only swap later — but as shipped, one
   card's icons repeat across all twenty-two pages.
7. **Temperance and The Wheel ship from flattened-on-white exports**, keyed to
   alpha. They work and the deckle survives, but they are the only two not
   isolated on transparency; cleaner exports would remove the one asymmetry in
   the pipeline. Temperance's unreadable `.pbm` can be deleted.
8. **The Magician's packet carries a `SECTION 6 BACKGRND.png`** no other packet
   has — a per-card meta strip backdrop. Ignored for now. Does she intend to
   deliver these for the other twenty?
9. **The shadow panels are delivered with up to 42% transparent padding**
   around otherwise-identical 1216x227 content — only The Magician's is cut
   tight. Harmless (the pipeline trims them) but worth her knowing the exports
   carry it, and that The Hermit's and Death's came as white-padded JPEGs where
   the rest have alpha.

**URLs:**

10. **The URL suffix change** — confirming that moving the approved Fool page
    from `-tarot-card-meaning` to her sheet's `-tarot-meaning` is intended.
11. **The sheet's slug column is internally inconsistent**, listed above; only
    its suffix is used.

## Shape of the work

Four pieces, in dependency order. Detail belongs in the implementation plan;
this records the boundaries and why they fall where they do.

**1. A packet asset pipeline** — `scripts/optimize-packet-assets.mjs`, beside
the existing card-asset script rather than inside it. The two have different
source shapes (one flat PSD-export folder vs. twenty-one card folders), a
different dedupe story and a different tint step, and the existing script's
`SLUGS`/`WIDTHS` tables are a record of one specific PSD. It reads
`LIBRARY PACKETS/`, and it:

- dedupes the twenty-nine icons into one shared `card-reference/symbols/` set,
  asserting the byte-identity this document measured rather than trusting it;
- tints them from black to the page's `rgb(120,115,105)`;
- crops each background to its solid bounds, measures its deckle, slices it
  into three and normalizes to one width;
- trims each flattened shadow to its content bounds — alpha or luminance,
  detected — without scaling, and flattens it onto the panel's opaque
  `rgb(56,56,56)`;
- detects per background whether the sheet is bounded by alpha or by white, and
  throws if the bounds it finds fall outside ~1250–1500 wide rather than
  shipping a mis-cropped page.

**2. The asset map grows a per-card layer.** `cardReference` in `lib/assets.ts`
stays as-is for genuinely shared chrome — the dividers, the sphere art, the
meta strip, the appears icons — because that is what it holds and most of it is
shared. Alongside it: a `cardSymbols` record keyed by the twenty-nine symbol
names, and a per-card lookup for the two assets that vary (parchment, shadow).

**3. The content import.** A throwaway script reads the `.xls` and emits
twenty-one objects into `content/card-content.ts` in the Fool's shape,
transcribing her copy verbatim per the section above. **The emitted file is the source and is committed**; the
script is not part of the build, for the reason `card-content.ts`'s header
already gives — these pages are statically exported to be indexed, so their
copy belongs at build time.

**4. The component changes**, which are the smallest piece:

- `ShadowPanel` draws one flat image instead of two composited layers.
- `.card-paper` takes its sheet from a per-card custom property.
- `MetaStrip`/`AppearsPanel` need no change — they already read their art from
  the content object.
- `library.ts` gains `content:` on the remaining twenty-one cards, and the
  suffix change.

## Verification

The Fool's page must be **pixel-unchanged** by all of this except for its URL
and its shadow panel, which changes twice over: the silhouette is baked in, and
the fill goes opaque. It is approved, and it is the regression test for
everything else.
Beyond that: all twenty-one new pages build and export, `card-path.test.ts`
passes against the new suffix, and no page ships a black icon where a taupe one
belongs. `ComingSoonPage` is left in the tree — the four suit routes still use
it — but no Major Arcana card reaches it any more.

The two keyed-from-white sheets (Temperance, The Wheel) get their own look:
they are the only pages whose paper edge came from a luminance threshold rather
than her own alpha, so a halo or a squared-off deckle would show up there first.

The client verifies the pages visually; per standing preference this plan does
not include browser checks.
