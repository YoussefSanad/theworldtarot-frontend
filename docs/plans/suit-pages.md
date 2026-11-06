# The Suit Pages

> **Written 6 October 2026.** One reference page per suit — Cups, Pentacles, Swords, Wands —
> from the client's four mockups, each 1920x3237 and each composed on the same torn sheet over
> the same night sky as a Major Arcana card's page.
>
> **Everything needed is in hand.** The four parchments and their four mobile counterparts were
> delivered while this plan was being written, the copy is transcribed verbatim from her frames
> below, and the emblems turn out to be painted into the parchments rather than placed over them
> — so there is no scaffolding in this plan and nothing waiting on a later delivery.
>
> It also makes LIBRARY a navigation group in the masthead, the way READINGS already is, and
> applies the suit SEO URL pattern that `content/library.ts` has recorded as confirmed since
> the Library page shipped.

---

## What the four frames show, and what they share

All four are the same page with four palettes. Read side by side they settle the whole design:

| | Cups | Pentacles | Swords | Wands |
|---|---|---|---|---|
| Wash | teal / sea green | gold / olive | slate blue | orange / amber |
| Emblem | chalice | spilling coin pouch | longsword | lit torch |
| Emblem extent | upper third | upper third | nearly full sheet | nearly full sheet |
| Keywords | EMOTION · INTUITION · CONNECTION | ABUNDANCE · STABILITY · GROWTH | MIND · TRUTH · CLARITY | PASSION · ACTION · CREATION |

**The wash is the element's colour** — water, earth, air, fire. It is painted into the sheet
itself rather than applied over it, which is why the sheet is a per-suit asset and not one
shared parchment tinted four ways.

**The emblem's height is per-suit and is not derivable.** The chalice and the pouch sit in the
upper third; the sword and the torch run nearly the full height of the sheet, passing *behind*
the KEY THEMES rule and the sphere cards. So the emblem is not a figure beside a paragraph the
way a card's artwork is — it is a full-bleed element in its own layer, and each suit gives it
its own size and offset.

**Every block is one the card pages already have**, with one exception:

| Block in the frame | What renders it |
|---|---|
| Torn sheet over night sky | `.card-paper` + `PageAtmosphere variant="card-reference"` |
| Suit name, green rule, keywords | `CardHeader`, generalised (below) |
| Emblem bleeding off the left | painted into the parchment — nothing to build |
| Three intro paragraphs | plain markup in `SuitReferencePage` |
| KEY THEMES rule + centred lines | `LookFor` — already takes plain data |
| LOVE / CAREER / MONEY | `SpheresCarousel` |
| Quote between two rules | `ClosingSaying` |
| THE X ARE STILL UNFOLDING | **new** — `StillUnfolding` |

Nothing in any of the four frames corresponds to `AppearsPanel`, `ShadowPanel` or `MetaStrip`.
A suit has no Roman numeral, no element/planet/sign strip and no yes/no. Those three components
are untouched by this work.

## Two components are generalised, and one deliberately is not

**`CardHeader` is generalised.** It renders a numeral, a name, a rule and keywords — the suit
frame draws the same thing without the numeral, which the component already treats as its own
line. Its props narrow from `{ card: MajorArcanaCard }` to `{ heading, eyebrow?, keywords }`.
Two call sites change; no rendered output on any card page changes.

**`LookFor` is generalised**, by one prop: its heading is hard-coded as "LOOK FOR:" and the suit
frames put "KEY THEMES" in the same rule. Detailed under the page composition below, with the
mask that has to follow it.

**`CardEssay` is NOT generalised, and this is the one place the plan parts from "reuse
everything".** It looks like the suit's intro block and is not: it draws the *card tile* — the
plaque with the name laid into it, the long-name rule for THE HIGH PRIESTESS, the `xl` switch
that puts the card beside the prose and the `25.1vw` cap that leaves the prose a measure. A
suit has no tile, no plaque and no name overlay, and its emblem bleeds off the sheet instead of
sitting in the column. Bending that component to cover both would mean a prop that switches off
most of what it does, which is two components wearing one name.

So the suit's intro is **paragraphs in `SuitReferencePage`** — the `text-pretty`,
`--text-card-label` and gap values copied across, because those are the client's type and the
frames set them identically — and the emblem is its own absolutely-positioned layer. The
shared leaf components (`LookFor`, `SpheresCarousel`, `ClosingSaying`, `Divider`) are used
unchanged, so a later fix to any of them still lands on both page kinds at once.

