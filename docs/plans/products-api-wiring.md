# Choose Your Journey draws from the API

> **Written 20 August 2026.** The homepage's product tiles take their name, description and
> price from `GET /api/v1/{locale}/products` instead of the bundled copy in `content/home.ts`.
> Locale is threaded through every call now and pinned to `en`, so enabling a second language
> later is a change in one file rather than a hunt.
>
> Follows `reveal-api-migration.md`, which wired the other half of this homepage and set the
> pattern this one reuses: fetch in the browser, fall back to bundled content, never let the
> homepage look broken.

---

## Close-out, 20 August 2026

**All thirteen steps are in.** Backend suite green at **621 tests**, frontend typechecks,
builds, and adds no lint error to the six that were already there.

```
backend   : 621 passed (82 of them product tests)
frontend  : tsc clean · next build clean · 4 tiles in the static export
join      : 4 bundled keys, 4 matched, in-depth ignored (no artwork)
prices    : 1200 USD -> "$12"   5000 EUR -> "€50"   1250 USD -> "$12.50"
```

### What deviated from the plan as written

| Deviation | Why |
|---|---|
| **The seeder was added** | Not in the original plan at all. Asked for mid-build, and it is the better fix: the 4-tiles-to-2 shift the plan described engineering around was incomplete seed data, so it was fixed at the source instead |
| **The seeded copy is the frontend's, verbatim** | Also asked for mid-build. `ProductKey`'s defaults now reproduce the homepage tiles exactly — names, descriptions and USD prices, verified character for character. **This makes going live a visual no-op**, which is the best possible state for a change like this: the wiring can be proven without the page moving a pixel |
| **Names are seeded in capitals** | Because the tile prints the name as given and there is no `text-transform` in the frontend's CSS, so title case would have silently reworded the homepage. It does mean everything else reading `name` shouts — the admin's order table, and derived page titles. The fix, if wanted, is an `uppercase` class on the tile rather than a second name field |
| **`is_published` needed no handling** | The plan assumed publishing was part of making a product visible. It is not: the 2026-07-28 migration defaults it to true and removed it from the panel, so copy and prices are the whole gate |
| **A currency guard in the seeder** | `fillMissingPrices` iterates the currency config rather than the defaults, so adding a fourth currency fails loudly at deploy time instead of as an unreadable NOT NULL violation on first insert |
| **`CarouselDots` gained a label fallback** | `dotLabels[index]` can be momentarily short of `snapCount` in the frame between Embla re-measuring and this render's labels catching up. An empty `aria-label` is worse than a general one |

### Not verified, and it cannot be from here

**The browser fetch has never run.** `http://localhost:3000` is not on staging's
`CORS_ALLOWED_ORIGINS`, so `next dev` cannot reach the API at all — this is the pre-existing
condition described at the bottom of this document, and it blocks the reveal just as much as it
blocks this.

Everything above is verified by the type checker, the build, the backend suite against a real
database, and the static export's contents. **What has not been exercised is the one path that
matters most**: a real browser fetching real products and the tiles swapping to live copy.
That needs the CORS entry first, and until then the section renders bundled copy and nothing
else, which is exactly what it is designed to do when it cannot reach the backend.

Also still owed:

- **The seeder must run against staging** before any of this is visible there
- **`"fasd"` and `"asdf"` survive**, by design — they are edits, and the seeder does not
  overwrite edits. That is a panel fix, not a deploy
- **`HIDE_WITHDRAWN` has never fired in a browser**, for the same CORS reason

---

## Current state, read from the code as it is

- **`ChooseYourJourney` is a server component.** It reads `products` from `@/content/home`,
  renders a `ProductCard` per entry, and passes them as children into the client
  `ProductCarousel`. All four tiles are baked into the exported HTML at build time
- **`output: 'export'`.** Static export on Cloudflare Pages. No server at runtime, no route
  handlers. Anything read at request time is read by the browser
- **`lib/api.ts` already holds the pattern**: `drawCard` and `fetchCard`, both taking
  `{ locale = "en", signal }`, both browser-only by a file-level rule
- **Four bundled tiles**: One Card, Three Card, Month Ahead, Viewing Room. Each carries
  `id`, `title`, `subtitle` (pre-split into two lines), `price` (a display string, `"$12"`),
  `action`, `href` and `image`
- No test runner. Verification is the `check:` scripts and the eye

