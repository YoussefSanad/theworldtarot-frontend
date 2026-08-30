# The reading page charges what the catalogue says

> **Written 28 August 2026** for [#34](https://github.com/YoussefSanad/theworldtarot-frontend/issues/34).
> The Month Ahead page states a hardcoded `$75`. The catalogue answers
> `{"currency":"EUR","amount":7000}`. The page is wrong in the number and wrong in the
> currency, and it is the number a wallet sheet would quote — which is why
> [#37](https://github.com/YoussefSanad/theworldtarot-frontend/issues/37) is blocked on this.
>
> Follows `products-api-wiring.md`, which wired the homepage tiles and set the pattern this
> reuses: fetch in the browser, never at build time, and decide deliberately what an
> unreachable API means versus a product the API answered without.

---

## Close-out, 28 August 2026

**Built as planned.** No deviations from the four states above; two things were added that the
plan did not name.

```
tests     : 26 passed (8 of them this ticket's)
tsc       : clean · next build clean · lint adds nothing to the two standing warnings
states    : live €70 · loading reserves 1562px · unreachable "$75" · withdrawn takes it down
staging   : GET /products/month-ahead → 200 EUR 7000 → the page renders €70
export    : the static HTML ships the resting state, no controls, and no price
```

| Added | Why |
|---|---|
| **`npm run check:panel`** (named `check:price` when this plan was written; renamed at #37, which added the wallet assertions) | The two headline claims — the panel does not move, and there is no way to pay without a live amount — are facts about a laid-out page, which neither `tsc` nor `node --test` can see. The script serves `out/`, intercepts the endpoint, and holds each answer until the loading state has been measured. It needs no backend, which is also the only way to produce the 500 on demand |
| **`check:panel -- --live`** | The intercepted run proves the states and cannot prove the endpoint answers this key. Live mode drops the interception and serves on **port 3000**, the one origin staging's CORS list carries |
| **`NEXT_PUBLIC_API_BASE_URL` read inside `baseUrl()`** | It was a module constant, resolved at import, so a test could not set it. Next substitutes the literal wherever the expression appears, so this is identical in a build — and it is what `api-write.ts` already did |

Verified in a browser against the real export, all three settling states:

```
live         panel 1562px loading → 1562px settled · €70 · 5 controls · 0 reachable while loading
withdrawn    no price · no controls · no question · #get-my-reading still in the document
unreachable  "$75" as copy · 0 controls
```

`$75` survives in the exported HTML exactly once, in the serialized props of the client
component. That is the fallback copy travelling to the browser, not a rendered price.

### The CORS condition is gone, and the live path is proven

**`http://localhost:3000` is now on staging's `CORS_ALLOWED_ORIGINS`** — confirmed by preflight
on 28 August 2026, which answers `access-control-allow-origin: http://localhost:3000`. The
standing condition recorded at the foot of `products-api-wiring.md`, which blocked this and the
reveal from ever being exercised locally, no longer applies. Anything below still describing it
as live is describing the day this was planned.

So the last unproven step was taken rather than left owed. `check:panel -- --live`, against the
real catalogue:

```
GET /api/v1/en/products/month-ahead → 200 {"currency":"EUR","amount":7000}
page                                → €70 · 5 controls · panel 1562px throughout
```

The API prices this reading at **EUR 7000**, and the page was quoting `$75` — wrong in the
number, wrong in the currency, and wrong in a way a wallet sheet would have inherited. That is
the whole ticket, demonstrated end to end.

Two notes from that run, neither this ticket's to fix:

- **The exported page 404s on six prefetches** — `/faq/`, `/library/`, `/living-tarot/`,
  `/world-tarot/`, `/checkout/`, `/login/`. Footer and header links to routes that do not exist
  yet, prefetched by Next on hover. Pre-existing, unrelated, and worth a ticket
- **The catalogue's `name` is `MONTH AHEAD`**, seeded in capitals. This page takes only the
  price from the API, so it is not affected — but it is the same shouting recorded against the
  homepage tiles in `products-api-wiring.md`, and the copy on this page is still bundled

---

## What is wrong today

`content/reading-pages.ts` carries `price: "$75"` on `monthAhead`, and `GetMyReading` prints
it. Its own docblock already says what it is:

> Hard-coded, as the readings index and the homepage tiles' fallback copy are. Reading prices
> are resolved per visitor by the products endpoint […] and this page is not wired to it yet;
> when it is, this becomes the fallback rather than the source.

This is that wiring. Three things follow from it and none are cosmetic:

- **The currency is wrong, not just the number.** `$75` carries a dollar sign the backend never
  said. A visitor in Amsterdam is quoted euros by the catalogue and dollars by the page
- **A display string cannot become an amount.** `"$75"` is not money — it has no currency field
  and its digits are a rendering, not minor units. `Money` (`lib/price.ts`) is the currency and
  the integer minor units, always together, and it is the only thing a payment may be built
  from
- **The panel has never had states.** It renders a price and five controls unconditionally,
  because the price was a constant and constants do not fail

## The endpoint

`GET /api/v1/{locale}/products/{key}` — one product, the listing shape plus `long_description`,
**404 for anything unpublished, any key outside the fixed set, and any product not translated
into the language asked for**.

Read by key rather than filtered out of `/products`, for three reasons:

- It is the authoritative price *for this product*. A page that sells one thing asking for
  everything on sale and picking one out is asking a question it does not have
- **It 404s cleanly.** A withdrawn product is a status code rather than an absence to infer
  from a successful list — the same distinction `products.ts` had to reconstruct by hand
- One response answers both what to charge and which currency to charge it in

The homepage keeps using the list. It renders four tiles and wants them in the order the client
arranged them; that is what a list is for.

## The four states

| State | Cause | Price line | Payment controls |
|---|---|---|---|
| **Loading** | The page just rendered; the fetch is in flight | A resting placeholder, at the price line's own height | **None**, and their height is reserved |
| **Live** | 200 | `formatPrice(money)` against the site locale | All five, with `money` in hand |
| **Unreachable** | The request threw — network, CORS, 5xx | The bundled string as **plain copy** | **None** |
| **Withdrawn** | 404 | — | — (the order section is not rendered) |

Two of those rows are the ticket's judgement calls, so they are stated rather than left in an
`if`.

### Unreachable keeps the copy and loses the controls

The bundled `"$75"` stays on the page as copy, for the same reason the homepage keeps bundled
tiles: a backend we cannot reach must not leave a blank where the product's price was. What it
must never do is put a payment button under a number nobody verified. **When there is no live
money there are no payment controls** — a wallet sheet quoting `$75` would be quoting a string
this repo typed, in a currency the backend does not price this product in.

So the fallback is honest about being copy: it is the price the site advertises, and nothing on
screen invites the visitor to pay it.

### Withdrawn takes the offer off the page

**This is the homepage's rule, applied to a page instead of a tile.** `resolveProducts`'
`HIDE_WITHDRAWN` hides a tile the API answered without, because the backend derives
availability: an absent product has been unpublished, or had its copy or price emptied, and
somebody did that on purpose. Advertising it at a stale price is worse than showing one tile
fewer.

The page's equivalent of hiding the tile is not hiding the page — the page is also the
reading's description, its testimonial and its artwork, and none of that stops being true. It
is **not offering it for sale**: no price, no payment controls, and no question field either,
since the question is a line on an order that cannot be placed.

That leaves the closing call to action, which scrolls to `#get-my-reading`. The anchor moves
onto the order section's wrapper, which renders in every state, so the button still lands on
the panel rather than dangling.

## Reserving the height

> A customer reaching for a payment button must not have it move.

The controls block is 498px of a 687px panel — five buttons, a rule and a reassurance. If it
mounts when the fetch lands, everything below it jumps, and on a slow connection the jump
arrives exactly as a thumb comes down.

**The block stays in the DOM in the loading state and is made inert**, rather than being
replaced by a `min-height` guess: `visibility: hidden` and the `inert` attribute, which is the
whole of it. The height is then correct by construction at every width — the panel is laid out
in `cqw`, so a hardcoded reserve would be a number to maintain in two places and wrong at the
third breakpoint.

Two attributes and no more, because each of the obvious additions is already implied.
`visibility: hidden` takes the controls out of the tab order and stops pointer events reaching
them; `inert` takes them out of the accessibility tree — so an explicit `aria-hidden` and
`pointer-events: none` would restate what is already true and read as though something else
were being fixed. What `inert` adds over hiding alone is the last case: a programmatic
`click()` does nothing either. **There are no payment controls in this state in every sense the
phrase has**, which is the claim `check:panel` asserts by counting controls not inside an
`[inert]` subtree.

The price line gets a **resting state** rather than an invisible one — a quiet placeholder at
the line's own height. The panel holds still and reads as loading rather than as broken.

The unreachable and withdrawn states are allowed to collapse. They are settled: nothing is
about to appear under the visitor's finger.

## Money reaches the payment panel as one value

`#37` mounts Stripe's Express Checkout Element in deferred-intent mode, which needs an amount
and a currency together. It gets the same `Money` the price line was formatted from — one
value, from one response, never a number re-parsed out of a formatted string.

That is the whole of what this ticket owes the next one: `GetMyReading` holds `money` in the
live state and nothing else has to go looking for it.

## The shape of the code

**`lib/api.ts`** — `ApiProductDetail` (the listing shape plus `long_description`) and
`fetchProduct(key, { locale, signal })`, returning `null` on 404 and throwing on anything else.
The same split `fetchCard` already makes, and for the same reason: an honest 404 and a broken
API want different answers.

**`lib/product.ts`** — new, beside `products.ts` rather than inside it. `products.ts` is the
homepage's merge of a list over bundled tiles; this is one product's four states. They share
`lib/api.ts` and nothing else, and folding them together would put a hook that hides tiles next
to a hook that decides whether a payment may be offered.

- `ProductOffer`, a discriminated union over `status: "loading" | "live" | "unreachable" |
  "withdrawn"`, with `money` and the live copy present **only** on `live`. The type is what
  stops a caller reading a price out of a state that has none
- `resolveOffer(...)`, pure and exported, so the table above can be exercised without mounting
  anything
- `useProduct(key)`, which fetches once in an effect with an `AbortController`, asks for
  `currentLocale()` explicitly — as `useProducts` does, so copy and prices are read in the same
  language — and logs `console.error` for unreachable and `console.warn` for withdrawn

**`content/reading-pages.ts`** — `ReadingPage` gains `productKey`, the backend's permanent
identifier. It is spelled out rather than reusing `id`, which exists to match the readings
index and agrees with the key today by convention rather than by contract. `price`'s docblock
becomes what it now is: copy-only fallback, never something a payment can be built from.

**`ReadingOrder`** — calls `useProduct`, owns the anchor, and drops the form entirely when the
product is withdrawn. It is already the page's one stateful component.

**`GetMyReading`** — takes the `ProductOffer` and renders the four states. Already inside the
client graph via `ReadingOrder`, so this costs no new boundary.

**`lib/product.test.ts`** — `node --test`, stubbing at the network as `orders.test.ts` does. One
case per row of the table, plus the abort path.

## Verification

- `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run lint` (no new errors over the
  standing ones)
- The exported HTML holds the resting state and no payment controls, since the fetch is the
  browser's — `grep` `out/` for `$75` and for the checkout marks
- On `staging.theworldtarot.com`: the live price and its currency; DevTools offline for the
  unreachable state; a bad key for withdrawn

**The browser path cannot be exercised from `next dev`** unless `http://localhost:3000` has
since been added to the backend's `CORS_ALLOWED_ORIGINS` — the standing condition recorded at
the foot of `products-api-wiring.md`. Check it before assuming a local failure is this code.