## Routes: the SEO pattern, applied

`content/library.ts` has carried `suitPath()` since the Library shipped, with a note that the
pattern is "confirmed, and not yet applied" and that applying it is "this one line plus four
directory moves". The suits are getting real content to index, so it is applied now rather than
after the URLs have been crawled:

```
/library/cups/       →  /library/cups-tarot-suit-meaning/
/library/pentacles/  →  /library/pentacles-tarot-suit-meaning/
/library/swords/     →  /library/swords-tarot-suit-meaning/
/library/wands/      →  /library/wands-tarot-suit-meaning/
```

`suits[].href` stops being a hand-written literal and becomes `suitPath(suit)`, so the pattern
lives in the function that already spells it. Static segments still beat `[card]` in Next's
matching, so `/library/cups-tarot-suit-meaning/` cannot be read as a card. No redirect is added
from the old paths: nothing links to them but this repo, and `SuitNav` and the footer are
updated in the same change.

The suffix is `-tarot-suit-meaning` against the cards' `-tarot-meaning`, which is hers.

## Content: `src/content/suit-content.ts`

A new module beside `card-content.ts`, and the split between the two files is the same one that
already holds: `library.ts` owns a suit's *identity* (slug, label, title, href), `suit-content.ts`
owns its *copy*.

```ts
export type SuitContent = {
  /** EMOTION · INTUITION · CONNECTION — under the rule, in caps. */
  keywords: string;
  /** The three intro paragraphs, beside the emblem. */
  essay: readonly string[];
  /** The centred lines under the KEY THEMES rule. */
  keyThemes: readonly string[];
  spheres: { love: string; career: string; money: string };
  /** The saying between the two rules. */
  closing: readonly string[];
  unfolding: { heading: string; body: readonly string[] };
  metaDescription: string;
};
```

`Suit` in `library.ts` gains `readonly content?: SuitContent`, exactly as `MajorArcanaCard`
carries an optional `content`. **A suit with copy renders `SuitReferencePage`; a suit without it
keeps today's `ComingSoonPage`** — the same one `if` the card route has, and it disappears per
suit as copy lands. All four have copy on day one, so the branch is dead immediately; it stays
because it costs one line and it is what makes a fifth suit, or a suit whose copy is pulled, a
content change rather than a code change.

### The copy, verbatim

Transcribed from the four frames. Her em-dashes, her ampersands, her `&` vs `and` mix and her
sentence case are reproduced as drawn, per the standing rule that client copy is copied, not
corrected — the same rule under which `card-content.ts` carries her `fufillment` and
`SOVREIGNTY`.

Two of her frames hyphenate a word across a line break (`fulfill-ment`, `abun-dance`,
`inten-tion`, `rela-tionship`). That is her layout engine breaking a word to fit her measure,
not her spelling, so the copy stores the whole word and this page's own wrapping decides where
lines end.

**Cups** — `EMOTION · INTUITION · CONNECTION`

> The suit of Cups represents the realm of the heart—emotion, intuition, relationships, and our
> inner world. Cups speak to love, longing, compassion, creativity, and the feelings that shape
> our experience.
>
> This is a suit of receptivity and connection. Cups invite us to trust what we feel, deepen our
> relationships, and listen to the quiet wisdom within. They often signal love, emotional
> healing, creative inspiration, and meaningful connection.
>
> At their highest expression, Cups bring empathy, fulfillment, and emotional wisdom—the
> understanding that what moves the heart can guide us as powerfully as the mind.

Key themes: `emotion and intuition · love and connection` / `relationships & compassion ·
creativity & imagination` / `emotional healing & fulfillment · dreams & the subconscious`

Love: *Deepens emotional connection, intimacy, and understanding. Cups encourage openness,
compassion, and following the heart while remaining true to what you feel.*
Career: *Points toward meaningful work, creativity, and emotional fulfillment. Trust your
instincts and consider whether the path you're on genuinely inspires you.*
Money: *Encourages an intuitive but balanced relationship with money. Let your values guide
financial choices, while keeping emotion from clouding practical judgment.*

Closing: *The heart is a vessel that remembers / what the mind has forgotten.*
Unfolding: **THE CUPS ARE STILL UNFOLDING** — *New cards will be added to the Library as they
are created. Return to explore each Cup in depth—its imagery, symbolism, meaning, and place
within the journey of the suit.*