## What the API actually returns

```
GET /api/v1/en/products
→ [ { "key": "one-card", "type": "reading", "name": "One Card Reading",
      "short_description": "…", "allows_question": true,
      "price": { "currency": "EUR", "amount": 1000 } } ]
```

Checked against staging on 20 August 2026. Three things about it drive everything below.

**The price is per visitor.** Currency resolves from the `CF-IPCountry` header, so the same
URL answers `EUR` in Amsterdam and `USD` in Denver, and an explicit `?currency=GBP` overrides
both. It therefore **cannot be baked at build time** — this is a stronger constraint than the
reveal's, which merely happened to be satisfied by the static export. A build-time fetch here
would ship one country's prices to the whole world.

**The list is short today.** Staging returns two products, One Card and Three Card, with
placeholder copy (`"fasd"`, `"asdf"`) and EUR prices. The other readings are filtered out by
`Product::availableIn()`, which requires complete copy *and* a real price in every currency
before a product is on the website at all. Nothing to switch on, nothing to forget.

**No image, no link, no CTA label.** The resource carries text and money and nothing else.
Artwork, `href` and the button word are not in the contract and are not coming.

## The shape mismatch

| Bundled `Product` | API | Resolution |
|---|---|---|
| `id: "one-card"` | `key: "one-card"` | Already agree. `id` is renamed `key` to say so |
| `id: "viewing-room"` | `key: "viewing-room-pass"` | **Disagree.** The bundled id is corrected to the backend's |
| `title: "1 CARD READING"` | `name: "One Card Reading"` | API wins. The tile uppercases in CSS; `"1"` versus `"One"` is Jennifer's call now, which is the point of the exercise |
| `subtitle: ["A Single Message", "from the Tarot"]` | `short_description: string` | One string, not two lines. See below |
| `price: "$12"` | `price: { currency, amount }` | Integer minor units. Formatting is the frontend's job, per the backend's `api.md` |
| `action: "BEGIN READING"` | *absent* | Stays bundled |
| `href: "/readings/one-card"` | *absent* | Stays bundled |
| `image: ImageAsset` | *absent* | Stays bundled |

**The bundled list therefore stays, and stays in charge of which tiles exist.** A tile cannot
be rendered without artwork, and artwork ships in the bundle. The consequence is worth stating
plainly rather than discovering later: **publishing a fifth product does not put it on the
homepage.** The API owns what a tile *says*; the frontend owns what tiles *are*. Adding one is
a frontend deploy — artwork, link, position — and that is a feature, since it stops a product
published in the admin panel from silently rearranging a hand-tuned four-column grid.

### The two-line subtitle

The tile's design hard-wraps its subtitle: *"A Single Message" / "from the Tarot"*. The API
sends one string and no line-break information.

**The break is the tile's decision, not the copy's.** `short_description` renders into a single
`<p>` with `text-wrap: balance`, which splits it at the balanced point rather than greedily
filling the first line — the greedy split is what made it ragged when this was first wired.

A `\n` in the copy was the obvious alternative and is the wrong tool:

- **This tile is laid out at four different widths** — a carousel slide, two thirds of a
  two-column cell, a full quarter column, and its own 449px cap. A break that is right at one
  is ragged at the other three; `balance` re-splits at each
- **Every translator would have to re-type it**, in a language where the same break does not
  balance the same words
- **`short_description` is also the SEO meta description**, derived rather than stored
  (`translation.md` section 10), where a newline is noise
- It puts presentation back into the CMS field, which is what this whole migration moves away
  from

`whitespace-pre-line` is kept, so a newline still works as a deliberate override for the one
case where a specific break really is wanted. Browsers without `text-wrap: balance` (before
Chrome 114 / Safari 17.5 / Firefox 121) wrap normally, which is the behaviour that was there
before.

**The bundled subtitles were flattened to single strings to match**, so the fallback and the
live copy render through one code path. They previously rendered as two `<span class="block">`s
against the API's one, which meant the same words laid out differently depending on whether the
fetch had landed — the exact thing the "going live is a visual no-op" property is supposed to
rule out.

## The decision that reverses a backend one

The Viewing Room pass is `type: "pass"`, and `ProductController::index` deliberately excludes
it: *"The viewing room pass is not listed here: it has its own page rather than sitting in a
list of readings."* Two tests pin that exclusion.

