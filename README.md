# The World Tarot

A Next.js implementation of the World Tarot site, built from the Figma designs
converted from the client's PSDs. Five routes so far — the three below, plus
`/login/` and `/redeem/`:

- the **homepage** (`node 102:3`), together with the reusable card **Reveal**
  the rest of the site is built around;
- **Readings** (`node 300:68`) — see
  [`src/components/readings/README.md`](src/components/readings/README.md) for
  what that frame's conversion gets wrong and how the bordered panels are built;
- **Month Ahead Reading** (`node 329:496`), the first of the three written
  readings that share one page template — see
  [`src/components/reading/README.md`](src/components/reading/README.md).

```bash
npm install
npm run dev     # http://localhost:3000
```

## Stack

| Concern     | Choice                                            |
| ----------- | ------------------------------------------------- |
| Framework   | Next.js 16 (App Router), React 19, TypeScript     |
| Styling     | Tailwind CSS v4 with a design-token layer         |
| Motion      | Motion (`motion/react`) for the reveal crossfade  |
| Carousel    | Embla (`embla-carousel-react`) for the mobile product row |
| Type        | Magically + Gill Sans (local), Cinzel via Google |

## How the styling works

Everything visual resolves to a token declared in `src/app/globals.css`. There
are no hard-coded brand colours or font sizes in components.

- **Colour** comes from `@theme` (`--color-gold`, `--color-champagne`, …),
  sampled from the client style sheet and confirmed against the Figma exports.
- **Type is fluid.** Each step is a `clamp()` whose maximum is the Figma value at
  a 1920px viewport, so the page is 1:1 with the design on a full-width desktop
  and scales proportionally below that — `--text-h1` tops out at exactly 60px.
- **Measure** is handled by `.shell--*` classes: the token is the content width
  Figma drew, and the page gutter is added on top so content lands on the same x
  positions as the design.
- **Brand chrome** (gold gradient buttons, bordered secondaries, input glow) is
  rebuilt from tokens rather than shipped as bitmaps, so it stays crisp at any
  size. The gradient stops were sampled from the Figma PNGs.

### Layout rules

No element is positioned absolutely for layout. Where the design overlaps
artwork, `.stack` puts children in a single CSS grid cell instead — used for the
card videos, the hero glow and the header/footer scrims.

The product tiles are container queries: the tile is a `@container` and its type
and insets are sized in `cqw`, so a tile keeps the proportions Figma drew at
392px wide whether the grid is showing one column or four.

Below `sm` that row becomes a swipeable strip instead of a fourth grid row —
`components/home/ProductCarousel.tsx` hands Embla `active: false` with a
breakpoint that switches it on under 640px, so there is one row of markup, not
a duplicated mobile copy: Embla takes the grid over on phones and lets go of it
everywhere else. `components/ui/Carousel.tsx` is the reusable half (viewport
ref, track, slides, dots); see its doc comment before wiring up the next one.

The page atmosphere — ten stacked artwork layers in Figma — is reproduced as
background layers on a single element, with percentage sizes and positions so
each layer holds its relative place however tall the page renders.


## The Reveal

`src/components/reveal` is a compound component rather than a single widget,
because the trigger and the card sit in different columns of the hero and the
One-Card Experience will arrange them differently again.

```tsx
<RevealProvider oncePerVisit>
  <RevealTrigger revealedTarget="#choose-your-journey" />
  <RevealStage className="w-[66.7%]" />
</RevealProvider>
```

- A looping, muted card back crossfades into the revealed card in the same
  frame, so nothing on the page moves.
- The fade waits for the card video to have pixels, otherwise it lands on a
  black frame while the file buffers.
- The card plays once with sound — the click is the gesture that permits it —
  and holds on its closing frame.
- One card per visit, tracked in `sessionStorage`. On a later view the card is
  restored on its closing frame instead of replaying.
- Once revealed, the trigger becomes **Visit The Viewing Room** and scrolls down
  to the products rather than leaving a dead button behind.