**Pentacles** — `ABUNDANCE · STABILITY · GROWTH`

> The suit of Pentacles represents the material world—money, work, home, health, and the
> resources that support our lives. Pentacles ground us in what is tangible, asking us to
> consider what we are building, protecting, and creating for the future.
>
> This is a suit of steady growth and practical action. Pentacles speak to opportunity,
> prosperity, security, and the rewards that come through patience, skill, and consistent
> effort. They remind us that lasting abundance is cultivated over time.
>
> At their highest expression, Pentacles bring stability, self-reliance, and fulfillment—the
> ability to turn intention into something real, valuable, and enduring.

Key themes: `money and resources · work and achievement` / `security & stability · health &
well-being` / `growth & prosperity · patience & perseverance`

Love: *Favors loyalty, commitment, and relationships built on a solid foundation. Pentacles
bring stability, trust, and the desire to create something lasting together.*
Career: *Signals steady progress, skill, and meaningful achievement. Consistent effort and
practical choices can build lasting success and open new opportunities.*
Money: *Strongly connected to prosperity, security, and material growth. Pentacles encourage
wise use of resources and building wealth with patience and purpose.*

Closing: *The physical world is where our intentions take form— / through what we build,
nurture, value, and sustain*
Unfolding: **THE PENTACLES ARE STILL UNFOLDING** — *New cards will be added to the Library as
they are created. Return to explore each Pentacle in depth—its imagery, symbolism, meaning, and
place within the journey of the suit.*

**Swords** — `MIND · TRUTH · CLARITY`

> The suit of Swords represents the realm of the mind—thought, communication, truth, and higher
> awareness. Swords cut through illusion, revealing what is real and demanding clarity,
> discernment, and conscious choice.
>
> This is a suit of focused power: the unseen force of intellect, intention, and conviction that
> can change the course of our lives. Swords often signal decisive moments, necessary change,
> and the courage to act on what we know.
>
> At their highest expression, they bring insight, purpose, and the mental strength to move
> forward with clarity and resolve.

Key themes: `intellect and reasoning · clear communication · truth & honesty` / `decisions &
discernment · boundaries & protection` / `mental challenges & overthinking · breaking free from
old patterns`

Love: *Calls for honest communication, clear boundaries, and seeing a relationship as it truly
is. Truth may bring understanding—or reveal what needs to change.*
Career: *Favors clear thinking, decisive action, and strategic choices. Focus and sound judgment
can cut through obstacles and create a strong path forward.*
Money: *Encourages careful analysis, informed decisions, and a clear-eyed approach to finances.
Look beyond emotion and act on facts, not assumptions.*

Closing: *The mind, when clear, becomes a blade of light / that cuts through every shadow*
Unfolding: **THE SWORDS ARE STILL UNFOLDING** — *New cards will be added to the Library as they
are created. Return to explore each Sword in depth—its imagery, symbolism, meaning, and place
within the journey of the suit.*

**Wands** — `PASSION · ACTION · CREATION`

> The suit of Wands represents the realm of fire—passion, energy, creativity, ambition, and the
> spark that moves us to act. Wands speak to inspiration and possibility, urging us to pursue
> what excites us and bring our ideas to life.
>
> This is a suit of movement and personal power. Wands often signal new beginnings, bold choices,
> growth, and the determination to move forward. Their energy can be spontaneous and intense,
> reminding us that inspiration becomes meaningful when we have the courage to act upon it.
>
> At their highest expression, Wands bring confidence, purpose, and creative force—the inner fire
> that drives us to explore, take risks, overcome challenges, and shape our own direction.

Key themes: `passion and inspiration · creativity and ambition` / `action & initiative · courage
& confidence` / `growth & adventure · drive & determination`

Love: *Brings passion, attraction, and renewed energy to relationships. Wands encourage openness,
spontaneity, and the courage to pursue what—and whom—sets the heart alight.*
Career: *Signals ambition, opportunity, and forward momentum. Take initiative, trust your ideas,
and use your creativity and confidence to pursue new possibilities.*
Money: *Encourages bold but purposeful action with finances. New opportunities may emerge through
initiative, enterprise, or creative thinking—just temper enthusiasm with good judgment.*