**That is reversed on request, 20 August 2026.** The pass is one of the four things this
section sells, so it comes back from `/products` with everything else. `type` is already in the
resource, so the frontend can still tell a pass from a reading and present it differently — the
Viewing Room tile's CTA reads "ENTER", not "BEGIN READING", and that mapping is what `type` is
for.

The pass is seeded but has no copy or price, so `availableIn()` keeps it out of the response
until Jennifer fills them in. Removing the filter does not make it appear; finishing it does.

## Unreachable versus withdrawn

The chosen fallback is **bundled copy and bundled price**, so the homepage never looks broken.
That answers one of two states, and the second needs a different answer:

| State | What it means | What renders |
|---|---|---|
| Request failed, or has not answered yet | The backend is unreachable, or the page just loaded | **Every bundled tile, bundled price.** The homepage cannot break |
| Request succeeded, product absent from it | Unpublished, or its copy or price is unfinished — a deliberate act | **The tile is hidden** |

The second row is an interpretation of the fallback decision, not a departure from it, and it
is the same split `drawCard` already makes between `console.error` for an unreachable API and
`console.info` for an honest 404. Falling back to bundled copy for a *withdrawn* product would
advertise something at a stale price and link to a page the backend answers 404 for. Wrong
price is bad; selling a thing that was taken off the website is worse.

**This is one line to flip** (`resolveProducts`, `HIDE_WITHDRAWN`) if the call goes the other
way.

### The seeder, which is what stops this mattering

The exported HTML holds four tiles and staging's API returned two, so a real load would have
painted four and then dropped to two. **That is fixed at the source rather than papered over in
the frontend: the seeder now creates a complete, priced catalogue, so there is no such thing as
an empty shop.**

The old seeder deliberately started copy empty and prices at zero, and its test called zero
*"deliberately wrong rather than plausibly wrong"* — the idea being that availability is
calculated, so an unfinished reading stays off the website with nothing to switch off. The
reasoning holds. The trade was still wrong, because the thing a fresh database was left with
none of was **the shop**. A deploy against an empty database produced a homepage with nothing
for sale on it, and staging sat in exactly that state.

**"Never overwrite the client's values" is kept, but per field rather than per row.** Anything
holding a value is left exactly as it is; only what is empty gets filled. An empty string is
not an edit, it is a field nobody has reached. Copy reading `"fasd"` is an edit, however
unpromising, and survives untouched.

That distinction is what lets the fix reach a database that has already been seeded — matching
on `! $product->exists`, as the old seeder did, would have left every half-finished row on
staging exactly as unfinished as it was.

`is_published` is not touched at all. It defaults to true and is not panel-editable (readings
are on the website by default and are never taken off, per the 2026-07-28 migration), so
filling copy and prices is the whole of what makes a product visible.

### Five products, four tiles

With the pass listed and the catalogue seeded, `/products` returns **five**: four readings and
the Viewing Room pass. The homepage shows **four** — `in-depth` has no tile.

This is the bundled-list-decides rule doing its job rather than a gap to close. `in-depth` has
no artwork and no page, so it cannot be rendered, and the merge ignores any API product whose
key it does not recognise. Putting In Depth on the homepage is a frontend change: artwork, a
link, and an entry in `products`.

### The flash that remains

A tile whose key the API omits still disappears after the fetch. Once the catalogue is seeded
that only happens when something is genuinely withdrawn, which is rare and correct. Hiding the
section until the fetch settles was considered and rejected: it would cost the homepage's main
conversion section on every single load, forever, to tidy a transition that should almost never
fire.

## The client boundary, and why it costs less than the comment says

Runtime data means the tiles re-render in the browser, so `ChooseYourJourney` becomes a client
component and `ProductCard` enters the client graph.

`ProductCarousel`'s docblock argues against exactly this: tiles arrive as children *"so
`ProductCard` — and the `next/image`/`next/link` machinery under it — never enters this file's
module graph and ships no extra client JS."*

**That rationale is already void on this page.** `SiteHeader` and `HeroActions` are both client
components and both import `next/image` and `next/link`, so that machinery is in the client
bundle whatever this section does. The real marginal cost is `ProductCard`'s own JSX, which is
a few hundred bytes. Verified 20 August 2026 by reading the `"use client"` map.

The children pattern is kept anyway — it still separates the carousel's mechanics from the data
that fills it — so `ProductCarousel` needs no change beyond surviving a changing slide count.

