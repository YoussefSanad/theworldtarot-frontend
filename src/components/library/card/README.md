# A card's reference page

The Fool's page (Figma `357:261`, "THE FOOL 2 FLAT", 1920x3237), built 14
September 2026, and **the template for all twenty-two Major Arcana**. Read
[`src/app/README.md`](../../../app/README.md) first — the token system, the
`.stack` rule and the "no absolute positioning for layout" rule all apply here.
The design spec is [`docs/plans/major-arcana-card-page.md`](../../../../docs/plans/major-arcana-card-page.md).

The Library's own conventions are one level up in
[`../README.md`](../README.md), and the asset warning it records is repeated
below because this page is where it bit hardest.

## One card has content; twenty-one do not

`MajorArcanaCard.content` is optional, and that is the whole mechanism rather
than a gap in it:

- a card **with** a `MajorArcanaContent` record renders this template
- a card **without** one renders `ComingSoonPage`, exactly as before

Only The Fool has copy; the other twenty-one are waiting on the client. Each
one arrives as a single object in `content/card-content.ts` — **no code
changes** — and the route's one `if` does the rest. The four suit pages are
still their own placeholders and are to have their own designs.

## The URL is derived, and the bare slug is now a 404

`/library/the-fool-tarot-card-meaning/`, from `cardPath()` in
`content/library.ts`. `slug` stays short (`the-fool`) because it is already
the card's identity, its image filename and its lookup key; the SEO string is
computed from it rather than stored beside it, so there is one spelling to keep
right.

`generateStaticParams` emits the full SEO segments and `dynamicParams = false`,
so **`/library/the-fool/` 404s**. That is deliberate: two URLs serving one page
is the thing an SEO pattern exists to prevent.

`suitPath()` exists and is unused. It records the confirmed
`-tarot-suit-meaning` pattern in code so the suit rename is one line and four
directory moves.

## The page inverts the site, and two panels inside it do not

This is the thing most likely to be mis-assumed here. Every other page on the
site is light type on `--color-night`. This one is near-black on parchment, and
`.library-card-page` sets that ink once so the blocks inside inherit it.

**But `AppearsPanel` and `ShadowPanel` are not part of the inversion.** They are
the site's own gold and cream on near-black — the same `--color-gold` and
`--color-cream` every other page uses — and they override what they inherit.
They are dark islands in a light page, not exceptions to a rule.

The page's own colours are `--color-card-*`, and the prefix is load-bearing:
**`--color-ink` was already taken** by the brand blue the header and footer are
drawn in. Redefining it here would have moved site chrome on every page.

## The type tokens are in `@theme`, and they have to be

The first draft scoped `--text-card-*` inside `.library-card-page`, which looks
tidier and does not work: **Tailwind generates `text-*` utilities from `@theme`
and from nowhere else**, so scoped properties would have set five variables no
utility reads, and every `text-card-body` on the page would have silently
fallen back to inherited type. Same for `--color-card-ink`, which is why
`text-card-ink` resolves.

## The green rule is a `Divider` variant, not a tone

Worth stating because the two words look interchangeable. `ClosingSaying`'s
`tone` colours **text**; the rules above and below it are `Divider`s, and
**every `Divider` variant is an image**. There is no colour property on a
picture of a rule, so "green rules" cannot be a tone value.

The page draws that rule **three times** — under the card's name, around
`LOOK FOR`, and at the closing — so it earns `divider--green` with its own
asset and its own `--measure-rule-green` (582px, as she draws it).

`ClosingSaying` gained an `ink` tone for this page, and **the size travels with
it**: the readings frames set that closing line at 50px and this frame sets it
at 42px, so on this page they are one decision rather than two.

The shadow panel's rule is the exception that proves the point: it stays the
site's gold `heroWide`, because her frame tints it `rgba(188,171,130,0.93)` —
the champagne the rest of the site uses. The panel is the site's palette, so
green there would be consistency with the wrong neighbour.

## Two measures, because she draws two