Closing: *The fire within becomes a force in / the world when we choose to act*
Unfolding: **THE WANDS ARE STILL UNFOLDING** — *New cards will be added to the Library as they
are created. Return to explore each Wand in depth—its imagery, symbolism, meaning, and place
within the journey of the suit.*

**Note on the singular in the unfolding block.** "each Cup", "each Pentacle", "each Sword",
"each Wand" — she writes the singular of the suit, and it is irregular enough across the four
(Pentacles → Pentacle, not "Pentacles card") that it is stored as written rather than derived.
The whole sentence is in `unfolding.body`, so nothing is assembled from parts.

## Assets: her artwork, delivered

**The artwork arrived while this plan was being written, so nothing here is scaffolded.** The
Fool stand-ins the first draft described are gone, and so is the component that was going to
position an emblem.

```ts
// lib/assets.ts
export const suitPaper       = (slug: string) => `/figma/suit-reference/paper/${slug}.webp`;
export const suitPaperMobile = (slug: string) => `/figma/suit-reference/paper-mobile/${slug}.webp`;
```

Two maps, mirroring `cardPaper`/`cardPaperMobile` exactly. The sphere cards reuse the existing
`sphere-love/career/money.webp` — her four frames draw them unchanged from the card pages.

**The emblem is painted into the parchment.** The chalice, the coin pouch, the sword and the
torch are part of the sheet image, not separate layers to place — confirmed from the delivered
files. So there is no `SuitEmblem` component, no per-suit geometry map and nothing to position:
the sheet is one picture, as a card's sheet is. What the page does instead is leave the emblem
room, which is the next section.

### What was delivered, and the one thing to know about it

| | desktop sheet | aspect | mobile |
|---|---|---|---|
| Cups | 1460x2851 | 0.5121 | 390x3500 |
| Pentacles | 1461x2844 | 0.5137 | 390x3500 |
| Swords | 1464x2859 | 0.5121 | 390x3500 |
| Wands | 1451x2836 | 0.5116 | 390x3500 |

**The four aspects agree to within 0.4%**, so one sheet box fits all four with no distortion, no
letterboxing and no cropping. They are ~1460 wide against the card sheets' 1337 — a wider sheet
of the same frame, which `.card-paper` handles by being a box the image fills.

This is worth recording because **the first export of these files did not have that property**:
it was trimmed to each layer's own bounds, which produced widths from 1084 to 1460 — a 33% spread
of aspect ratios — and cut the right-hand deckle off three of the four. No CSS can make four
different aspects render as one box undistorted; the options were all bad (stretch, gap, or crop
her parchment). **The client re-exported on a fixed canvas and both faults went away.** If a
future suit sheet ever arrives looking wrong in this layout, check its aspect against the table
above before changing any CSS — a trimmed export is the likely cause.

The mobile files are 390x3500, the exact dimensions of the existing `paper-mobile/*.webp`, so
they need no new machinery at all. A fifth file, `THE FOOL MOBILE BKGRND.png`, came in the same
delivery and replaces the Fool's current mobile sheet; it is **out of scope here** and belongs to
the asset-replacement pass that owns the card pages.

Conversion to webp follows whatever `scripts/` already does for the card assets.

## Page: `src/components/library/suit/SuitReferencePage.tsx`

Composes, in her order, on the card page's own measurement system — `--card-scale`,
`--measure-card-paper`, `.card-paper`, `.card-reading-ground` all apply unchanged, because both
frames are 1920x3237 and the sheet occupies the same box in each. `.card-paper` paints one image
at `100% 100%`, so a suit sheet of a different intrinsic height needs no new machinery.

```
PageAtmosphere variant="card-reference"
└ .card-paper                        ← the emblem is painted into this image
  ├ .card-reading-ground
  │ ├ CardHeader  heading=Cups  keywords=EMOTION · INTUITION · CONNECTION
  │ └ essay paragraphs               ← in the right-hand column, clearing the emblem
  ├ LookFor  label="KEY THEMES"  lines=keyThemes
  ├ SpheresCarousel
  ├ ClosingSaying  rule="green"  action={null}  hugRule
  └ StillUnfolding
```

**`LibraryIntro` and `SuitNav` sit above the sheet**, so the Library's own navigation —
`MAJOR ARCANA | SWORDS | CUPS | WANDS | PENTACLES` — is present with the current suit marked
via `SuitNav`'s existing `current` prop. Her frames draw neither, the same way the card frame
draws no masthead: a visitor who lands here from a search must be able to get to the other
three suits and back to the grid, and the strip is how the rest of the Library already does
that.

