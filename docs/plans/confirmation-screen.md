# The confirmation screen

`/checkout/complete/` — where every payment path lands, and the return address a
card's 3D Secure challenge is given. Ticket: #36.

## What it is allowed to say

It reports a **payment**. It never reports a **fulfilment**.

Only the backend **settles** an order, on a verified Stripe webhook, and that
has quite possibly not happened while this screen is on a customer's monitor.
"Your reading is on its way" would be a promise made by the one part of the
system that cannot know whether it is true. The **receipt** is the mail that
says that, and the backend sends it. `check:confirmation` asserts the absence of
that claim in every state, because it is the easiest sentence to add by accident
and the only one that is never recoverable.

## Where it reads from

There is no endpoint that reads an **order** back, and this deliberately does
not ask for one. The screen retrieves the PaymentIntent from Stripe with the
publishable key alone.

Two arrival paths, one screen:

| Path | What it arrives with |
| --- | --- |
| Redirect return (3D Secure, any method that leaves the page) | `payment_intent` and `payment_intent_client_secret`, put in the query string by Stripe |
| In-place wallet payment | Nothing in the address — only the record in `sessionStorage` |

The URL wins where both exist: it is the payment the browser has just come back
from.

## The record

`lib/checkout-session.ts`. One `sessionStorage` entry holding the **pay token**,
the **Money**, and the PaymentIntent's client secret. Written by the payment
panel before it confirms (#38); read here.

- **The pay token is in the record and never in a URL.** It is the whole
  authority to pay an order. An address bar is history, a referrer and a
  shareable string; storage is none of those. It is not encryption, and it is
  not claimed to be.
- **The intent id is derived from the secret**, not stored beside it, so the two
  cannot disagree. It is the part before `_secret`.
- **The record is not erased when the screen renders.** It dies with the tab.
  Erasing on render would mean a reload landing on a page with nothing to say,
  which is one of the acceptance criteria inverted.

## The stale-result guard

A second purchase in the same tab overwrites the record, so a session-only
arrival is always the newest payment — the first purchase's result is
unreachable, which is what the ticket asks for.

The other direction is the back button: the URL names purchase one while the
record holds purchase two. The intent ids disagree, so the record is discarded
whole rather than mixed in, and everything shown comes from the intent the
address names. A restated amount from the wrong purchase is worse than no amount
at all.

In practice the amount comes off the retrieved intent itself, which cannot be
the wrong purchase's money. The record's `money` is the guarded fallback.

## Statuses

`lib/payment-outcome.ts` is the only place a Stripe status string is read. Four
outcomes, seven-plus statuses, and an unrecognised one renders as `unfinished`
rather than throwing — a customer whose payment is probably fine must not meet a
blank page because Stripe added a state.

`canceled` is grouped with `requires_payment_method`. Both mean no money moved
and the order is still pending; distinguishing them explains Stripe's state
machine to somebody who only wants to know whether they have been charged.

## Reached with nothing

The realistic cause is not a mistyped address. It is a payment panel treating
`nothing_to_pay` as "done" — which a `manual` `PAYMENT_METHOD` answers for a
perfectly unpaid pending order, as staging did before `PAYMENT_METHOD=stripe`
was set. So the honest message must not read as a confirmation: it says we
cannot show the payment, points at the receipt as the record that counts, and
claims nothing.

## Checking it

`npm run build && npm run check:confirmation` drives the exported bundle through
all seven states in a real browser, intercepting Stripe's retrieval endpoint.
Every state is also reloaded and compared, and every URL the browser touches is
searched for the pay token.

`node --test` covers the record's validation and the status mapping.