Only The Star is wired up, so every reveal shows it. When the remaining card
videos arrive they are added to `livingTarot` in `src/content/cards.ts` and the
provider takes a `card` prop.

## Checking the work

The layout was matched to Figma numerically rather than by eye.

```bash
npm test        # 381 unit tests: the pure resolvers in src/lib, and the copy catalogue
```

**Node 22 is pinned in `package.json` and the pin is load-bearing.** On Node 20
`node --test` does not expand the `src/**/*.test.ts` glob and cannot strip types
from a `.ts` file, so the script finds nothing, runs nothing, and **exits 0** —
a green result over an empty set. Discovered 5 September 2026, by which point
twenty test files had never once executed and several plan documents carried
"**Done when:** `npm test` is green" as their completion gate.

```bash
npm run check:measure   # rendered boxes vs the Figma frame, section by section
npm run check:shoot     # section screenshots into .screens (add a width and label)
npm run check:reveal    # walks the whole reveal interaction
npm run check:images    # flags images that failed or rendered at zero size
```

Three need a build first, because they drive the real export rather than `next dev`:

```bash
npm run build
npm run check:panel         # the payment panel's four states, and the wallet row
npm run check:confirmation  # /checkout/complete/ through every payment outcome
npm run check:redeem        # /redeem/ through every state a gift code can be in
```

At 1920px the hero grid, card, buttons and product row land on the Figma
geometry exactly. The page runs about 7% taller than the 6674px frame, which is
the flow layout resolving overlaps that the design draws as stacked boxes.

**Two of `check:measure`'s selectors no longer match anything** and print
`missing` rather than a box: `footer` looks for `body > footer`, which the
`(site)` layout's wrapper `div` has stood between for as long as that layout has
existed, and `productFrame` looks for an ornate frame `ProductCard` does not
draw. Both are selector rot rather than layout faults — noted 7 September 2026
rather than fixed, because fixing a measurement is a change to what is being
measured and belongs to whoever next tunes that section.

## Search, and what a shared link looks like

`src/lib/seo.ts` is the one rule: a route and a page name become a title, a
canonical, Open Graph and Twitter cards. Every page's `metadata` is a call to
`buildMetadata`, rather than the nine hand-written objects that had drifted into
four shapes between them.

**`metadataBase` is set once, on the root layout.** It is what makes
`/og-image.jpg` resolve to an absolute URL, which every platform that reads Open
Graph requires — a relative one is silently never fetched.

`src/lib/routes.ts` decides which routes a stranger should be able to find, and
`app/sitemap.ts` and `app/robots.ts` both read it rather than keeping their own
lists. **`/redeem/` is public on purpose**; that page's own docblock argues it,
and it duplicates no reading page because a gift's copy arrives from a lookup in
the browser.

**`hreflang` lives in the sitemap, not in each page's `<head>`.** It is
reciprocal — an unanswered annotation is ignored — so per-page annotation would
mean editing all six the day a language gets a URL. In the sitemap it is one
file, and an English page's head never changes.

**It emits nothing today, and that is right even though the site is bilingual.**
It reads `BUILT_LOCALES`, which is locales with an *address*; Spanish is offered
without one. See **Languages** below — an `hreflang` pointing at a `/es/` that
does not exist would be a lie, and the sitemap would be advertising a 404.

`robots.ts` and `sitemap.ts` both carry `export const dynamic = "force-static"`.
That is not decoration: under `output: "export"` Next refuses to build a metadata
route that has not opted into static generation, and the refusal names an error
code rather than the fix.

The Open Graph image is generated by `npm run assets:og` from artwork already in
`public/figma`, and **committed** — a build must never depend on somebody having
run the script. It carries no text, because every platform renders `og:title`
beside it from the page's own head.

```bash
npm run assets:og   # recomposite public/og-image.jpg after artwork changes
```

