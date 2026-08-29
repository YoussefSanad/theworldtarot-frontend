# The Apple Pay sheet opens with the live amount

> **Written 28 August 2026** for [#37](https://github.com/YoussefSanad/theworldtarot-frontend/issues/37).
> The first half of Apple Pay: the wallet sheet opens from the reading page quoting the real
> price. **No order is created and nothing is charged** — that is
> [#38](https://github.com/YoussefSanad/theworldtarot-frontend/issues/38).
>
> Follows `reading-page-live-price.md`, which is why that ticket gated this one. A wallet sheet
> is a payment authorization and the number it quotes is a number the customer believes they
> agreed to. It must never be one we invented from a bundled copy string.
>
> **Superseded in part on 29 August 2026 by
> [#48](https://github.com/YoussefSanad/theworldtarot-frontend/issues/48)**, which is #38 arriving
> by another name. Four things below are no longer true and are struck through where they are
> said: the element **charges** now rather than calling `paymentFailed`; it draws **Google Pay
> beside Apple Pay**, so the singular "the Apple Pay button" is wrong throughout; the element is
> mounted on the panel, having spent one ticket unrendered; and the client's frame counts in the
> table below are three in every state rather than four and five. What is *not* superseded is the
> money argument, the availability event, the collapse, and the domain registration — those are
> the parts of this plan the shipped row is built on. The current shape is in
> `src/components/reading/README.md`.

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
| **live** | `formatPrice(money)` — `€70` | ~~four~~ three; the wallet's row is Stripe's | mounted from `offer.money` |
| **unreachable** | bundled `"$75"` as copy | ~~**all five**~~ three, none able to take money | **none** |
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

## ~~Nothing is charged, and the sheet is told so~~ — it charges, from #48

`onConfirm` is a required prop, so there is no option of leaving it off and letting the sheet
spin. ~~It calls `paymentFailed({ reason: 'fail' })`: a customer who authorises with Face ID is
told checkout is not open.~~ From 29 August 2026 it places the order, asks `/pay` for a
`stripe_wallet` payment and confirms the secret that comes back.

**The sentence that survives the change is the reason it was written**: resolving successfully
would show a green tick for a payment that never happened, which is the one thing a payment
surface may never do. So every failure arm of the handler still ends in `paymentFailed` and
there is no arm that simply returns — a handler that returned quietly leaves the sheet spinning
on a payment that is never going to happen.

~~`emailRequired: true` is set even though nothing is done with the value.~~ **It is
load-bearing, and it is the sentence the buyer's identity rests on.** A wallet PaymentIntent has
no Checkout Session, so the backend cannot resolve who paid the way it does on the card road; it
reads the buyer off the charge's `latest_charge.billing_details`, and this flag is what puts an
email there. Without it a wallet payment settles nobody: the order is left pending with the
customer already charged. See the backend's #43 and #44.

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

*Rewritten 29 August 2026, at #48.*

`npm run check:panel` can never see a wallet button: Stripe draws one only in Safari with a card
in Wallet, or in Chrome signed into Google Pay, on a registered payment method domain — and a
headless Chromium on `localhost` fails all three. So what it asserts is everything *around* the
button.

```
live          €70 · three client frames · the element mounts
              label "Pay €70 with a saved wallet" — the API's money, not the bundled copy
              row 0px where this browser has no wallet, and nothing in it reachable
              settled height === loading height — the collapsed row costs the column no gap
              one press: order placed, /pay told method "stripe", record written, browser leaves
ahead         a /pay answer this build cannot read: nothing charged, button pressable again
gifting       the row comes off, and the element it held is destroyed with it
withdrawn     no price · no controls · no question · anchor lands · no row, and no js.stripe.com
unreachable   "$75" as copy · three client frames · no row · no js.stripe.com
no wallet     the API offers none: the card button stands alone and still takes money
```

**The height assertion is the one that is easy to write wrongly.** "Collapses leaving no gap" is
two facts, and a zero-height flex child still takes its share of the column's `gap`. Only the
*panel's* height can show the second, which is why the collapse is proved as `settled.height ===
resting.height` rather than by measuring the row.

`npm run check:confirmation` proves the other end of this road: that the wallet's `return_url` —
reached whatever happened, unlike the card road's `success_url` — paints **nothing** until the
backend has answered, and that `redirect_status=failed` in the address does not change what the
backend is believed about.

**That the button draws and the sheet opens and quotes the price is proved by hand**, in Safari
and in Chrome, on `staging.theworldtarot.com`, on a device with a card in Wallet or an account
signed into Google Pay. There is no substitute and there was never going to be one — that is what
the acceptance criteria ask for, and it is where the client's screenshot comes from.

It also needs `staging.theworldtarot.com` **registered as a payment method domain in test mode**.
Stripe registers exact hostnames, so the apex registration does not cover it, and an unregistered
host fails by the button silently not appearing — which is indistinguishable from a device with
no wallet, and therefore indistinguishable from working correctly.
