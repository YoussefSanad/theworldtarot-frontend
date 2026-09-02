# Redemption is a page of its own, and it is a reading page with the commerce taken out

> **Decided 1 September 2026**, planning the gifting epic (#54). It supersedes
> the backend's `API_CONTRACT.md` section "Gift codes" of 25 August 2026, which
> said the recipient enters the code **as a payment method on that reading's
> page**. The storage half of the same reversal is that repository's
> `docs/adr/0004-a-reading-is-a-row-of-its-own.md`.
>
> Half of it is already taken. #62 removed the inert `Redeem A Gift Code` frame
> from the payment column on 31 August 2026, on the grounds that "redemption is
> becoming a page of its own". This records why, and what the page is.

## Why not the reading page

**The recipient does not know which reading they were given.** They have an
email. So the link has to resolve the code to a reading before it can choose a
page to land them on — and once something is resolving the code, landing them on
`/readings/three-card/` buys nothing that landing them on `/redeem/` does not.

**And that page would then have to suppress most of itself.** No price, no
wallet row, no checkout button, no `Gift a Reading` toggle, no question field in
the section that has one — a reading page's whole left panel and most of its
right. A page that hides half of itself in one mode is two pages sharing a file,
and `ReadingOrder`'s state would grow a third axis on top of `gifting` and
`offer`.

**`Gift a Reading` being a mode rather than a page is not the opposite of
this**, though it reads like it. That argument is about the **buying** side, and
it holds: a purchaser has already chosen a reading and is looking at it, so
moving them off the page would lose what they chose. A querent has chosen
nothing and is looking at an email. The two sides of a gift are genuinely
different situations and the same reasoning gives different answers to each.

## Why not the stripped-down page the client drew

The client's walkthrough puts the reading's name, a question box and a submit on
the page, and nothing else.

**The querent is the one person in this flow who never chose the reading they
are holding.** A paying customer arrives at a reading page having read what it
is, what it includes and what arrives; a recipient is handed the name of a thing
and asked to spend their question on it. Giving them strictly less context than
the person who chose it is the wrong way round.

So the page keeps the **presentation** half — the name, the artwork, the
description, what you receive — and swaps only the **commerce** half for the
code's state and the question. What goes is everything that sells.

## What this requires, and why now is when it is cheap

A reading page today is one composition. This needs a seam between what a
reading *is* and what it *costs* — enough that `/redeem/` can mount the first
without the second.

**One of the four reading pages exists.** `month-ahead` is built and
`three-card`, `one-card` and `in-depth` are not. Cutting that seam once, before
three more pages are written against the un-seamed shape, is the difference
between a refactor and a rewrite. This is the argument for doing it in this
epic rather than after it.

## The code arrives in a query string

This is a static export on Cloudflare, so `/redeem/{code}/` would need every
code pre-rendered at build time, which is not a thing codes can be. The page is
`/redeem/` and the code is a parameter, with manual entry on the same page for
somebody typing it off the email.

**Consequence, taken knowingly:** a query string is in browser history and can
leave in a `Referer`. That is acceptable for a **gift code** and would not be
for a **pay token**, and `CONTEXT.md` records why the two credentials are
handled differently rather than leaving the next reader to apply one rule to the
other.

## Two operations, not one

The page must resolve a code to a reading **without spending it**, or a visitor
who opens the link and closes the tab has lost their present. Looking up and
redeeming are separate calls, and only the second is atomic and single-use.

The lookup is an oracle for guessing, which is why the entropy lives in the code
itself. It cannot be closed by answering vaguely: "already redeemed" is a state
the real recipient has to be told about in plain words, so it cannot hide behind
the answer given to an unknown code.
