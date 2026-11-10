# Language is a path segment, English keeps `/`, and the switcher renders what was built and is live

> **SUPERSEDED on the path segment, 9 September 2026.** The translation work
> this ADR was written to hand a decision to went the other way: **language is a
> stored preference on a single `/`, and Spanish has no URL of its own.** There
> is no `[locale]` segment, no `generateStaticParams` over locales, and no
> `/es/`. `BUILT_LOCALES` in `src/lib/locale.ts` holds English alone, and that
> is now permanent rather than pending.
>
> **The three objections below are accepted, not answered**, which is the whole
> of the reversal. `<html lang>` does read `en` over Spanish copy in the served
> markup — `HtmlLang` corrects it after mount, so a crawler only ever sees the
> uncorrected version. A Spanish reader cannot be linked to. The trade is
> deliberate: **search is English-only by decision**, so the SEO half of the
> cost is one the business does not pay. `hreflang` and the sitemap are written
> from `BUILT_LOCALES` and so stay truthful — they emit nothing for a `/es/`
> that does not exist.
>
> **Everything else in this file survives**: the backend's 404-rather-than-
> English contract, the rule that the switcher renders the intersection of what
> was built and what `GET /api/v1/languages` answers, and the reasoning for
> both. `src/lib/languages.ts` implements the intersection with **one change to
> its built half**: a language must be in `OFFERED_LOCALES`, whose copy ships in
> the bundle, rather than in `BUILT_LOCALES`, which has a route — no language
> but English has a route, so the old half would draw no switcher at all. The
> rule is load bearing — `apiLocale()` follows the display language as of the
> same date, so an offer the endpoint did not make would be a 404 a visitor can
> click on.
>
> Read the rest as the case for an address, which is still the better shape and
> is what to reopen if search ever needs to reach Spanish. **Do not build the
> `[locale]` segment from it** without reopening the decision; the README's
> language section and `src/lib/locale.ts` describe what actually shipped.

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

## What `/en/` would have cost, priced

**Recorded 5 September 2026**, when this decision was revisited before launch as
the section above asks, and confirmed unchanged. The price is kept here because
the document that established it — `docs/plans/locale-controls.md`, never
committed — was deleted the same day, and the number is the whole argument.

Moving English from `/` to `/en/`: a route move across nine routes, a root-layout
move, `generateStaticParams`, a `LocaleLink` applied across **48 `href`s in
`src/content/`**, all **seven `check:` scripts**, a Cloudflare Worker for the
`/` → `/en/` redirect, and **`/` answering 404 in `next dev` forever**.

That last is not a matter of effort. `redirects`, `rewrites`, `headers` and Proxy
are all listed as unsupported under `output: "export"` — verified against
`node_modules/next/dist/docs/01-app/02-guides/static-exports.md` on 5 September
2026 — so nothing can send `/` to `/en/` locally, and the Worker only fixes it in
production.

Keeping `/` costs one thing: an "unless it is the default locale" branch in the
link and canonical helpers. `src/lib/seo.ts` is where that branch lives.

The three documents deleted alongside this note — `locale-controls.md`,
`locale-controls-implementation.md` and `local-controls-reply.md`, all dated
30 August 2026 and never committed — argued the opposite decision: language as a
stored browser preference with no URL at all, accepting that *"non-English pages
cannot be found in search, ever."* This ADR reversed that on 3 September. They
were deleted because a 1,925-line implementation plan for a design that lost,
sitting untracked and undated in `docs/plans/`, reads as current to everyone who
finds it.