### Embla and a changing slide count

`Carousel` listens for Embla's `reInit` to resync `snapCount`, but **Embla does not re-measure
when React adds or removes slide nodes** — it re-inits on resize and on an options change, and
nothing else. Four tiles becoming two would leave the dots claiming four.

`Carousel` gains a `slideCount` prop and calls `api.reInit()` when it changes. `initialSnapCount`
keeps doing its existing job of getting the pre-hydration dot count right.

## Locale

There is no locale routing and none is being built here. What is being built is the seam:

- **`lib/locale.ts`** holds `DEFAULT_LOCALE = "en"` and `currentLocale()`
- Every call in `lib/api.ts` defaults its `locale` from it, replacing three inline `"en"`
  literals — including the two the reveal already had
- `<html lang>` reads from it

When a second language is enabled, `currentLocale()` learns to read the route segment and
nothing else moves. The backend is already addressed per language, English included, so the
URL shape does not change when that happens.

## Money

`Intl.NumberFormat` against the **site** locale, not the browser's — a German browser must not
render a US visitor's price as `10,00 $`.

Trailing `.00` is dropped when the amount is a whole unit, because the design says `$12` and
not `$12.00`. Minor units are divided by 100; USD, EUR and GBP are the three currencies this
system sells in and all are two-decimal.

Only API prices are formatted. The bundled fallback is already a display string, so there is no
formatting on the server render and therefore no hydration mismatch to worry about.

## Steps

**Backend**

1. `ProductKey` gains `defaultShortDescription()`, `defaultLongDescription()` and
   `defaultPrices()`, next to the `defaultName()` and `defaultSortOrder()` already there. The
   catalogue enum is where code says what each product is
2. `ProductSeeder` fills any empty copy field and any zero price, and never touches a value
   that is set
3. `ProductController::index` drops `->ofType(ProductType::Reading)`, and its docblock stops
   saying the pass is excluded
4. Update the tests that pin the old behaviour: two in `ProductsEndpointTest` for the
   exclusion, and the `ProductSeederTest` case asserting products are created empty
5. Update the contract in `.claude/api.md`

**Frontend**

6. `lib/locale.ts` — new. `DEFAULT_LOCALE`, `currentLocale()`
7. `lib/price.ts` — new. `formatPrice({ currency, amount })`
8. `lib/api.ts` — `ApiProduct`, `fetchProducts()`; locale defaults come from `lib/locale`
9. `content/home.ts` — `Product.id` becomes `key`; `viewing-room` becomes `viewing-room-pass`;
   the list is documented as the fallback and the roster, not the copy
10. `lib/products.ts` — new. `resolveProducts()` merge and the `useProducts()` hook
11. `ChooseYourJourney` — client, reads `useProducts()`
12. `ui/Carousel.tsx` — `slideCount` prop, `reInit` on change
13. `content/README.md` — the Products section is now half true; correct it

## Known before starting

- **`http://localhost:3000` is not on staging's CORS allow-list.** ~~Verified 20 August 2026~~
  — **fixed, 28 August 2026.** The preflight now answers
  `access-control-allow-origin: http://localhost:3000`, so `next dev` reaches the API and both
  the reveal and this section can be exercised locally. Everything in this bullet below is the
  condition as it stood, kept because two close-outs in this folder reason from it. Verified
  20 August 2026:
  staging returns `access-control-allow-origin` for `https://theworldtarot.com` and
  `https://staging.theworldtarot.com`, and no header at all for localhost, on both the simple
  request and the preflight. **This blocks the reveal today too**, not just this work. It is a
  backend env change — `CORS_ALLOWED_ORIGINS` — not a frontend one, and nothing here can be
  exercised in `next dev` against staging until it lands
- **`/products` is `cache-control: no-cache, private`** and `cf-cache-status: BYPASS`, so every
  visitor reaches the origin. Correct for now, since the response varies by country and the URL
  does not, so an edge cache keyed on URL alone would serve one country's prices to another.
  Worth revisiting only with a `Vary` the CDN honours
- **Staging's copy is placeholder** (`"fasd"`) on the two products someone has already typed
  into, and the seeder will not overwrite it, by design. A wired homepage will show it. That is
  the system working, and the fix is an edit in the panel, not a deploy
- **The seeder has to actually run against staging** for any of this to be visible there. It is
  in `DatabaseSeeder` and runs on deploy
