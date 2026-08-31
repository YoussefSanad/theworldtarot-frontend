# The card button becomes a redirect to Stripe's hosted page

> **Written 29 August 2026.** The decision and its cost are in
> `docs/adr/0002-checkout-happens-on-stripes-page.md`; the backend's half is in
> that repo's `docs/adr/0002-the-redirect-case-comes-back.md`. This is what gets
> built.
>
> **The control this plan calls "Buy Now" is `HostedCheckoutButton` from 31
> August 2026**, and "the checkout button" in prose. The label it was named for
> moved three times in three days, so the identifier was renamed after the road
> it starts rather than the words on it; the argument is in that file and the
> term is fixed in `CONTEXT.md`. **Every "Buy Now" below is left as written** —
> this is a dated plan, and it is the name the control had when it was drafted.
>
> **This is one of two roads, and it is the one whose backend is already
> shipped.** The wallet road — Apple Pay and Google Pay drawn by the express
> checkout element on our own page — is decided in the backend's
> `docs/adr/0003-the-wallet-keeps-its-own-payment-intent.md` and has **no code
> behind it yet**. `docs/plans/apple-pay-sheet.md` is its plan, it is not
> superseded, and `ExpressCheckout.tsx` is unrendered rather than removed for
> the length of the interim. See "The wallet is coming back" below.
>
> **The interim ended on 29 August 2026.** The backend built `stripe_wallet` and
> frontend #48 mounted the element above Buy Now, so every sentence in this plan
> about the wallet having no code behind it, and about `ExpressCheckout.tsx`
> being unrendered, is history. **The card road this plan is actually about is
> unaffected** — it is still a redirect to a hosted page, and the `/pay` call
> that starts it now names itself `method: "stripe"` rather than leaving the
> method to a default. The current shape of the panel is in
> `src/components/reading/README.md`.

---

## The flow, end to end

```
reading page
  question typed, Buy Now pressed
    POST /api/v1/orders                     -> order, pay_token, total
    POST /api/v1/orders/{pay_token}/pay     -> { type: "redirect", redirect_url }
      body: { return_to: "month-ahead" }
    rememberCheckout({ payToken, money, question, sessionId })
    location.assign(redirect_url)

checkout.stripe.com
  buyer's email and payment details collected by Stripe
    paid     -> success_url  /checkout/complete/?session_id={CHECKOUT_SESSION_ID}
    cancelled-> cancel_url   the reading page named by return_to

/checkout/complete/
  render "payment received" from the record, immediately
  POST /api/v1/orders/status { pay_token }  -> the intent's status
  correct the screen only if it disagrees
```

**Two round trips happen before the browser leaves**, and the button holds a
pending state across both. Placing the order earlier — on question blur — was
rejected: it mints a `pending` order for everyone who types a sentence and
leaves. Folding the two calls into one endpoint was rejected too; it buys about
300ms and destroys the place-then-pay shape that makes a retry safe.

### Four things the contract publishes that an earlier draft of this plan got wrong

These are all `API_CONTRACT.md` section 2, and each of them is a bug that would
otherwise be found on staging rather than here.

1. **The field is `redirect_url`, not `url`.** An earlier draft of this flow
   wrote `{ type: "redirect", url }`. Reading the wrong key hands
   `location.assign` an `undefined` and strands the customer on the reading page
   with an order already placed
2. **`return_to` is what makes the cancel path land anywhere.** It is optional,
   and it is a **product key** — `one-card`, `three-card`, `month-ahead`,
   `in-depth` — never a path and never a URL. The frontend does not send return
   addresses; the backend builds both of them from a configured origin. **Send
   nothing and a cancelled checkout lands on the readings index**, which fails
   the acceptance criterion about returning to the originating page. Anything
   outside that set is a 422 on `return_to`, never a fallback. The page already
   holds the value, as `reading.productKey`
3. **The session id is not what the status endpoint takes.** Corrected in the
   contract on 29 August. A `cs_...` id is opaque, nothing on the backend maps
   one to an order, and `POST /orders/status` takes the **pay token** in the
   body. The session id in the query string is Stripe's; here it is used for one
   thing only, as the stale-result guard, and it is never sent anywhere
