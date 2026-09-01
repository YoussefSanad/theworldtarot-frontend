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

**Order note**:
The one free-text string an order line carries, as `lines[].question` on the
wire. It is the customer's **question** on a self-purchase and a composed
**gift note** in gift mode — "Gift — send this reading to …", built from the
recipient's address and the buyer's message, because `POST /orders` has no
field for either. The wire name is the backend's and does not describe the
contents; `lib/order-note.ts` is where the two are told apart, by which section
the form has mounted. **A stopgap whose end is now designed rather than hoped
for**, decided 1 September 2026 (#54), and still what ships today. What replaces
it: the recipient, the message and the **gift signature** become columns on a
**gift**, so nothing is composed into a field that was never for it, and a gift
order's line carries **no** `question` at all until the **querent** asks one.
`giftNote` and the `gift` flag in the checkout record are then deleted rather
than rewired — there is nothing left for either to tell apart.
_Avoid_: "the question" for the gift case (it is not one), comment, note field, message

**Payment method**:
One way money arrives, as the backend's registry defines it. There are **two
Stripe methods**, not one, because they are two integrations that no parameter
reconciles: `stripe` creates a **hosted page** the browser is sent to, and
`stripe_wallet` creates a PaymentIntent the **express checkout element**
confirms against on our own page. The choice between them is made on the panel,
by which control the customer presses, rather than inside one sheet.
~~`stripe_wallet` is agreed with the backend and not yet published~~ — it went
live on **29 August 2026**, which is the moment ADR 0003 in that repository said
would publish it. **Both methods are now named** in the `/pay` call: the card
road sends `method: "stripe"` rather than leaving it to a default, so neither
road is the one the backend has to assume. Which methods an environment offers
is answered by `GET /payment-methods`, and an environment that offers no wallet
draws no wallet row. ~~Gift code redemption will be a third.~~ **Withdrawn 1 September 2026,
before it ever had a caller.** Redeeming collects nothing because the order was
paid at purchase, and there is no second order for a third method to settle —
so `gift_code` names a payment that does not happen. It is struck from
`API_CONTRACT.md` too; `GET /payment-methods` keeps the two it has. See the
backend's `docs/adr/0004-a-reading-is-a-row-of-its-own.md`.
_Avoid_: payment path, checkout option, wallet (a wallet is one presentation of `stripe_wallet`, not a method)

**Checkout button**:
The control on the reading panel that starts the hosted-page road: a press
places an **order**, starts its payment and sends the browser to Stripe. It is
`HostedCheckoutButton` in the code and `data-hosted-checkout` in the DOM. **It
names no payment method**, in its label or its identifier — the **hosted page**
offers whatever the Dashboard has turned on, so a button naming one would be
wrong the first time somebody pays with anything else.
~~`BuyNow`~~ — renamed **31 August 2026**, after the label moved three times in
three days ("Buy Now", "Continue to Checkout", "Pay Another Way") and left the
identifier naming copy that no longer existed. ~~"the card button", used twice
in this file~~: corrected in the same change, for the reason the label already
avoided the word.
_Avoid_: Buy Now, Pay Another Way (labels it has worn, not what it is), card button, pay button. **Two document titles still say "card button"** — `docs/adr/0002-*` and `docs/plans/hosted-checkout.md` — and stay that way: they are dated records, each noting the rename.

**Hosted page**:
The Stripe Checkout Session the **checkout button** sends the browser to, at
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
authorizes nothing. ~~It is off the reading page during the interim~~ — it is
**on the reading page from 29 August 2026**, above the **checkout button**, and the
interim it was waiting out has ended. It draws **nothing at all** on a device
with no wallet, and the row it sits in collapses to no height and no gap when it
does, so its absence costs the panel nothing.
_Avoid_: Apple Pay button, payment element (that is a different Stripe element, for cards), and **"the wallet button" as a name for _this_** — it draws buttons, plural, and which ones is Stripe's decision at runtime. ~~"wallet button" outright~~: corrected 29 August 2026, because it is the right name for the thing Stripe draws *inside* the element, which had no other name and which this file already used it for twice. The element is not a button; a wallet button is what it renders.

**Wallet sheet**:
The dialog the operating system opens when a wallet button is pressed — Apple's
or Google's, over our page, outside our document. It quotes Money and takes the
customer's authorization. It is **not ours**: we cannot style it, and the only
thing we control about it is the number it is given. A cancelled sheet has
created nothing. ~~Off the page during the same interim~~, and reachable from
29 August 2026 for the same reason the element above it is: it is opened by
that element, which is now rendered.

It is also the one thing in this vocabulary that **no automated check in this
repo can reach**. Stripe draws a wallet button only in Safari with a card in
Wallet, or in Chrome signed into Google Pay, on a registered payment method
domain — so `check:panel` proves the row and the collapse, and a real device is
what proves the sheet.
_Avoid_: Apple Pay popup, payment modal, checkout sheet, express checkout element (that is the button, this is the dialog)

### The reading itself

**Reading**:
A question somebody asked and the answer owed for it. **Becomes a row of its
own**, rather than a property of an order line — decided 1 September 2026 and
not yet built; the argument is the backend's
`docs/adr/0004-a-reading-is-a-row-of-its-own.md`. It exists from the moment
somebody **asks**, which is settlement on a self-purchase and **redemption** on
a gift, and it is the only thing in this system that is ever waiting to be
written.

**An order is not one.** An order is what somebody bought and what it cost; a
reading is what they asked. Those were the same event until a gift could be
bought in September and asked in December, and one row holding both cannot say
that a paid reading has no question yet.
_Avoid_: order, order line, fulfillment, delivery (the last two are what happens
to a reading, not what it is)

**Ask**:
The one moment a reading starts existing, and the only moment Jennifer is told
one is waiting. It was the clock the 24-hour rush would have run from — **the
rush is gone from the design, dropped 25 August 2026, and is not returning** —
but the reasoning survives it for any delivery promise counted from a purchase:
"within 24 hours" of a gift bought three months earlier is a promise about
nothing.
_Avoid_: submit, request, order, place (an order is placed; a reading is asked
for)

**Querent**:
The person a reading is for, whose question it answers and whose address it is
sent to. **The tarot's own word, taken because the three this vocabulary
already has are each wrong for it**: a **Customer** need not exist, since
nothing here makes the recipient of a gift sign up; a **Guest** is a *buyer*
with no session; and a **Recipient** is who a gift was addressed to rather than
who redeemed it.

On a self-purchase the querent is the buyer. On a gift they are whoever spent
the code, **which is usually and not always the recipient** — a forwarded email
is enough to part them, and the reading goes to the querent because that is the
person who asked.
_Avoid_: recipient, reader, customer, end user

### Gifting

Nothing in this section is built yet. It is the vocabulary settled while planning
#54 on 1 September 2026, written down before the tickets are cut so that six
of them do not each invent a word. The decisions behind it are
`docs/adr/0003-redemption-is-a-page-of-its-own.md` here and ADRs 0004 and 0005
in the backend.

**Gift**:
One purchase, addressed to somebody else. **A mode of an order rather than a
product or a second order**: the money, the currency and the line are exactly
what a self-purchase places, and what makes it a gift is a row beside it holding
the address the buyer typed.

**A gift is not a reading**, and the gap between them is the whole feature. It
becomes one when it is **redeemed**, and until then nobody has asked anything
and there is nothing anyone could write.
_Avoid_: gift card, voucher, credit (all three name an amount; a gift names one
reading and is worth the right price in every currency), gift reading

**Gift code**:
The string carrying the authority to redeem one gift, in a link the recipient
clicks and in the same characters printed underneath for them to type.

**A bearer credential like a pay token, with the opposite handling rule.** A pay
token may never reach an address bar; this one is built to. The two forms are
one authority, so **a link is never safer than the code inside it** and the
entropy has to be in the code — which is why it is **not derived from anything
about the gift**. `3CARD10021`, the client's example, names its own value and
can be counted to; `Order::mintPayToken` already argues that point for the
token beside it.
_Avoid_: voucher code, coupon, promo code, discount code (nothing here is
discounted), gift certificate, redemption token

**Redeem**:
The one moment a gift becomes a reading, and **the third word of that shape in
this vocabulary** — it is not **settle**, because no money moves and the order
was paid at purchase, and it is not **claim**, which finishes an account.
Single-use and atomic: what it spends is the code, and what it makes is the
reading.
_Avoid_: activate, use, cash in, **apply** (a code is *applied* to a basket;
this one meets no basket and reduces no total)

**Redemption page**:
`/redeem/`, one page for every reading rather than one per reading, and the only
place a code is entered. It is a static export, so the code arrives as a query
parameter and never as a path segment.

**It is a reading page with the commerce taken out, not a bare question box.**
The querent is the one person who never chose the reading they are holding, so
the name, the artwork and what arrives are exactly what they most need. What
goes is everything that sells: no price, no wallet row, no checkout button, no
Gift a Reading.
_Avoid_: redemption form, gift page, claim page, unlock page

**Recipient**:
Who a gift was addressed to when it was bought — an email typed by somebody
else, unverified and unaccounted-for. **Not yet a querent** and possibly never
one: the gift may be forwarded, or never opened at all.
_Avoid_: giftee, receiver, querent (before redemption there is nobody to be one)

**Gift signature**:
The name the recipient is told the gift is from, and the only reason the buyer
is asked for one. It is **not the buyer's name**: an order may legitimately have
none since #52, a wallet supplies an address rather than a billing contact, and
"Mum" is a truer answer here than whatever is on the card.

**Not "sender".** `App\Enums\Sender` is already the identity a mail leaves
from, in the repository that would send this one.
_Avoid_: sender, sender name, purchaser name, from name, buyer name

### After the money

**Confirmation**:
The screen that tells a customer what happened to their payment, rendered from
the payment rather than from an order. It reports what our backend says about
the payment, ~~never what we hope it has since done~~ — and on **one** of its
seven states it also promises the reading itself.

That exception is the client's, made knowingly on #51 (30 August 2026) and not
the code's to make or to take back: the `received` screen says the reading is on
its way and names it, from the product key the checkout left in the tab. **The
other six still may not.** Four of them say no money was taken, and a screen
that hedges about a payment while promising a reading is worse than either
half. `scripts/check-confirmation.mjs` holds the line, one run per state.

**Both roads land here and they do not paint the same way.** The hosted page's
`success_url` is reached only after Stripe has taken the payment, so that road
says so at once and verifies behind it. The wallet's `return_url` is reached
**whatever happened**, so that road asks before it says anything — a green tick
shown to somebody who was never charged is the one thing this screen may never
produce.
_Avoid_: success page, thank you page, receipt

**Receipt**:
The email the backend sends when an order settles. Not a page and not ours.
_Avoid_: confirmation email — **in this vocabulary and in the code, not in what
a customer reads**. The confirmation screen says "A confirmation email is on its
way" because that is the client's line and the words a buyer knows the mail by;
nothing that names the thing in either repository moved. The two are allowed to
differ here in a way the rest of this file's entries are not, and stating that
is cheaper than the next person renaming one to match the other.

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
