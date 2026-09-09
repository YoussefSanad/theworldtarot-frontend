# Content layer

`site.ts`, `home.ts` and `cards.ts` hold every piece of copy and every
content-driven list (nav links, products, testimonials, the card roster) that
appears on the homepage. `readings.ts` does the same for the readings index and
`reading-pages.ts` for a single reading's page — the latter split into the
copy the three written readings share and the handful of things each changes,
because they are one page template (see below).

Two exports there are settings rather than copy, and both are the CMS's to own
when there is one: `rushDelivery.enabled`, the switch that decides whether a
reading offers a paid delivery upgrade at all, and `questionLimit`, the number
the question field enforces and its counter reads from. Components import from here and render; they don't
own strings. This split exists so the wording — which comes directly from the
client, a designer rather than a developer, working from a PSD — can move to
a CMS later without touching layout or JSX. If you're adding a new piece of
homepage copy, it belongs in `home.ts`, not inlined in a component.

## Where the words come from

Every string this folder exports is read from
[`locales/`](locales/README.md) — one JSON file per module, one folder per
language. What stays in the `.ts` is everything that is *not* words: types,
`href`s, artwork, `key`s, and all the argument in the doc comments. A module
imports its own JSON, merges it with that structure, and exports the same shapes
it always did, so no component knows this happened.

Two things follow, and both matter when you edit here:

- **Add copy to the JSON, not the `.ts`.** A string typed into a `.ts` file is a
  hole a translator cannot reach — invisible for an `aria-label`, which is how
  six of them survived until they were swept up.
- **A `href` never crosses over.** A translator who finds `/readings/month-ahead/`
  in their file will eventually edit it, and the link breaks in one language
  only. `site.test.ts` guards that boundary; the arrays of paths that stay in the
  `.ts` are matched to their labels by position.

## What the API supplies, and when

**One rule: the price is always the backend's. A word is the backend's only
while the backend is answering in the language being read.**

`apiServesDisplayLocale()` in [`lib/locale.ts`](../lib/locale.ts) is that rule in
one line — `apiLocale() === currentLocale()`. Today the backend is pinned to
English while its own translation work is unfinished, so:

| The visitor is reading | Tile names, reading names, card names | Prices |
|---|---|---|
| English | the API's, editable in the admin panel | the API's |
| Spanish | this folder's, from `locales/es/` | the API's |

`resolveProducts` in `lib/products.ts` and `resolveReadingName` in
`lib/reading-prices.ts` both take that flag as a parameter so they stay pure and
a test can drive both sides. The day the backend serves Spanish, `apiLocale()`
follows the display language, the two match, and nothing else changes.

**A price is never subject to it.** A number is the same in every language, and a
stale one is money nobody is charging.

The original wiring is still worth reading for the shape of the merge:
[`docs/plans/products-api-wiring.md`](../../docs/plans/products-api-wiring.md).

**This list still decides which tiles exist and in what order.** `key`, `action`,
`href` and `image` were never in the product contract, and a tile cannot render
without its artwork — so publishing a fifth product does not put it on the
homepage; adding it here does.

~~**This copy is the source of truth for what the backend seeds.**~~ **Struck
6 September 2026.** That claim asked this file to stay verified character for
character against `ProductKey::defaultName` and `defaultShortDescription`. It is
no longer owed: those fields are read only for a reader whose language the
backend serves, and where they disagree with this file, the panel is the one that
wins on screen. `defaultPrices` is the one that still matters.

## `cards.ts` and the one-card constraint

Only **The Star** (`livingTarot[0]`) is wired up. This isn't a placeholder
that was forgotten — the client is supplying the full set of 22 Living Tarot
MP4s (one per Major Arcana card) plus a shared card-back loop video, and
committed to providing all video content for the site (homepage reveal, the
One Card Experience, and the Viewing Room all reuse the same 22 files, not
separate sets per section). Until the rest arrive, `defaultRevealCard`
always resolves to The Star and the reveal in
[`src/components/reveal`](../components/reveal) never picks anything else.

