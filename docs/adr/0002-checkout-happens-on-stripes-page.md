# The card button is a redirect to Stripe's hosted page

> **Decided 29 August 2026.** This reverses the decision of 25–26 August 2026 that
> put checkout in our own page. That decision is recorded in
> `API_CONTRACT.md` sections 2 and 9, in the backend's `PaymentInstruction`
> and `StripeCheckout`, and in `lib/orders.ts` here. **All of them say a hosted
> page cannot deliver the design. That was true of the design as it stood.**
>
> **Naming, 31 August 2026.** This file's "card button" and "Buy Now" are both
> superseded as names: the control is `HostedCheckoutButton` in the code and
> "the checkout button" in prose, fixed in `CONTEXT.md`. The title stands as
> written — the decision it records is the card road going to a hosted page, and
> that is unaffected by what the control is called.
>
> **Amended the same day, before either half shipped.** An earlier draft of this
> file was titled "…and the wallet leaves the reading page" and struck the
> express checkout element from `CONTEXT.md`. **The client asked for the wallet
> buttons back on our own page on 29 August**, and the backend agreed the shape
> the same day in `docs/adr/0003-the-wallet-keeps-its-own-payment-intent.md`.
> That draft was never committed, so this corrects it rather than superseding
> it — but the reason is recorded here, because a reversal with no recorded
> reason is how the next person re-reverses it.

## What changed

Not Stripe, and not the constraint. **Stripe still has no parameter that
pre-selects a wallet on its hosted page**, exactly as the original decision
said. What changed is that we no longer want one *for the card button*.

The **express checkout element** is the only control on the reading panel whose
size is not knowable when the page is built. It renders a button on a Safari
with a card in Wallet and nothing at all everywhere else, so
`docs/plans/apple-pay-sheet.md` could not reserve its space — it collapses the
row to `h-0` and lets the buttons below it move up. That is correct behaviour
and it is still the wrong thing to hang a whole panel's layout on: the column is
laid out in `cqw` against a container query at four widths, and one row of it is
a different height on a Mac than on a phone, for reasons no stylesheet here can
see.

**One button whose height is a constant is worth more than a wallet sheet that
saves a tap** — *as the control the panel is laid out around*. A customer who
presses it lands on a page they have seen on other people's websites, which is
its own kind of reassurance.

## The claim this ADR makes, and the one it does not

This is the distinction the first draft got wrong, and it is worth stating in
its own section because the whole shape of the panel turns on it.

**The claim: a wallet sheet cannot be the control this panel is laid out
around.** Its height is unknowable at build time and the panel's rhythm is not.
So the always-present control — the one that is there for every visitor on every
device — is a fixed-height button, and pressing it sends the browser to Stripe.

**Not the claim: that a wallet button is unwelcome.** Nothing above is an
argument against a wallet button that *collapses to nothing* when there is no
wallet, sitting above a fixed-height button that is always there. That is the
arrangement `ExpressCheckout.tsx` was already built for, and it is exactly why
its row holds `h-0 overflow-hidden` rather than reserving space.

So the panel gets both roads, and they are two different Stripe integrations
that no parameter reconciles: **a hosted Checkout Session is an address you send
a browser to; the express checkout element is an iframe you mount.** The backend
answers `/pay` two ways accordingly — `stripe` with a `redirect_url`,
`stripe_wallet` with a `client_secret`. See backend ADR 0003.

## What this costs, stated plainly

- **Apple Pay stops being one tap _on the card road_.** Inside Stripe's page it
  is chosen from a list like any other method. On the wallet road it stays one
  tap, which is the whole reason that road is being kept
- **`walletAppearance` in `lib/stripe.ts` does not reach the hosted page.** A
  hosted page is styled from the Stripe Dashboard's branding screen — a logo, a
  brand colour, an accent, a font from Stripe's list — and from nowhere else.
  There is no CSS. It still reaches the express checkout element, so it is not
  dead code