Her prose column is 1035px (`--container-card`) and her panels are wider at
1234px (`--container-card-wide`). The dark panels, the spheres and the meta
strip break out past the text rather than everything sharing one column.
Neither width existed on the site before: `measure` is 1153px and `library` is
914px, and both would have been visibly wrong.

## The parchment repeats, and cannot do otherwise

`.page-atmosphere-card-reference` is the one backdrop on the site that is not a
fixed-aspect image, and the reason is structural. Every other room sits behind
a page whose height the frame fixes, so `cover` on a width-driven box
reproduces the composition exactly. **This page's height is content-driven**:
twenty-two cards will have essays of different lengths, and her frame is only
as long as The Fool's copy makes it. A `cover` box would crop her torn edges
off a long card and letterbox a short one.

So the paper tiles down the page — `background-size: 100% auto` keeps it at
full width and its own aspect, `repeat-y` fills the rest. A longer card shows
more paper, which is what paper does.

The seam is invisible because the source is an even wash rather than a
composition. **If a horizontal line ever appears here, that is the first thing
to check**, and the fix is a mirrored tile rather than a taller image.

## The artwork is composed renders, never raw fills

The Library's rotunda warning, and this page is where it cost the most time.
Several layers in this frame are **a texture plus a colour overlay**: the
dividers under `rgba(23,72,20,0.93)`, the four meta symbols under
`rgba(130,124,113,0.93)`.

Figma's `rawImages` for those returns the texture **untinted**. Measured during
the build: the meta symbols come back as **pure black** (rgb 0,0,0) — they are
silhouette masks — against the grey-taupe rgb(123,117,107) the page actually
shows. Shipping the obvious field would have put four black blobs on the page.

`scripts/optimize-card-assets.mjs` converts them and its header says which
field to re-fetch from. Twenty assets, 7.7MB of PNG down to 182kB of webp;
`images.unoptimized` is set, so that conversion is not optional.

## What was added below `lg`, and that she drew none of it

Her frame is desktop-only. Below `lg` the design stops scaling and the gutter
does the work (`src/app/README.md`), and every rearrangement here is an
**addition** in the same class as the mobile menu button:

| Block | Below `lg` |
|---|---|
| `CardEssay` | artwork above the prose, centred — a 260px picture beside the prose column has no honest narrow form |
| `AppearsPanel` | four columns to two, then one; the vertical rules turn horizontal, because a vertical rule between stacked blocks separates nothing |
| `SpheresCarousel` | an Embla strip below `sm` — three cards stacked is three screens of scrolling |
| `ShadowPanel` | the silhouette drops out below `sm`; it bleeds off the left edge by design and would sit under the text at phone width |
| `MetaStrip` | five columns wrap to three, then two |

**The carousel's breakpoint is written in three places and all three must
agree**: globals.css's "Carousels" block, the `max-sm:`/`sm:` classes on the
track, and Embla's own `breakpoints` key. A mismatch leaves a flex row Embla no
longer drives. Never put horizontal padding on the carousel window or track —
Embla measures the border box.

## Two slips in her mockup, both ignored

The same judgement `content/library.ts` already records for the deck's names —
fix outright misspellings, keep deck-specific naming:

- **`the unkown`** (node 357:336) is corrected to "the unknown", the rule that
  fixed `THE EMPORER`. (`THE HANGMAN` was corrected alongside it until she
  confirmed it is the deck's name; it is hers and is kept.)
- **A stray `MONEY`** (node 357:292) sits behind the real `money` heading at a
  different size and position. A leftover layer, the same class of slip as The
  Tower appearing twice in the grid, and it is not drawn.

Both are worth mentioning to the client rather than silently absorbing.

## The masthead and the footer are additions

Her frame draws neither — it begins at the paper's torn top edge. They stay
because a visitor arriving from a search has to be able to leave, and they are
now the only way off this page: **the "Return to the Library" link** that sat
in the empty paper under the closing line **was removed at the client's
request**. The string stays in `content/library.ts` because `ComingSoonPage`
still uses it.

**There is deliberately no prev/next** either: twenty-one of twenty-two
destinations are placeholders today, and arrows that mostly lead to "being
written" are worse than no arrows.