**`NEXT_PUBLIC_SITE_URL` must be set per environment**, like the API base beside
it — `https://theworldtarot.com` in production, `https://staging.theworldtarot.com`
on staging. A production build with it unset is refused rather than allowed to
emit canonicals and Open Graph URLs pointing at `localhost`.

## Languages

The site is read in English until a visitor picks otherwise from the globe in
the masthead. Every word it says lives in
[`src/content/locales/`](src/content/locales/README.md) — one JSON file per
section, one folder per language — and ships in the bundle.

```bash
npm run check:translations   # what is still English, per language
```

**Language is a stored preference, not an address.** There is one URL per page
and Spanish has none of its own. That is a decision rather than an omission:
search is English-only here, so the thing an address buys — an indexable,
linkable Spanish page — is not wanted, and
`docs/adr/0004-language-is-a-path-segment.md` is superseded on that point.

What it costs is worth knowing before you are surprised by it. The export is
static, so the HTML for `/` is built in English; a visitor reading Spanish gets
that markup and then the bundle re-renders over it. So there is a brief flash of
English on first paint, `<html lang>` is corrected after mount rather than in the
served markup (`components/layout/HtmlLang.tsx`), and a crawler only ever sees
English. All three are the same fact wearing different clothes.

It is also why **every component that renders copy is a client component**. A
server component's HTML is written once at build time and never re-rendered, so
it would keep its English through a switch — measured, not assumed, before the
22 of them were converted.

### The two lists, which are not the same list

- **`BUILT_LOCALES`** — locales with a URL of their own. English alone.
  `lib/seo.ts` writes `hreflang` from it and `lib/routes.ts` writes the sitemap
  from it, so a `/es/` in here would advertise a page that does not exist.
- **`OFFERED_LOCALES`** — languages a visitor can read the site in. Both.

Keeping them apart is what lets Spanish be readable without being indexable.

### What the backend supplies

`GET /api/v1/languages` answers `[{ code: "en" }]` — its own translation work is
unfinished — so `lib/languages.ts` adds the languages whose copy ships in this
bundle. The endpoint stays the authority on what the *backend* can serve, and the
intersection it exists for still works: a language it takes down still disappears
from the switcher on the next request, with no deploy.

Copy that comes from the API follows one rule, `apiServesDisplayLocale()` in
[`src/lib/locale.ts`](src/lib/locale.ts): **the price is always the backend's; a
word is the backend's only while the backend is answering in the language being
read.** So an English visitor sees product and reading names edited in the admin
panel, and a Spanish one sees this repository's copy. The day their `es`
endpoints answer, `apiLocale()` follows the display language and nothing else
changes.

## Scope

Homepage, the reveal, the Readings index, and one reading's own page. Navigation
links — including the remaining reading products and the gift panel — point at
routes from the navigation document that do not exist yet.

One form has markup and field names but no endpoint: the newsletter signup in
the footer. A reading page's checkout is wired — the checkout button mints a hosted
Stripe
Checkout Session and the wallet row confirms a PaymentIntent in the page. Its
**gift mode** is live and needs no backend: it swaps the question for recipient
details in place.

**Redemption is not on a reading page.** The inert `Redeem A Gift Code` frame
that stood in the payment column went in #62 on 31 August 2026; a code is
redeemed on a page of its own, which is a separate ticket and not yet built.

**The `24-Hour Rush` delivery upgrade is gone from the design.** The client
dropped it on 25 August 2026 and confirmed it on 1 September; it is not behind a
flag anyone is waiting to throw, and it is not coming back. A reading has one
delivery and the page states it, exactly as the frame draws it.

`rushDelivery` in `src/content/reading-pages.ts` still exists and still ships
`enabled: false`, so nothing renders it today. Treat the radios behind it as dead
code pending removal: **do not build against it, and do not turn it on.**

Each page owns its own backdrop: `<PageAtmosphere>` renders as the page's first
element and fills the layout column behind the header, main and footer. The site
layout carries `isolate` so that layer can sit at `-z-10` without every section
needing a z-index; see `src/components/layout/PageAtmosphere.tsx`.
