# The World Tarot — frontend

The website: a static Next.js export served from Cloudflare, talking to the
Laravel API at `theworldtarot-backend` over HTTP. Everything a visitor can buy,
read or be sent is defined by that API's contract; this file fixes the words
both sides use for it, so the same thing is not called three names across two
repositories.

## Language

### Buying

**Order**:
A record of what somebody chose and what it costs, created by
`POST /api/v1/orders` and priced by the backend from its own catalogue. It
exists before any money does and stays `pending` until it is settled.
_Avoid_: purchase, transaction, basket, cart, checkout (the last is the act, not the record)

**Settle**:
What makes an order paid. Only the backend settles an order, on a verified
Stripe webhook or by hand in the admin panel. A confirmation screen reports a
settlement; it never performs one.
_Avoid_: "flips to paid", "goes through", "completes"

**Pay token**:
The unguessable string returned with an order that carries the authority to pay
it. It is a credential: never in an address bar, a redirect, an analytics event
or a log.
_Avoid_: order token, payment token, order id (ids are sequential integers and are not this)

**Product key**:
A product's permanent, untranslated identifier — `month-ahead`, `one-card`,
`viewing-room-pass`. It is what an order line names, it is the same in every
language, and it is a fixed set the backend validates against.
_Avoid_: product id, SKU, slug, product name

**Payment method**:
One way money arrives, as the backend's registry defines it. There are **two
Stripe methods**, not one, because they are two integrations that no parameter
reconciles: `stripe` creates a **hosted page** the browser is sent to, and
`stripe_wallet` creates a PaymentIntent the **express checkout element**
confirms against on our own page. The choice between them is made on the panel,
by which control the customer presses, rather than inside one sheet.
`stripe_wallet` is agreed with the backend and **not yet published** — ADR 0003
in that repository is explicit that it becomes a published value the moment this
frontend switches it on. Gift code redemption will be a third.
_Avoid_: payment path, checkout option, wallet (a wallet is one presentation of `stripe_wallet`, not a method)

**Hosted page**:
The Stripe Checkout Session the card button sends the browser to, at
`checkout.stripe.com`. Stripe collects the buyer's email and their payment
details there, and returns them to `/checkout/complete/` carrying an opaque
Session id. **It is styled from the Stripe Dashboard's branding screen and from
nowhere else** — there is no CSS, and branding is configured separately in test
and in live. A Session expires after 24 hours, so its URL is never stored: a
customer coming back calls `/pay` again and is handed a fresh one.
_Avoid_: checkout page, payment page, Stripe checkout (the act is a checkout; this is the page it happens on)

**Money**:
A currency and an integer count of its minor units, always together. Never a
float and never a bare number. Formatting is ours; the value is the backend's.
_Avoid_: price (as a number), amount on its own, cents

**Guest**:
A buyer with no session. Guests are the normal case at checkout: they supply a
name and an email, and an account with no password is created for them.
_Avoid_: anonymous user, visitor (a visitor is anyone; a guest is a guest *buyer*)

**Express checkout element**:
The Stripe element we mount in the payment panel, which draws the wallet
buttons. It is ours: its theme, type, height and border radius are ours to set,
within the range Stripe and the wallet vendor allow. It draws buttons; it
authorizes nothing. **It is off the reading page during the interim** — the card
road ships first and `stripe_wallet` has no code behind it yet — which is a fact
about a sequence and not about this definition.
_Avoid_: Apple Pay button, wallet button, payment element (that is a different Stripe element, for cards)

**Wallet sheet**:
The dialog the operating system opens when a wallet button is pressed — Apple's
or Google's, over our page, outside our document. It quotes Money and takes the
customer's authorization. It is **not ours**: we cannot style it, and the only
thing we control about it is the number it is given. A cancelled sheet has
created nothing. **Off the page during the same interim**, and for the same
reason: it is opened by the element above, which is not being rendered yet.
_Avoid_: Apple Pay popup, payment modal, checkout sheet, express checkout element (that is the button, this is the dialog)

### After the money

**Confirmation**:
The screen that tells a customer their payment was received, rendered from the
payment intent rather than from an order. It reports what Stripe says, never
what we hope the backend has since done.
_Avoid_: success page, thank you page, receipt

**Receipt**:
The email the backend sends when an order settles. Not a page and not ours.
_Avoid_: confirmation email

**Claim link**:
The link in that email inviting a buyer with no password to set one. It points
at our `/set-password/`, and it is the reason that page has to exist before the
first real payment.
_Avoid_: activation link, welcome email, invite

### Environments

**Integration origin**:
The one HTTPS hostname the checkout is proved on: `staging.theworldtarot.com`,
against `staging-api.theworldtarot.com`. Singular deliberately — Stripe
registers exact hostnames as payment method domains, so a per-branch preview URL
would need re-registering every branch and would fail by silently not rendering
a wallet button.
_Avoid_: preview URL, staging frontend, branch deploy, the Laravel Cloud platform URL

**Stateful origin**:
An origin the backend has listed in `SANCTUM_STATEFUL_DOMAINS`. Requests from
one carry a session cookie, and every write from one needs an `X-XSRF-TOKEN`
header or the API answers 419. Our staging origin is already one, so checkout is
not exempt even though it never signs anybody in.
_Avoid_: trusted origin, allowed origin (that is CORS, which is a separate list)