4. **`name` and `email` are optional on `POST /orders` for a guest**, since 29
   August. `PlaceOrderInput` types both as required today and must relax them.
   The relaxation is what lets Buy Now place an order from a page that collects
   neither — Stripe's page collects the buyer's email, *after* the order exists,
   and the webhook fills identity from `session.customer_details`

## What the panel becomes

`GetMyReading` draws five frames. Three of them — Apple Pay, Google Pay, Pay
with Card — become **one Buy Now button** for the length of the interim.
`Redeem A Gift Code` stays a dud until gifting ships; `Gift a Reading` stays live.

> **Superseded on 31 August 2026 (#62).** The redeem frame was not kept until
> gifting shipped — it was removed from the panel, redemption having become a
> page of its own. The row for it below is history; nothing else in this table
> changed.

| frame | before | after this ticket | after the wallet road |
|---|---|---|---|
| Apple Pay | `ExpressCheckout` on `live`, ghost otherwise | — | `ExpressCheckout`, wired |
| Google Pay | dud (#36) | — | drawn by the same element |
| Pay with Card | dud (#38) | **Buy Now**, real | **Buy Now**, unchanged |
| Redeem A Gift Code | dud | dud, unchanged | ~~dud, unchanged~~ removed, #62 |
| Gift a Reading | live | live, unchanged | live, unchanged |

**The rule the panel turns on is unchanged**: where there is no live money there
is nothing that can take a payment. `Buy Now` needs `offer.money`, so it renders
as an inert frame on `unreachable` exactly as the wallet did, and sits inside
the `invisible`/`inert` block on `loading` for the same reason it always did —
498px arriving under a thumb is how somebody pays for what they did not mean to.

**Three frames rather than five is Jennifer's to approve**, and it is the same
approval as the Stripe-branded page. One screenshot, both questions — #46.
**She is approving an interim panel**, and that is worth saying to her rather
than discovering later: the wallet row returns above Buy Now when the wallet
road ships, and it collapses to nothing on any device without a wallet, which is
every device she is likely to be shown it on.

### ~~Buy Now is inert in gift mode~~ Both controls take money in gift mode

> **Superseded on 30 August 2026**, at the client's request. The section below
> is what shipped first and the reasoning it rests on; what replaced it follows.

~~`ReadingOrder` swaps `AskQuestion` for `RecipientDetails` when gifting, and
**`POST /orders` has no field for a recipient email or a gift message**. Today
that is harmless because every button in gift mode is a dud. One live button
makes it a bug that charges somebody for a gift delivered to themselves.~~

~~So Buy Now is inert while `gifting` is true, with a line saying gifting is
coming.~~

The endpoint still has no such field, and the wallet row was removed on the same
grounds — a wallet takes the money the instant a face is recognised. What that
reasoning missed is that **fulfilment here has never been automatic**: the
backend's `MarkOrderFulfilled` writes a timestamp and Jennifer emails every
reading by hand, so no machine was ever going to deliver a gift to its buyer.
The risk was that a *person* would, for want of anything on the order saying it
was a gift.

So the recipient rides on the order line instead. `orderNoteIn`
(`lib/order-note.ts`) reads whichever section the form has mounted and composes
the gift's two fields into the line's `question` — the field the admin orders
table already prints — and both payment controls read through it. Its one
invariant is that a gift order is never indistinguishable from a self-purchase,
however little the buyer typed.

Two things follow and are worth stating rather than discovering:

- **The record is flagged.** A cancelled gift checkout must not refill the
  question textarea with a note this code composed, so `CheckoutRecord.gift`
  marks it and `questionFor` refuses it. The cost is that the recipient and the
  message are lost on a cancelled gift checkout — the smaller of the two losses,
  and the milestone's to fix properly.
- **The copy changed with it.** `checkout.giftingComing` said there was no way
  to pay for a gift; it now says a person will arrange delivery by email. A note
  refusing the payment under a button that charges is worse than no note.

Gifting is still the **code model** — the buyer names a recipient, the recipient
redeems a code and writes their own question, which is what the
mutually-exclusive fields already imply and what the backend has reserved
`method: 'gift_code'` and `nothing_to_pay` for. **It is still a separate
milestone**, and what is above is a stopgap with that as its end date.

## The confirmation screen

`CheckoutComplete` keeps its shape, its four outcomes and its copy. Only where
the status comes from changes.

**Why it has to change.** Stripe used to put `payment_intent_client_secret` in
the return URL, and a client secret is a bearer credential scoped to one intent
— which is why `retrievePaymentIntent` works with a publishable key.
`success_url` gives `{CHECKOUT_SESSION_ID}` instead. That is an **opaque id**;
`checkout.sessions.retrieve` is a secret-key call and Stripe.js has no
client-side equivalent for a hosted Session. The browser lands holding a string
it cannot resolve, so the only party that can answer is our own backend.

**It renders optimistically.** `success_url` is reached only after Stripe has
taken the payment — a declined card keeps the customer on Stripe's page to
retry. So where the URL carries a `session_id` **and** `sessionStorage` holds a
record, the screen paints `received` with the Money at once and verifies in the
background, correcting only on disagreement. A typed URL has neither and falls
to `unknown`, exactly as today.

**It still reports a payment and never a fulfilment.** The status endpoint
answers the PaymentIntent's status, not the order's, so `payment-outcome.ts` is
untouched and no sentence here claims a reading has been sent.

### It verifies once and does not poll, and this diverges from the contract

`API_CONTRACT.md` says of `POST /orders/status`: *"This is a poll, so poll it
politely. A short interval for a few seconds after the return, then back off."*
**This screen does not poll, and the divergence is deliberate rather than an
oversight.** It is named here so the next person reads a decision instead of a
bug.

The contract's advice is written for a screen that starts at "we do not know".
This one does not: it starts at `received`, because `success_url` is unreachable
until Stripe has taken the money. A poll can therefore only do one of two
things, and neither is worth having — confirm what is already on screen, or
mutate a message underneath somebody who is reading it. **A message that changes
under a reader is worse than one that was complete when it arrived**, and the
**receipt** email is already the channel for fulfilment.

So: **one verification call, and one correction at most.** Where it answers a
status that disagrees, the screen corrects. Where it 503s, or answers something
this build has never heard of, **the optimistic paint stands** — that is the
contract's "we do not know yet" arriving at a screen that already has something
honest to show, and replacing `received` with a hedge on the strength of not
knowing would be the worst of both.

The one case that earns a second look is `requires_payment_method` on a fresh
return, which is what an order answers before its payment exists. It cannot
normally be seen here. **If staging shows it, a single retry a second later is
the fix, not a poll loop** — and it goes in this plan before it goes in the code.

### `lib/checkout-session.ts` changes shape

`clientSecret` goes; there is no longer one on the client **for this road**.
`question` arrives, so a cancelled checkout can put it back in the textarea.

```
payToken   unchanged — still never rendered, logged, or put in a URL
money      unchanged
question   new — restored on cancel
sessionId  new — the stale-result guard, replacing paymentIntentId()
```

`paymentIntentId()` and `checkoutFor()` are rewritten against `sessionId`. The
guard's job is unchanged: a record naming a different payment than the one on
screen describes some other purchase and none of it may be shown.

**`clientSecret` returning when the wallet road lands is expected**, and the
record should be shaped so that it can — the two roads leave different things
behind and the confirmation has to read both. Making the field optional now,
rather than deleting and re-adding it, is the cheaper of the two. It is still
validated rather than cast: `recallCheckout` rejects a record whose shape this
build did not write, which is the ordinary way a record from an older deploy
returns unusable.

`sessionStorage` survives the round trip to Stripe — it is scoped to the tab,
not the document, and a cross-origin navigation and return does not clear it.

## The cancel path

`cancel_url` is built by the backend from the `return_to` product key, and the
question is restored from the record. **Losing several sentences of typed
question silently is the worst thing this flow can do**, and it is the one thing
a redirect makes easy to get wrong.

The order stays `pending`. Orders never expire, so pressing Buy Now again mints
a fresh Session against a fresh order — and the Session URL is **never**
persisted, because a Session expires after 24 hours and a stale URL lands the
customer on a Stripe error page.

**Restoring the question needs the reading page to read the record on mount**,
which is the one piece of this that is not on the checkout path at all: a
customer who cancels arrives at an ordinary page load with nothing in the URL to
say where they came from. The record's `question` is the only evidence, and it
belongs to the product the record was made against — so it is restored only onto
the page whose `productKey` matches, and never onto a different reading.

## What the backend has already shipped

All three of these are **closed and merged** — YoussefSanad/TheWorldTarot#39,
#41 and #42 — which is what unblocks this ticket:

1. **`PaymentInstruction::redirect($url)` restored**, and `StripeCheckout`
   creating a Session with `price_data` from the stored order,
   `payment_intent_data.metadata.order_id`, `adaptive_pricing` disabled, and
   `success_url`/`cancel_url` built from a configured frontend origin
2. **A guest may place an order with no name or email.** Stripe collects the
   buyer's email, after the order exists; the webhook fills identity from
   `session.customer_details`
3. **`POST /api/v1/orders/status`**, pay token in the **body**, answering the
   PaymentIntent's status string

`orders.ts` grows the `redirect` arm it was told to delete on 26 August, and
gains a `fetchPaymentStatus`. `payOrder`'s `unrecognised` arm is why nothing
crashes in the window where the frontend has shipped and the backend has not.

## The wallet is coming back, and this plan does not close that door

The client asked for Apple Pay and Google Pay on our own page on 29 August, and
the backend agreed the shape the same day: **`/pay` gains a second method**,
`stripe_wallet`, which creates a PaymentIntent and answers a `client_secret` for
the express checkout element to confirm against. Backend ADR 0003 has the
reasoning, the trap and the naming.

~~**It has no code behind it.** `grep stripe_wallet` across the backend returns
nothing and `config/payments.php` still registers one Stripe method.~~ **It was
built on 29 August 2026** — backend #43, merged to `staging` — and frontend #48
switched it on the same day, so the three bullets below describe an interim that
is over. They are kept because the reasoning in them is why the row was held
back rather than deleted, and that reasoning is what brought it back working.
As written at the time:

- **`ExpressCheckout.tsx` is unrendered, not deleted, and not because the wallet
  was rejected.** It is a dud — its `onConfirm` calls `paymentFailed` — and a
  button that fails after Face ID has no business sitting beside one that
  charges. It comes back when it works
- **`docs/plans/apple-pay-sheet.md` is not superseded.** It is the plan for the
  road that is still coming
- **`walletAppearance` in `lib/stripe.ts` stays.** It does not reach the hosted
  page and does reach the element
- **`getStripe()` keeps its callers.** The confirmation stops using it on this
  road, and the wallet road needs it back

Three things ADR 0003 asks of this frontend, none of which are in this ticket
and all of which want recording before somebody does the opposite by accident:

- **`googlePay` becomes `'auto'`** in `ELEMENT_OPTIONS`, and `buttonTheme` /
  `buttonType` grow a `googlePay` key. It is `'never'` today, and the client
  asked for both wallets
- **`emailRequired: true` is a requirement again, not a leftover.** The buyer's
  identity on the wallet road is read off `latest_charge.billing_details`, which
  is populated by that flag. `API_CONTRACT.md` section 9 currently says it "was
  a requirement here and is gone with the element" — that sentence is wrong from
  29 August and the backend owns correcting it
- **Whether the wallet is offered at all becomes a question worth an endpoint.**
  `PaymentMethods::offered()` has existed with no caller since `051c6a1`. The
  panel draws one button or two on the answer, and there is **no such endpoint
  in `API_CONTRACT.md` today.** It is the wallet ticket's first dependency

## The `CONTEXT.md` edits, which are not what an earlier draft said

An earlier draft of this plan opened by striking **Express checkout element**
and **Wallet sheet** from the vocabulary on the grounds that neither was ours
any more. **Do not make that edit.** Both are ours, both come back onto the
page, and a term removed and restored inside a fortnight is how a shared
vocabulary stops being trusted.

What is actually edited, and it is one entry:

- **Payment method.** It reads *"Apple Pay, Google Pay and card are all a single
  method, `stripe`, because they are one PaymentIntent and the choice between
  them is made inside our page."* Every clause of that is now wrong. They are
  **two** methods, because they are a hosted Session and a PaymentIntent, and
  the choice between them is made on the panel rather than inside one sheet.
  Name `stripe` as the hosted road; name `stripe_wallet` as **agreed with the
  backend and not yet published**, because ADR 0003 is explicit that it becomes
  a published value the moment this frontend switches it on
- **Express checkout element** and **Wallet sheet** stay, unedited. A sentence
  may be added to each noting they are off the page during the interim, but the
  definitions do not move
- Optionally, a new entry for the **hosted page** — the Stripe Checkout Session
  the card button sends the browser to — since it is a thing both repos now name
  and neither defines

## Two hazards worth naming

**The two emails.** Under the relaxed-identity change the *buyer's* email comes
from Stripe and the *recipient's* from our form. Two addresses on one order from
two sources. Swap them and the buyer receives their own gift while the recipient
gets a receipt. This cannot happen today because there is only one address; it
becomes possible the moment gifting lands, and it is the kind of bug that ships.

**Branding is per-mode.** The Dashboard's Checkout branding is configured
separately in test and live. Configuring test and assuming live followed is how
a live checkout ships wearing Stripe's defaults.

## What is proved, and where

`npm run check:panel` loses its wallet assertions — there is no element on the
page to assert the collapse of while the wallet road is unbuilt. **The negative
is what replaces them**, and it is worth more than it looks: that no Stripe
iframe is mounted on the reading page at all, in any state. Stripe.js is not
loaded on this road, and a check that would notice it coming back is the check
that catches a half-finished wallet ticket shipping by accident.

```
live         €70 · three frames · Buy Now enabled, labelled with the price
loading      Buy Now present, invisible and inert
unreachable  "$75" as copy · three frames · Buy Now inert · no request possible
gifting      recipient fields shown · both controls live · the line names the recipient
```

The `unreachable` case keeps the assertion that matters most: **no request is
possible**. `reading.price` is the string `"$75"` for a reading the catalogue
prices at EUR 7000 — no currency, and a number nobody has verified today.

**Everything past the redirect is proved by hand** on `staging.theworldtarot.com`
against `staging-api.theworldtarot.com` — #47: the Session opens quoting the
order total in the order's currency, a test card pays, `/checkout/complete/`
reports `received` without a spinner, cancel returns to **the reading page named
by `return_to`** with the question intact, and the order settles in the admin
panel. There is no substitute — the same as it was for the wallet sheet, for the
same reason.

The build guard on `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in both `next.config`
files **stays**. Stripe.js is no longer loaded on the reading page on this road,
but the key still gates a build against pointing test money at a live host — and
the wallet road needs it loaded again.

## Order of work

1. Both ADRs and the `CONTEXT.md` **Payment method** edit — **before any code**.
   A reversal with no recorded reason is how the next person re-reverses it
2. ~~Backend: the three changes above~~ **done** — #39, #41, #42 all closed
3. Frontend: `orders.ts` — the `redirect` arm reading `redirect_url`, the
   `return_to` body field, `fetchPaymentStatus`, and `name`/`email` optional
4. Frontend: `Buy Now` replacing the three frames, `ExpressCheckout` unrendered
5. Frontend: `checkout-session.ts` and `CheckoutComplete`
6. Frontend: the reading page restoring the question on cancel
7. `check:panel` rewritten to the four cases above
8. Dashboard branding, **test mode**, screenshot to Jennifer — #46, noting that
   what she is approving is an interim panel
9. On approval: live-mode branding, then prove on staging — #47
10. **The wallet road**, once the backend ships `stripe_wallet` — and
    `ExpressCheckout.tsx` and `apple-pay-sheet.md` are **not** deleted at any
    step of this list

## Open

- **Which Stripe screen was configured on 29 August**, and in which mode. #46
  records this as established; the plan no longer carries it
- **Jennifer**: the Stripe-branded page, and five frames becoming three — and
  that three is an interim rather than a destination
- **`PaymentMethods::offered()` has no published endpoint.** The wallet ticket
  needs one before the panel can decide whether to draw one button or two
- **Custom domain** (`checkout.theworldtarot.com`) is deferred. It is a paid
  Stripe feature, and it removes the familiarity that is half the argument for
  the hosted page in the first place
