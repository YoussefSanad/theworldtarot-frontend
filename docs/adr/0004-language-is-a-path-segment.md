# Language is a path segment, English keeps `/`, and the switcher renders what was built and is live

> **Decided 1 September 2026**, refining #63. The shape is settled here and
> **nothing in this ADR is built** — #63 ships prices, currency and the
> `/languages` fetch, and the routing arrives with the translation ticket that
> needs it. This exists so that ticket inherits a decision rather than making
> one, and so `lib/locale.ts` stops being the only place the plan lives.

The backend addresses every language in the path, English included:
`/api/v1/en/products`, `/api/v1/es/products`. It never guesses, does not read
`Accept-Language`, and answers **404 rather than English** for a language that is
not public — `API_CONTRACT.md` section 3, whose reasoning is that a path segment
is an address rather than a hint, and answering English would put the same
content at as many URLs as anyone cared to invent.

## The site mirrors that, and does not become a preference

**`src/app/[locale]/(site)/…`, with `generateStaticParams`.** The alternative
considered and rejected was a client-side language preference on a single `/` —
cheaper by a large margin, and wrong in three ways that all point the same
direction. `<html lang>` would read `en` over Spanish copy. A crawler would find
one URL holding two languages, which is the outcome the backend restructured its
own routing to avoid. And there would be no address to link a Spanish reader to.

`lib/locale.ts` already argued this in a doc comment. This ADR is where it lives
now; that file keeps a pointer and loses the prose.

## English stays at `/`

`/` for English, `/es/` for Spanish, rather than `/en/` and `/es/`.

The consistent answer is `/en/`, and it is the one the API itself takes. It is
declined here for a reason that expires: **production is not stood up yet.**
Moving `/` to `/en/` today costs a rename; after launch it costs a redirect map,
a canonical pass, and whatever link equity does not survive the hop. Since the
routing is deferred (below), `/` is the only choice that keeps the deferral free
— every URL that exists today stays where it is, and adding `/es/` later is pure
addition rather than a migration.

**So the asymmetry is deliberate and it is the price of deferring.** If this is
ever revisited, revisit it before production has an audience, not after.

## The switcher renders the intersection of what was built and what is live

`API_CONTRACT.md` is explicit, and calls it the one requirement it cannot enforce
for us: **build the switcher from `GET /api/v1/languages`, never from a
hardcoded list.** A language can be taken down at any moment, effective on the
next request with no deploy on our side, and a hardcoded switcher then offers a
dead link with a 404 behind it.

A static export cannot obey that literally. `generateStaticParams` needs the
locale list at build time, which is a hardcoded list however it is spelled.

**What is obeyed instead is the thing the requirement protects.** The switcher
draws the intersection: a locale must be in the export *and* in the live
`/languages` answer. Taking Spanish down at the backend removes it from every
switcher on the next request, with no deploy — which is the whole property the
clause exists for. What the intersection cannot do is make a language appear
without a deploy, and that limit costs nothing: a language we have not built has
no copy to show.

## What is deferred, and what is not

**Deferred**: the `[locale]` segment, `generateStaticParams`, the per-locale copy
and every internal link that would gain a prefix. That refactor's only consumer
is the translation work, it touches every page, and it is testable only
alongside the copy it exists for.

**Not deferred, and shipping in #63**: the `/languages` fetch itself. It is what
makes the switcher appear the day somebody flips Spanish to `Live` in the panel,
and that property only exists if the call is in the export. With one live
language the language group renders nothing, per the contract's own advice — so
the fetch is correct and invisible, and `check:currency` is what proves it
against a stub.

## The gate this repository now owns

The backend takes a language down when anything appears on the site untranslated
— `config/translatable.php`, over `Product` and `Card`. **Static copy is not in
that set and will not be**, because it is entangled with layout: `content/home.ts`
pre-splits a tile's subtitle into two lines, which is not portable text.

So the two gates can disagree. Spanish can be `Live` — every product and card
translated — while our own catalogue is half written, and nothing on the
backend's side knows. **Whatever builds the deferred half needs its own
completeness check at build time**, or a language ships with English holes in it.
That is the cost of keeping the copy here, stated where the next person will find
it.