**The emblem's room is a column with nothing in it, and that is the layout.** Her emblem sits
exactly where a card's tile sits on a card reference page — left of the prose, same band of the
sheet — and because it is painted into the parchment there is no element to place there. So the
opening section is the card page's two-column arrangement with the left column left empty: the
heading and the three paragraphs occupy the right-hand column, and the emblem shows through from
the sheet beneath.

Everything below that section — KEY THEMES, the sphere cards, the saying, the unfolding block —
runs the sheet's full measure and simply passes over the emblem where it extends (the sword and
the torch run most of the sheet's height; the chalice and the pouch stop in the upper third).
That is her composition: those blocks are centred on the sheet, not on the prose column.

**Below `lg` the empty column collapses and the mobile sheet takes over**, which is the card
page's own behaviour — her 390x3500 mobile backgrounds are drawn for the stacked layout, with the
emblem placed for it, so the text runs the full width over them and no column arithmetic
survives into the phone layout.

`LookFor` currently hard-codes the words "LOOK FOR:". It gains a `label` prop defaulting to
today's string. The gap cut in the rule is already the custom property `--look-for-gap: 12ch` on
`.look-for__rule`, sized for "LOOK FOR:" plus clearance — so the component sets that property
inline from the label's own length rather than the CSS changing. "KEY THEMES" is the same
character count, so today's figure is unchanged in practice; driving it from the label is what
keeps the next caller's words from sitting on the line.

## `StillUnfolding`

The one genuinely new block: a bold centred heading over two or three centred lines, under the
closing rule. Built as a real component with its own copy per suit — it is her design for the
page as it stands, and it is where a card grid goes when the Minor Arcana are drawn.

## Header: LIBRARY becomes a `NavGroup`

Content-only. `NavDropdown` is already generic over any `NavGroup` and `SiteHeader` already
branches on `"children" in item`, so no component changes — the hover-opens / label-navigates
behaviour, the chevron for touch, the drawer's indented rows all come for free.

```ts
{
  label: "LIBRARY",
  href: "/library/",
  children: [
    { label: "MAJOR ARCANA", href: "/library/" },
    { label: "SWORDS",       href: "/library/swords-tarot-suit-meaning/" },
    { label: "CUPS",         href: "/library/cups-tarot-suit-meaning/" },
    { label: "WANDS",        href: "/library/wands-tarot-suit-meaning/" },
    { label: "PENTACLES",    href: "/library/pentacles-tarot-suit-meaning/" },
  ],
}
```

The children are `[majorArcanaNav, ...suits]` — the same list `SuitNav` builds — so the masthead
dropdown and the strip above the grid cannot drift apart.

**The first row is the redundant link to the Library, requested explicitly.** `site.ts` records
that READINGS *dropped* its OVERVIEW child because the group's label already goes there, and by
that test this row is the same destination offered twice. It is here because the client asked
for the redundancy, and it is labelled MAJOR ARCANA rather than LIBRARY so it reads as a
destination — the grid — rather than as an echo of the label above it. That is also exactly
what the row points at, and what `SuitNav` calls the same link.

The suit order is hers: SWORDS, CUPS, WANDS, PENTACLES, as `suits` already lists them.

## Testing

Follows the existing library tests:

- every `suits[].href` matches a suit SEO URL pattern, and the pattern is asserted against the
  "lowercase, hyphenated" brief the way `CARD_PATH_PATTERN` already is
- each of the four routes is in the static export, and the old `/library/cups/` is not
- a suit with no `content` renders `ComingSoonPage`; a suit with content does not
- every `href` under LIBRARY's `children` resolves to a route that is built
- `CardHeader`'s generalisation does not change what a card page renders

## What this plan does not do

- **No Minor Arcana card pages.** The suits describe the suit; the 56 cards have neither copy
  nor artwork, and the unfolding block is what says so.
- **No redirects** from the four old suit URLs.
- **No change to `AppearsPanel`, `ShadowPanel` or `MetaStrip`**, which no suit frame uses.
- **No `SuitEmblem` component.** The emblems are painted into the parchments; there is nothing
  to position.
- **No replacement of the Fool's mobile sheet**, though its new file arrived in the same
  delivery. That belongs to the asset pass that owns the card pages.