When the full set lands:

1. Add each card to `livingTarot` with its id, display name and face asset
   (register the asset in [`src/lib/assets.ts`](../lib/assets.ts) first,
   following the existing `cardFaces` pattern).
2. `RevealProvider` needs to pick a card at random on mount instead of always
   using `defaultRevealCard` — `findCard(id)` already exists for turning a
   restored session id back into a `TarotCard`, so the random-pick path and
   the restored-visit path both resolve through the same lookup.
3. Each card needs both a `video` (what plays on reveal) and an `image` (its
   closing frame, which is what a restored visit shows — see
   [`components/reveal/README.md`](../components/reveal/README.md)).

## Where the videos come from

This flipped twice. `10ad8ee` replaced the reveal's playing video with a still
image; the client has since reversed that, so the reveal plays a video again.

One video is not part of this and should not be moved behind that seam: the
loop under a reading page's title (`videos.readingCards`) is page furniture —
the deck, shared by all three written readings — rather than a card. It lives
in `public/videos` and stays there.

The Living Tarot films are to be served from a **backend endpoint**, not `public/`.
`TarotCard.video` is a plain URL string precisely so that switch costs nothing
downstream — the seam is `RevealProvider` picking the card, which is what will
fetch `{ id, number, name, video }`. The MP4 in `public/videos` is a
placeholder standing in until that endpoint exists, compressed the same way
`card-back-compressed.mp4` was (H.264 CRF 24, `+faststart` so playback can
begin before the whole file lands).

## `site.ts` — routes that don't exist yet

`primaryNav` and `footerNav` point at paths from the client's navigation
document (`/world-tarot`, `/living-tarot`, `/readings`, `/library`, `/faq`,
etc.). Several are now built — `/readings/` and its three written readings,
`/world-tarot/`, `/login/` and `/library/` — and the rest are not (the
`/concept` sunrise-hero experiment route was removed; its components remain
under `src/components/concept` for reference — see that folder's README).
The links are intentionally live/correct now so that adding a route later is
just adding a page under `src/app`, not also hunting down every place that
linked to it. **A built path carries a trailing slash and an unbuilt one does
not** — the reasoning is in `site.ts`'s own header.

## `library.ts`

The Library's copy and its two rosters: the twenty-two Major Arcana and the four
suits. The names are the client's, with her outright typos fixed and her deck's
own naming kept, and the ordering is numerical where her mockup's is not — both
decisions are argued in the file and in
[`src/components/library/README.md`](../components/library/README.md).

Alt text is *derived* from the name (`cardAlt`) rather than written out
twenty-two times, so it cannot drift from what the plaque prints.

## Products (`home.ts`)

The four `products` (One Card, Three Card, Month Ahead, Viewing Room) look
like four equally-custom flows, but per the client only two actually differ
in workflow.

A fifth reading, **In Depth**, exists in the backend catalogue and is seeded and
priced, so it comes back from `/products`. It has no tile here and no artwork,
so the merge ignores it. Giving it one is a frontend change, not a backend one.

The workflows:

- **Three Card**, **Month Ahead** and **In-Depth** share one page template and
  one fulfillment path: the site collects the visitor's question and sends an
  order notification: the client prepares the reading offline and emails a PDF.
  Spread, card count and reading format only affect page copy/pricing, never
  frontend logic — don't build per-product reading-delivery UI for these beyond
  the shared template. **All three are built**, from the Month Ahead frame plus
  the two the client drew from it on 2 September 2026: the pages live at
  `src/app/(site)/readings/{three-card,month-ahead,in-depth}/` and their copy at
  `reading-pages.ts`, where each is a `ReadingPage` entry and the routes differ
  only in which one they import — see
  [`src/components/reading/README.md`](../components/reading/README.md).
- **One Card** is the interactive online AI experience — genuinely different
  functionality, not just different copy.
- **Viewing Room** is a paid pass into the full cinematic card collection
  (all 22 Living Tarot videos), not a "reading" with a question/fulfillment
  step at all.
