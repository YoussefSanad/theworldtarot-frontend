# Language and currency, end to end

> **Written 2 September 2026.** The route through
> [`#63`](https://github.com/YoussefSanad/theworldtarot-frontend/issues/63): live prices on the
> readings index, a currency the visitor can override and that sticks, and a language list that
> comes from the backend. Written to be taken end to end in one pass.
>
> **#63 is the specification; this is the order of work and what verifies it.** Where this
> document contradicts #63 it says so and gives the evidence — there is one such contradiction
> and it unblocks the ticket.

Read these rather than re-deriving them. Nothing they carry is repeated here:

| What | Where |
|---|---|
| The specification, and every rejected alternative | `#63` |
| Why language is a path segment, English keeps `/`, and the switcher draws an **intersection** | `docs/adr/0004-language-is-a-path-segment.md` |
| `/languages`, `/currencies`, currency resolution order, money as minor units | the backend's `API_CONTRACT.md`, sections 2, 4 and 5 |
| The product wiring this extends | `docs/plans/products-api-wiring.md` |
| The deferred half — `[locale]` routing and translated copy | `#69` |
| Coordination asked of the backend | `YoussefSanad/TheWorldTarot#66` |

---

## The blocker is gone, and one document still says otherwise

**#63's "Blocking prerequisite" section is stale.** It says `http://localhost:3000` is absent from
staging's `CORS_ALLOWED_ORIGINS`, so the browser fetch cannot run. That was true on 20 August 2026
and was fixed on **28 August 2026**. Verified again 2 September 2026:

```
OPTIONS /api/v1/en/products  Origin: http://localhost:3000
  → 204, access-control-allow-origin: http://localhost:3000
GET     /api/v1/en/products  Origin: http://localhost:3000
  → 200, five products
```

`.env.local` records the same thing, and so does the "Known before starting" bullet at the foot of
`products-api-wiring.md` — struck through, with the date. **What both #63 and any handoff reading
from it picked up instead was that file's close-out section near the top, which is dated 20 August
and was never revised.** Two statements about CORS live in one document and only the lower one is
current.

So `next dev` reaches the API, this work is verifiable in a browser, and **#63 moves from
`ready-for-human` to `ready-for-agent`** (step 0).

## What staging answers today

Facts a type checker cannot supply, and the reason a verification pass would otherwise read
correct behaviour as breakage.

**Prices on staging have been hand-edited away from the seed.** #63 §1 says the bundled tiles and a
seeded database agree to the cent. True of `ProductKey::defaultPrices()`; **not true of staging**,
where the seeder deliberately leaves edits alone — the same condition `products-api-wiring.md`
records for the `"fasd"` placeholder copy. In USD:

Bundled strings are `content/home.ts` for the homepage tiles and `content/readings.ts` for the
readings index; `in-depth` has no homepage tile and `viewing-room-pass` has no readings entry.

| Key | Staging | Bundled string | |
|---|---|---|---|
| `one-card` | `$10` | `$12` | edited |
| `three-card` | `$20` | `$52` | edited |
| `month-ahead` | `$75` | `$75` | agrees |
| `in-depth` | `$120` | `$125` | **the bundled string is wrong; step 4 fixes it** |
| `viewing-room-pass` | `$15` | `$29` | edited |

**Wiring the readings index will visibly move those numbers.** That is the join working. The one
figure to change in this repository is `in-depth`, which is `$125` in `src/content/readings.ts`
against `12000` in both the seed and staging.

**A developer machine here resolves to EUR.** `/products` with no parameter answers
`{"currency":"EUR"}` from this network, so a **cold** load already shows `€10` and not `$12`. Useful:
detection is exercised by simply loading the page.

**`/languages` answers one entry** — `[{"code":"en","label":"English"}]` — with **no `native_name`**.
Ask 1 of `YoussefSanad/TheWorldTarot#66` is open and costs nothing to wait for: render
`native_name ?? label` and it starts reading "Español" the day the field ships.

**`/currencies` still carries `detected`.** Ask 2 of that issue is open. Nothing here reads the
field, so it changes nothing either way.

## Three words this work is built from

Used as written throughout the code and its comments. Two of them are a distinction #63 introduces
that has no name in `CONTEXT.md` yet, which step 12 fixes.

- **chosen** — the currency the visitor explicitly picked. Persisted, and **the only value ever
  sent**, as `?currency=`.
- **resolved** — the currency the backend answered with, read off `price.currency`. Persisted
  display-only, so the control has something to highlight on `/login/`, `/set-password/` and
  `/checkout/complete/`, which fetch no product. It is read for the highlight and nothing else.
- **cold** — a request from a visitor who has never chosen. It carries no parameter on purpose and
  is answered by the backend's `CF-IPCountry` detection.

A visitor who crosses a border while **cold** is re-detected with them. That property is what keeps
**resolved** out of the request.

---

## Steps

### 0. Unblock

Re-run the preflight above and confirm it still answers. Then relabel `#63` `ready-for-agent`, and
strike its "Blocking prerequisite" section through with the date and the evidence, house style —
`docs/adr/0002-checkout-happens-on-stripes-page.md` is the model.

Two files are already uncommitted in this working tree, on `feat/gift-a-reading`, which is unrelated
to this work: a comment rewrite in `src/lib/locale.ts` and `docs/adr/0004-*.md`. **Read HEAD and ask
where this work belongs before committing anything** — branches are the user's to manage.

**Done when:** the preflight answers 204 with the localhost origin, and `#63` carries the label and
the dated reversal.

### 1. `src/lib/currency.ts` — the store

Everything downstream reads it, so it lands first. A module-scoped external store read with
`useSyncExternalStore`, copying `src/components/account/useSignedIn.ts` — including its
`readOnServer` snapshot, because the hydration problem is identical: the export is built with
nobody having chosen anything.

Two persisted values, **chosen** and **resolved**, in `localStorage`. `session-value.ts` has the
lazy-read shape for a single storage key; this needs two and a publish that notifies subscribers
directly, since a same-tab write raises no `storage` event.

A context is the wrong tool here and #63 says why: it would force a client boundary onto a server
layout to serve two `lib/` modules that are not its descendants.

**Done when:** `npm test` covers, without mounting anything — a fresh visitor reads **chosen** as
absent; a write survives a reload; and a store whose `localStorage` throws — a browser set to
block site data — still answers rather than throwing.

### 2. `src/lib/api.ts` — the parameter and two endpoints

Add `currency?: string` to `fetchProducts` and `fetchProduct`, appended as `?currency=` **only when
present**, so a **cold** request stays parameterless.

Add `fetchCurrencies()`, returning `available` alone — `{ code, symbol }[]`. Add `fetchLanguages()`,
returning `{ code, label, native_name? }[]`. Both sit outside the locale segment, as
`fetchPaymentMethods` already does, and its docblock argues the shape to copy: check the body rather
than cast it.

Keep the file's own rule at the top intact — nothing here is fetched at build time.

**Done when:** `npx tsc --noEmit` is clean and unit tests assert that a call with no currency
produces a URL with no query string.

### 3. `products.ts` / `product.ts` — one call, and a refetch that keeps the price

#63 asks for **one** `/products` call shared between the readings index's two surfaces. Two hooks
fetching independently would make two, and a currency switch would make two more. So promote
`useProducts`'s fetch into a module-scoped store in `useSignedIn`'s ask-once shape, keyed by
**chosen**, re-asked when **chosen** changes.

`resolveProducts` stays exactly as it is: a pure join over the store's snapshot, exported apart from
its hook. `useProduct` takes **chosen** the same way.

Two behaviours the ticket is specific about, both about what stays on screen:

- **Through a refetch, the previous price stays.** The store keeps its last snapshot while the new
  request is in flight, so a switch re-renders a **stale** price rather than blanking a carousel for
  the length of a round trip.
- **On first paint, the flip is accepted.** A returning GBP visitor sees the exported `$12` and then
  `£10`. Reserving an empty price slot on every load is worse on the one section designed never to
  look broken.

Publish `price.currency` back to the store as **resolved** when a response lands.

**Done when:** `npm test` proves a **chosen** currency reaches the URL, a **cold** load's URL carries
none, and `resolveProducts` returns the previous products while a refetch is outstanding.

### 4. The readings index goes live

`SignatureExperience` and the three `ReadingCard`s render bundled strings from
`src/content/readings.ts`. Both surfaces read the store from step 3, so they share its single call.
Each needs a client boundary; `ChooseYourJourney` is the precedent and its docblock explains the
trade.

The join keys already line up: `signature` is `one-card`, and the three `readings[].id` are
`three-card`, `month-ahead` and `in-depth`. This wants its own resolver over `content/readings.ts`
rather than a reuse of `resolveProducts`, which is bound to the homepage's bundled tiles — pure and
exported apart from its hook, like both of its neighbours.

Correct `in-depth` from `$125` to `$120` in `src/content/readings.ts`.

The bundled string survives as fallback copy, in USD for everyone. It never funds a payment, and
`ProductOffer` already encodes that rule: only `live` carries `money`.

**Done when:** the static export still contains the bundled strings, the built page swaps all four
to live figures against staging, and a stubbed API failure leaves the bundled strings on screen.

### 5. `useLocaleSelection` reads the store

Replace the body of the hook in `src/components/layout/LocaleControls.tsx`. It was built as this
seam, so both call sites in `SiteHeader.tsx` need no edit. `language` keeps returning
`currentLocale()`, which is `"en"` — `#69` makes it move.

The control highlights **resolved**, falling back to **chosen** where nothing has resolved yet.

**Done when:** picking a currency in the header re-prices the homepage tiles and both readings-index
surfaces, and survives a reload.

### 6. Currency options from `/currencies`

Fetch it once per page load, in the same ask-once shape. **On failure, keep the three known
currencies and keep the control on the page** — a currency cannot appear or vanish without a
migration and a deploy on both sides, so the hardcoded list cannot silently drift the way a language
list can. `symbol` comes from the response when it answers.

**Done when:** a stubbed failure still renders three currency rows with their symbols.

### 7. Languages from `/languages`

Delete `es`, `fr` and `de` from `LANGUAGE_OPTIONS` — the file already calls them untrue. Fetch
`/languages` once per page load, cached in memory rather than `sessionStorage`, because the contract
says cache briefly *for the reason* that this endpoint is what tells you a language went down.

**The language group renders at two entries or more.** One entry draws nothing, and so does a failed
request: both mean there is nothing safe to offer. The globe stays — with one language its panel
holds Currency alone. Same conditional for the flat rows in the mobile drawer, which
`LocaleControls` renders.

Render `native_name ?? label`.

**This is correct and invisible today.** The payoff is that the switcher appears the day somebody
flips Spanish to `Live`, with no deploy here — the one requirement in `API_CONTRACT.md` the backend
says it cannot enforce for us, and it only holds if the call ships now.

**Done when:** a stub answering one language draws no language group in either the desktop panel or
the drawer; a stub answering two draws both, in both places.

### 8. The control freezes while a payment is in flight

The one piece with no existing seam: the header cannot see the reading page's payment state. A
module-scoped flag in the same shape as step 1's store closes it — the payment panel sets it when a
write starts and clears it when the write settles, and the currency group reads it and renders
inert.

Everywhere else the control stays live. It cannot touch a placed order — an order's currency is
fixed at placement and the confirmation renders from the payment rather than the catalogue — but
re-pricing an offer underneath an open wallet sheet is the exact failure the **Money** discipline
exists to prevent.

**Done when:** `check:currency` (step 10) presses the checkout button on a held write and finds the
currency rows inert, and finds them live again once it settles.

### 9. Unit tests

`node --test` over the pure resolvers. They are exported apart from their hooks for exactly this,
and the store from step 1 has the same property available to it.

**Done when:** `npm test` is green and covers every resolver this work adds or changes.

### 10. `check:currency`

A new `scripts/check-currency.mjs` and a `check:currency` script. Playwright is already a
devDependency, and `scripts/check-panel.mjs` holds the pattern to copy: serve `out/`, intercept the
endpoints with `page.route`, and hold each answer until the state under test has been measured, so
the race between a fetch and an assertion cannot decide the result.

**Its own script, cheap, and separate.** `check:panel` is a seven-minute silent run that the user
starts themselves; leave it to them. This one exists to be run casually.

**Done when:** `npm run check:currency` proves all five facts under "What proves it" below.

### 11. Drive it in a browser

The path nothing has ever exercised, and now possible. Use the `run` skill against `next dev`.

Switch currency on the homepage and on the readings index; confirm the price moves and the previous
one holds through the round trip; reload and confirm the choice survives; clear `localStorage` and
confirm the **cold** load sends no parameter and comes back EUR from this network.

**Done when:** every one of those has been seen, and any surprise is written into step 12's
close-out rather than left in a terminal.

### 12. Close it out

- A **close-out section at the head of this file**, house style: what deviated from the plan and
  why, what is verified and by what, what is still owed. `products-api-wiring.md` is the model.
- **`CONTEXT.md` gains the vocabulary.** It defines **Money** and has no entry for currency
  selection, so **chosen** and **resolved** go in beside it before two more tickets name the
  distinction three ways. Propose it rather than assuming it.
- **`#63` closed**, with the checklists ticked against what actually shipped.

**Done when:** all three are done and the branch is where the user asked for it in step 0.

---

## What proves it

The exhaustive bar. `check:currency` demonstrates every line, and the work is not finished while one
is unproven:

1. A **chosen** currency sends `?currency=` on every product request.
2. A **cold** load sends none.
3. A switch refetches both readings-index surfaces and the homepage tiles, from one call.
4. **resolved** is remembered, highlights the control on a page that fetches no product, and is
   never sent.
5. The language group stays hidden at one entry and appears at two.

## Standing constraints

- **`npm run check:panel` is the user's to run.** It is silent for about seven minutes. `check:currency`
  is deliberately separate and cheap so this work never needs it.
- **Branches are the user's.** Read HEAD; compare commits in a worktree.
- **This worktree can be shared with another session.** Check mtimes before a long edit; a phantom
  test failure usually means the shared test database.
- **Commit messages carry no `Co-Authored-By` trailer.**
- **House style is argument, not summary**: dated preambles, named rejected alternatives,
  strikethroughs with the date that reversed them, costs stated plainly. Terse bullet-point docs read
  as foreign in these repositories.
