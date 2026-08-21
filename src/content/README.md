# Content layer

`site.ts`, `home.ts` and `cards.ts` hold every piece of copy and every
content-driven list (nav links, products, testimonials, the card roster) that
appears on the homepage. Components import from here and render; they don't
own strings. This split exists so the wording — which comes directly from the
client, a designer rather than a developer, working from a PSD — can move to
a CMS later without touching layout or JSX. If you're adding a new piece of
homepage copy, it belongs in `home.ts`, not inlined in a component.

## "A CMS later" has started, for products

**`products` in `home.ts` is no longer where the tile copy comes from.** Name,
description and price are read from `GET /api/v1/{locale}/products` at runtime
and the bundled entries are the fallback for when the backend can't be reached.
See [`docs/plans/products-api-wiring.md`](../../docs/plans/products-api-wiring.md).

What stayed here, because none of it is in the product contract and none of it
is coming: `key`, `action`, `href` and `image`. A tile can't render without its
artwork, so **this list still decides which tiles exist and in what order** —
the API only decides what they say. Publishing a fifth product doesn't put it on
the homepage; adding it here does.

Nothing else on the page is wired this way yet. The rest of `home.ts` is still
the only source for its own copy.

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

The videos are to be served from a **backend endpoint**, not `public/`.
`TarotCard.video` is a plain URL string precisely so that switch costs nothing
downstream — the seam is `RevealProvider` picking the card, which is what will
fetch `{ id, number, name, video }`. The MP4 in `public/videos` is a
placeholder standing in until that endpoint exists, compressed the same way
`card-back-compressed.mp4` was (H.264 CRF 24, `+faststart` so playback can
begin before the whole file lands).

## `site.ts` — routes that don't exist yet

`primaryNav` and `footerNav` point at paths from the client's navigation
document (`/world-tarot`, `/living-tarot`, `/readings`, `/library`, `/faq`,
etc.). None of those routes are built — only `/` exists under `src/app` (the
`/concept` sunrise-hero experiment route was removed; its components remain
under `src/components/concept` for reference — see that folder's README).
The links are intentionally live/correct now so that adding a route later is
just adding a page under `src/app`, not also hunting down every place that
linked to it.

## Products (`home.ts`)

The four `products` (One Card, Three Card, Month Ahead, Viewing Room) look
like four equally-custom flows, but per the client only two actually differ
in workflow.

A fifth reading, **In Depth**, exists in the backend catalogue and is seeded and
priced, so it comes back from `/products`. It has no tile here and no artwork,
so the merge ignores it. Giving it one is a frontend change, not a backend one.

The workflows:

- **Three Card** and **Month Ahead** (plus a future "In-Depth" reading, not
  yet in this list) share one page template and one fulfillment path: the
  site collects the visitor's question and sends an order notification: the
  client prepares the reading offline and emails a PDF. Spread, card count and
  reading format only affect page copy/pricing, never frontend logic — don't
  build per-product reading-delivery UI for these beyond the shared template.
- **One Card** is the interactive online AI experience — genuinely different
  functionality, not just different copy.
- **Viewing Room** is a paid pass into the full cinematic card collection
  (all 22 Living Tarot videos), not a "reading" with a question/fulfillment
  step at all.
