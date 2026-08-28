# The Apple Pay sheet opens with the live amount

> **Written 28 August 2026** for [#37](https://github.com/YoussefSanad/theworldtarot-frontend/issues/37).
> The first half of Apple Pay: the wallet sheet opens from the reading page quoting the real
> price. **No order is created and nothing is charged** — that is
> [#38](https://github.com/YoussefSanad/theworldtarot-frontend/issues/38).
>
> Follows `reading-page-live-price.md`, which is why that ticket gated this one. A wallet sheet
> is a payment authorization and the number it quotes is a number the customer believes they
> agreed to. It must never be one we invented from a bundled copy string.

---

## What the money is, and why it is a type rather than a rule

`ExpressCheckout` takes `money: Money`, not a `ProductOffer`. `ProductOffer` carries `money` on
`live` and on no other state (`lib/product.ts`), so *mount a wallet sheet from a price we
invented* is a compile error rather than a rule somebody remembers.

That matters more than it reads. `reading.price` is the string `"$75"`; the catalogue prices
this reading at `{"currency":"EUR","amount":7000}`. Different number, different currency, and no
currency field at all in the string. A sheet quoting it would be asking for consent to an amount
no server ever agreed to.

## The panel in four states

The rule the panel turns on is one sentence: **where there is no live money there is nothing
that can take a payment.** Note what it does not say — it is about what can be *paid*, not what
can be *seen*.

| state | price line | the client's frames | wallet |
|---|---|---|---|
| **loading** | resting bar, `role=status` | drawn, `invisible` + `inert` | none |
| **live** | `formatPrice(money)` — `€70` | four; Apple Pay's row is Stripe's now | mounted from `offer.money` |
| **unreachable** | bundled `"$75"` as copy | **all five**, none able to take money | **none** |
| **withdrawn** | — | the order leaves the page entirely | none |

`unreachable` changed at this ticket. It used to render nothing, which left a hole where the
checkout is for a visitor who arrived while the API was down. It now draws the client's frame in
full and mounts no element — the panel looks whole and there is still nothing that could quote
`"$75"` to anybody.

## What is actually tunable, which is less than the ticket assumed

The ticket says the appearance object "is where the gold and the ink go." For an
**Apple-Pay-only** element that is false, and it is worth writing down because it will be asked
again at #36 and #38.

Apple draws the button. `ApplePayButtonTheme` is exactly `'black' | 'white' | 'white-outline'`
and there is no fourth. There is no border colour to set, no fill, no typeface. The same rule
that stops the client's own Apple Pay artwork from shipping stops us restyling Stripe's.

| surface | where it lives | what we set |
|---|---|---|
| theme | element options | `white-outline` — the only one of Apple's three that reads as belonging beside a gold-outlined frame on a dark panel |
| type | element options | `buy` — one reading bought outright, not a basket checked out |
| height | element options | `55`, Stripe's ceiling, and still short of the frames' 78px |
| border radius | `appearance.variables` | `25px`, the site's resting radius |
| the gold | nowhere | — |

Option names are pinned against `@stripe/stripe-js@9.14.0`, which was not ceremony: **`wallets`
is deprecated in favour of `paymentMethods`** in this version, and the collection flags exist on
both the element options and `ClickResolveDetails`, where they are deprecated. Re-read the
installed types before changing any of them.

`paymentMethods` also knows about **six** wallets, not two. The ticket names only Google Pay;
Link, PayPal, Klarna and Amazon Pay all default to `'auto'` as well, so scoping to Apple Pay
means setting every other key to `'never'` explicitly.

## The row starts closed and opens when Stripe says so

The plan for this ticket built the "no gap where no wallet is available" criterion on
`onReady`'s `availablePaymentMethods`. **That does not work, and the way it fails is silent.**

Measured against the real export in a headless Chromium: where no wallet can show, Stripe emits
nothing at all — not `ready`, not `loaderror`, not `availablepaymentmethodschange`. Forcing
`applePay: 'always'` does not help either: on any origin that is not a registered payment method
domain, Stripe declines to draw the button and says nothing about it, which is the failure
[#31](https://github.com/YoussefSanad/theworldtarot-frontend/issues/31) exists to prevent.

The first fix was `window.ApplePaySession`, Apple's own capability check. It was wrong in a way
that only showed up in conversation: **it answers for the device, not for a card in the Wallet.**
A Mac that supports Apple Pay with an empty Wallet reports capable, so the row reserved 78px that
Stripe then declined to fill — exactly the gap the criterion forbids, on exactly the
configuration nobody would have tested.

What ships is Stripe's own documented pattern, from the Express Checkout Element guide: start
closed, and open on `availablepaymentmethodschange`. The event does not fire when nothing is
available — which is why no headless browser sees it, and why it looked like a dead end the first
time. It is not a negative signal; it is a positive one, and the absence of it is the answer.

Two details are load-bearing:

- The closed state is `h-0 overflow-hidden`, **not `display:none`**. A zero-size iframe may never
  initialise far enough to report anything, which would leave the row shut permanently — the same
  silent shape as every other failure on this ticket
- `inert` alongside it, so an Apple Pay button that is not being offered is not announced to a
  screen reader or reachable by a tab

The cost is that the button appears rather than being reserved for. It appears into a column that
is `invisible` while the price is in flight, so there is no moment where a visitor is looking at
a settled panel and a payment button arrives under their thumb.

## Nothing is charged, and the sheet is told so

`onConfirm` is a required prop, so there is no option of leaving it off and letting the sheet
spin. It calls `paymentFailed({ reason: 'fail' })`: a customer who authorises with Face ID is
told checkout is not open. Resolving successfully would show a green tick for a payment that
never happened, which is the one thing a payment surface may never do — staging or not,
screenshot or not.

`emailRequired: true` is set even though nothing is done with the value. It is what #31
committed to the backend, and the screenshot going to the client should be of the sheet the
finished checkout will show rather than a shorter one we would quietly grow later.

## The build guard

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is inlined at build time. Both failures the guard catches
are silent ones, which is the only reason it is worth the lines:

| build | key | result |
|---|---|---|
| staging | `pk_test_` | builds |
| staging | `pk_live_` | refused — quotes real money against test-priced orders |
| any non-staging host | `pk_test_` | refused — takes an authorization that can never be captured |
| any | unset | refused — `loadStripe(undefined)` mounts nothing and the build stays green |

The `NEXT_PUBLIC_` prefix is the trap inside the trap. Only prefixed variables are inlined into a
static export, so the same value set as `STRIPE_PUBLISHABLE_KEY` — which is where it was, on the
*backend* environment, where nothing read it — reads as configured everywhere a human looks and
is inert everywhere the code looks. See `DEPLOYMENT.md`.

The guard lives in **both** `next.config.mjs` and `next.config.ts`. Next resolves the `.mjs`
first, so a guard added only to the `.ts` never fires.

## What is proved, and where

`npm run check:panel` can never see an Apple Pay button: Stripe draws one only in Safari, on a
device with a wallet, on a registered payment method domain, and a headless Chromium on
`localhost` fails all three. So its wallet assertions are negatives — the ones that would
otherwise go unnoticed.

```
live         €70 · four client frames · a Stripe element mounted
             label "Pay €70 with Apple Pay" — the API's money, not the bundled copy
             wallet row 0px where this browser has no wallet
withdrawn    no price · no controls · no question · anchor still lands · no element
unreachable  "$75" as copy · five client frames · no wallet row · no element at all
```

**That the sheet opens and quotes the price is proved by hand**, in Safari, on
`staging.theworldtarot.com`, on a device with a card in Wallet. There is no substitute and there
was never going to be one — that is what the acceptance criteria ask for, and it is where the
client's screenshot comes from.