- **The confirmation can no longer ask Stripe anything on the card road.**
  `success_url` carries `{CHECKOUT_SESSION_ID}`, which is an opaque id and not a
  credential; retrieving a Checkout Session is a secret-key call. It asks our own
  backend instead. See the plan
- **`checkout.stripe.com` is in the address bar** on the card road. A custom
  domain is a paid Stripe feature and is deferred; it would also remove the
  familiarity that is half the argument above
- **Two integrations rather than one**, and this is the cost the first draft did
  not have to pay. Two shapes out of `/pay`, two ways a payment can start, two
  ways it can be confirmed — and only one settlement path, which is the part
  that keeps it honest. See "What does not change"

## What this buys

- **A panel whose always-present control lays out the same on every device**,
  which is the whole reason
- **Every method Stripe offers on the card road**, turned on from a Dashboard
  rather than wired
- **The card path never needed a Payment Element.** #38 was going to mount one.
  It is now unnecessary rather than unbuilt

**Payment method domain registration is still owed**, and the first draft was
wrong to list avoiding it as a benefit. Wallets on Stripe's *hosted* page are
registered against Stripe's domain, but an express checkout element mounted on
our own origin needs `theworldtarot.com` registered in test and in live — and it
fails by the button silently not appearing, which is indistinguishable from a
device with no wallet and therefore indistinguishable from working correctly.
ADR 0001 lists it as one of three things every new frontend environment costs.
It stays owed.

## What does not change

**The seam.** An order is placed by us, priced by us, and settled by us on
`payment_intent.succeeded`. Stripe sees one line item and an amount, on either
road. Everything in `CONTEXT.md` under **Order**, **Settle**, **Pay token**,
**Money** and **Guest** stands unaltered, and so does the rule that the
confirmation reports a payment and never a fulfilment.

**Express checkout element** and **Wallet sheet** stay in `CONTEXT.md` and stay
ours. The first draft struck them. They are not on the page during the interim
described below, which is a fact about a sequence and not about a vocabulary —
and the interim ended on 29 August 2026, which is why both entries now describe
a row that is drawn.

**Payment method** is the one entry that does change, and it changes because of
backend ADR 0003 rather than because of this one: Apple Pay, Google Pay and card
were "a single method, `stripe`, because they are one PaymentIntent". They are
now two methods, because they are a PaymentIntent and a hosted Session.

## The order this arrives in

*This section describes an interim that has since ended. See the note at its
foot.*

The card road ships first, alone. The backend's half of it is **already
shipped** — `/pay` answers `redirect`, `POST /orders/status` exists, and a guest
may place an order with no name or email. The wallet road's backend half,
`stripe_wallet`, is **decided and unbuilt**: ADR 0003 has no code behind it yet.

So `ExpressCheckout.tsx` is **unrendered rather than removed** while that is
true, and the panel draws three frames instead of four. Not because the wallet
was rejected — it is a dud today, whose `onConfirm` deliberately calls
`paymentFailed`, and a button that fails after Face ID has no business sitting
beside one that charges. **It is unrendered because it does not work yet, and it
is kept because it is going to.**

`docs/plans/apple-pay-sheet.md` stays on disk for the same reason and is not
superseded — it is the plan for the road that is still coming.

**It came, on 29 August 2026.** The backend built `stripe_wallet` (its #43,
merged to `staging`), and frontend #48 mounted the element above Buy Now. So the
two paragraphs above are history: the element renders, its `onConfirm` charges,
and the decision this ADR records — **the card road goes to Stripe's page** — is
what is unaffected and why the ADR still stands. What the wallet road does
instead, and why the two are not one thing, is the backend's ADR 0003; what the
panel now draws is `src/components/reading/README.md`.

The panel draws **three** client frames in every state, not four. The fourth was
never a frame of the client's: the wallet row is Stripe's, it sits above them,
and it collapses to nothing on every device without a wallet.
