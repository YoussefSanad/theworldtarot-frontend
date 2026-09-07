# SEO, and the copy a translator can actually work on

> **Written 5 September 2026.** Two pieces of work in one document because they
> share a seam and are otherwise independent: an **SEO baseline** for the site as
> it stands, and a **message catalogue** that lets somebody who is not a
> developer translate this site into Spanish.
>
> **The SEO half ships first and stands alone.** It is worth doing whether or not
> Spanish ever exists. The translation half is deliberately cut so that its
> deliverable is a teammate translating a file — **not** Spanish appearing on the
> site. Those are different finish lines and only the first is here.
>
> `docs/adr/0004-language-is-a-path-segment.md` is unamended by this document.
> Nothing below moves a URL.

Read these rather than re-deriving them. Nothing they carry is repeated here:

## Close-out — Phase 1

**Phase 1 is implemented and verified against a built export, 7 September 2026.**
Every route canonicalises to its own slashed URL; `robots.txt` carries five
disallow lines and names the sitemap; `sitemap.xml` holds six URLs and no
`xhtml:link`; JSON-LD is on four pages; `og:image` resolves absolutely; a lost
visitor lands on a styled 404. `npm test` passes 336. `check:measure` and
`check:images` show no geometry or asset regression.

**It is not committed.** Every change sits in the working tree, deliberately —
see *What deviated*, item 4.

What deviated from this document, and why:

1. **The test suite had never run.** `npm test` on Node 20 expands no glob and
   strips no types, so it found nothing, ran nothing, and **exited 0**. Twenty
   test files had never executed once. Node 22 is now pinned in `package.json`;
   all 316 tests that were already written passed the first time they ran. Every
   "**Done when:** `npm test` is green" in this repository's plan documents had
   been closing against an empty set.
2. **`/redeem/` is indexable**, contradicting an earlier draft of §1.2 which
   disallowed it. That page's own docblock argues the opposite and is right.
3. **`robots.ts` and `sitemap.ts` needed `export const dynamic = "force-static"`**,
   which this document did not anticipate. Under `output: "export"` Next refuses
   a metadata route that has not opted into static generation
   (`is-static-gen-enabled.js`). `AGENTS.md` warns about exactly this class of
   surprise.
4. **§0.1–0.3 were done and then reversed.** The `.env.local` correction, the
   `assertOwnRegistrableDomain` guard, the `next.config` collapse and their
   documentation were implemented, reviewed, and then backed out on 6 September
   at the repository owner's instruction: they are deployment work, and this
   document had bundled them into an SEO job on a premise that did not hold —
   §0.3 claimed Phase 1 would edit the config, and Phase 1 never touched it.
   **The bug §0.1 found is real and still unfixed**: `.env.local` had been
   pointing at the Laravel Cloud platform URL that ADR 0001 forbids, which loses
   the session cookies on every write while reads keep working. It is corrected
   locally and wants a deployment-side ticket of its own.
5. **§0.4–0.5 were never implemented**, and are superseded by §0.6 below.

Still owed: Phase 2, planned in
[`docs/plans/message-catalogue-implementation.md`](./message-catalogue-implementation.md).

---

| What | Where |
|---|---|
| Why language is a path segment, and why English keeps `/` | `docs/adr/0004-language-is-a-path-segment.md` |
| Why the API base must be under `theworldtarot.com` | `docs/adr/0001-one-registrable-domain.md` |
| What the backend translates, and what it does not | `API_CONTRACT.md` §§2, 3 |
| The content layer's existing split, and the CMS seam for products | `src/content/README.md` |
| The currency work this follows | `docs/plans/language-and-currency-selector.md` |

---

## What is settled, and by whom

Decided with the user on 4–5 September 2026. Recorded so the implementation
inherits decisions rather than making them.

- **English stays at `/`. Spanish, if it ever ships, is `/es/`.** ADR 0004 as
  written. Moving English to `/en/` was weighed again and declined; the priced
  cost is under **Rejected**.
- **Copy lives in JSON files in this repository, shipped with the deploy.**
  Strings move to `src/content/locales/{lang}/*.json`. Types, `href`s, image
  references, keys and **every doc comment** stay in the `.ts` files.
- **Line breaks stay encoded as arrays, one set per locale.** A translator
  chooses where Spanish breaks.
- **SEO first, then the catalogue.**

## The gate this document closes

ADR 0004 names a hole and does not fill it:

> The backend takes a language down when anything appears on the site
> untranslated […] **Static copy is not in that set and will not be** […] So the
> two gates can disagree. […] **Whatever builds the deferred half needs its own
> completeness check at build time**, or a language ships with English holes in
> it.

**`check:translations` (Phase 2, step 4) is that check.** It is the reason the
translation half is not simply "copy some files."

---

# Phase 0 — Housekeeping

Small, blocking, and none of it is speculative. Each item is a fault on `main`
today.

### 0.1 `.env.local` points at a host ADR 0001 forbids

```
NEXT_PUBLIC_API_BASE_URL=https://theworldtarot-staging-9naya2.laravel.cloud
```

That is the Laravel Cloud platform URL, which `DEPLOYMENT.md` names in as many
words as the wrong value. Cookies are issued for `.theworldtarot.com`, so from
this origin Safari discards them and every write is refused while reads keep
working — the silent failure ADR 0001 exists to prevent.
`assertDeployableApiBase` catches loopback only and its own docblock says it
cannot catch this.

`https://staging-api.theworldtarot.com` answers correctly; verified 4 September
2026 by hand against `/api/v1/en/products`.

**Done when:** `.env.local` names `staging-api.theworldtarot.com`, and the
inability of the guard to catch this class of value is raised as its own issue
rather than left in a comment.

### 0.2 Three superseded plans are untracked in the working tree

`docs/plans/locale-controls.md`, `locale-controls-implementation.md` and
`local-controls-reply.md`, all dated 30 August 2026 and **never committed**
(`git log --all` confirms). They design language as a browser preference with no
URL, and ADR 0004 reversed that on 3 September. A 1,925-line implementation plan
for a design that lost is the single most misleading thing in this repository.

**They are deleted** — the user's call, 4 September 2026. Because `git` cannot
restore an untracked file, the part worth keeping is lifted first: the priced
cost of the route move goes into ADR 0004's rejected-alternatives section, which
is where house style puts it and where the next person will look. It is
reproduced under **Rejected** below.

`local-controls-reply.md` note 3 told the backend *"we are not putting language
in our own URLs […] treat that as a decision"*, which ADR 0004 reversed four days
later. `API_CONTRACT.md` §3 still carries its original path-routing wording, so
either the note never travelled or it was not acted on — but notes 2 and 4 from
the same file clearly did travel, via `TheWorldTarot#66`. **Check #66 and correct
it if note 3 is there.** Unverified at the time of writing: the GitHub MCP server
would not connect.

**Done when:** the three files are gone, ADR 0004 carries the cost table, and #66
is either corrected or confirmed clean.

### 0.3 Two `next.config` files

`DEPLOYMENT.md` documents that Next resolves `.mjs` ahead of `.ts`, so *"a fix
applied only to the `.ts` silently does nothing."* Phase 1 edits config. Collapse
to one file **before** editing it, not after.

**Done when:** one config file remains, `npm run build` is unchanged, and
`DEPLOYMENT.md`'s paragraph about the pair is struck through with the date.

### 0.4 One bundled spelling per product

`7aeb5e6` made four surfaces render the API's product `name` via
`useReadingName`. Staging answers in **ALL CAPS**, and there is no
`text-transform` anywhere in `globals.css` — every uppercase string on this site
is uppercase because it was typed that way. So the API's casing lands literally.

| | `one-card` | `three-card` | `month-ahead` | `in-depth` |
|---|---|---|---|---|
| `home.ts` | `1 CARD READING` | `3 CARD READING` | `MONTH AHEAD` | — |
| `readings.ts` | `1 Card Reading` | `3 Card Reading` | `Month Ahead` + tail | `In-Depth` + tail |
| `reading-pages.ts` | — | `3 Card Reading` | `Month Ahead Reading` | `In-Depth Reading` |
| **API** | `1 CARD READING` | `3 CARD READING` | `MONTH AHEAD` | `IN DEPTH READING` |

Only `home.ts` matches. **This blocks Phase 2**: extracted as-is, a translator
writes three Spanish variants of one product name, and the divergence reappears
in every language added afterwards.

Which spelling wins per key follows from 0.5 below: where a surface keeps reading
the API, its bundled string is a fallback and must match the API character for
character; where a surface is bundled, the client's PSD casing is the answer.

**Done when:** each `productKey` has one bundled spelling per role, and
`src/content/README.md`'s "source of truth for what the backend seeds" paragraph
is either true again or struck through with the date.

### 0.5 Which surfaces read the API's product `name`

Three consequences of `7aeb5e6`, **decided by the user on 5 September 2026**:

1. **The reading-page `<h1>` keeps its bundled title** and stops reading the API.
   Left as shipped, `/readings/month-ahead/` flips from "Month Ahead Reading" to
   "MONTH AHEAD" in the display face at `text-h1` once the API answers. A price
   is a fact the backend owns; a page's headline is a typographic decision the
   client made in a PSD. It is also the most SEO-weighted element on the page,
   `<title>` disagrees with it, and the static export ships the bundled string to
   crawlers regardless.
2. **`titleTail`'s responsive behaviour is restored** — the tail returns to its
   `<span className="hidden lg:inline">`, per the comment it was removed against:
   *"the mobile card drops it so the title holds one line."*
3. **The nav keeps reading the API**, `productKey` and all, and so loses "1 CARD
   EXPERIENCE" in favour of "1 CARD READING". The wording is a content problem
   rather than a code one: the admin panel can rename the product.

**Decision 2 settles `ReadingCard` mechanically rather than by preference.** A
tail in its own conditionally-hidden span cannot be spliced out of a single
string returned by `useReadingName`, and gluing a bundled `" Reading"` onto an
API `"MONTH AHEAD"` yields "MONTH AHEAD Reading". So that card returns to bundled
copy for its title, and keeps `useReadingPrice` for its price.

`SignatureExperience` follows it, which is the one judgment call here rather than
an instruction: its tile is the same PSD typography as its three siblings, and
leaving it as the only card on the index whose casing flips would be an
inconsistency nobody asked for.

~~**The rule that falls out.** *Price is live everywhere; a name is live only
where the surface is the shop's own index* — with the nav dropdown and the
homepage tiles keeping the API's `name`, and `resolveReadingName` surviving with
one caller.~~

**Struck 6 September 2026, superseded by §0.6.** The split table this replaced
was correct under the assumption that the backend owns translated product copy.
It does not, for now. The whole of it collapses into one line below.

### 0.6 Translation is the frontend's, and that decides the merge

**Decided 6 September 2026, refined 7 September.** All translation is handled in
this repository until the backend's own translation work is finished.

**The backend will adapt to us, not the reverse.** They are not on a deadline
here and we do not wait on them for anything: the whole catalogue can be written,
reviewed and shipped against a backend that never sends a Spanish word. When they
later decide one endpoint or another is ready to serve translated content, taking
it back should be a small, obvious edit rather than an excavation.

**That is a constraint on where the decision is written down, not a seam to
build.** Two things carry it, and neither is an abstraction:

- **`apiLocale()` in `lib/locale.ts`** — one function, returning `DEFAULT_LOCALE`,
  with a docblock saying why. Every API read goes through it. The day their
  Spanish is real, that function is the edit.
- **An explicit field list in `resolveProducts`** — the merge names the fields it
  takes from the response rather than spreading whatever arrives, so putting
  `name` back is a two-line change somebody can find.

An earlier draft of this section said "permanent, no handback seam." **Withdrawn**:
permanence was never the point, and writing a decision into five files instead of
one costs nothing to avoid.

**What is not kept is a dormant function.** `resolveReadingName` is deleted rather
than left unused (§0.6, task list below). A dead resolver that silently starts
overwriting Spanish the day somebody calls it is worse than a two-line re-add.

**One rule: the API owns the price. This repository owns every word except card
copy.**

| Surface | `name` / copy | `price` |
|---|---|---|
| Homepage "Choose Your Journey" tiles | **here** | API |
| Nav dropdown rows | **here** | — |
| Readings-index cards, signature tile | **here** | API |
| Reading-page `<h1>` | **here** | API |
| Confirmation screen's reading noun | **here** | — |
| Living Tarot card name and number | **API** | — |

A price cannot be allowed to be stale — a figure nobody is charging is the
failure the **Money** discipline exists to prevent, and this repository has never
held a real one. Every other string a visitor reads is copy, and copy is now
ours.

**Cards are the one exception and it is visible.** They keep reading
`/api/v1/{locale}/cards`, and §0.7 pins that request to English, so a Spanish
visitor who reveals a card reads `XVII · The Star` in English under Spanish
chrome — `RevealTrigger.tsx:122`. Accepted knowingly: 21 of the 22 films do not
exist yet, so translating a card roster now is translating a guess.

### 0.7 The backend is asked in English, always

`lib/api.ts` already takes `locale` per call and defaults every one of them to
`DEFAULT_LOCALE`; nothing in the app passes anything else. **So the behaviour is
already right and what is missing is a name for it.**

It needs a name because the obvious future edit — wiring the display locale into
those calls once there is a second one — is the one that breaks it.
`/api/v1/es/products` answers **404, not English** (`API_CONTRACT.md` §3), and
`resolveProducts` treats an empty answer as bundled fallback, so the shop would
quietly show English fallback copy at bundled prices. Prices are the part that
matters: they would be stale strings rather than live money, which is the failure
the **Money** discipline exists to prevent.

**`apiLocale()` is that name.** It returns `DEFAULT_LOCALE` and every API read
defaults to it instead of to `DEFAULT_LOCALE` directly. Two things follow:

- **The decision becomes greppable.** "Which language do we ask the backend in"
  has one answer in one place, and it is not the same question as "which language
  is the visitor reading", which is `currentLocale()`. Today they return the same
  string, and conflating them is precisely the mistake that empties the shop.
- **Handback is per endpoint, not all-or-nothing.** When the backend says
  `/products` is translated but `/cards` is not, `apiLocale()` grows an argument
  naming the endpoint and answers differently for one of them. That is a change
  inside one function with one docblock, rather than a hunt through five call
  sites — which is the whole of §0.6's adaptability requirement.

### 0.8 The language switcher is not touched

`resolveLanguages` renders the intersection of `BUILT_LOCALES` and the live
`GET /api/v1/languages` answer, and that stays exactly as it is.

An earlier draft of this section proposed loosening it, on the reasoning that a
backend which never publishes `es` would keep the switcher invisible however
complete our Spanish was. **That was wrong and is withdrawn.** Because §0.7 pins
every content request to English, `/api/v1/es/*` is never called and its 404
never happens — so `es` appearing in `/languages` does exactly one thing, which
is populate the switcher. The contract's own requirement is obeyed unchanged, and
the property it exists for survives: the backend can still take Spanish down
instantly, with no deploy here.

**So the last step of shipping Spanish belongs to the backend**, and it is one
row: publish `es` in `/languages` when this repository says its copy is complete.
Three things to put to them, two already open in `YoussefSanad/TheWorldTarot#66`:

1. **Can you publish `es` past your own gate?** ADR 0004 records that a language
   is taken down when anything is untranslated, over `Product` and `Card` in
   `config/translatable.php`. If that check also gates publishing, `es` cannot go
   public while your product copy is untranslated — which is the premise of this
   whole plan. **Ask this before the catalogue work, not after**: a "no" is the
   one answer that forces a frontend change, and it is cheap to know early.
2. **`native_name`** (#66 ask 1, open). Until it ships the switcher reads
   "Spanish", not "Español". `languageRows` already does `native_name ?? label`,
   so it corrects itself the day the field arrives, with no edit here.
3. **We pin your locale segment to `en`** and will not ask you for `es` content.
   Not a request; a thing you should know so nobody reasons from our traffic.

**Done when:** one bundled spelling per `productKey`; `reading-pages.ts`'s
`in-depth` price reads `$120`, not `$125`, against the API's `12000`;
`resolveReadingName` and `useReadingName` are gone along with their five callers'
use of them; `resolveProducts` merges `price` and nothing else; and the three
questions above have been sent.

---

# Phase 1 — SEO baseline

Single-locale, standalone, and correct whether or not Phase 2 ever happens. Built
so that adding `/es/` later is addition rather than revision.

### 1.1 `metadataBase`, and one metadata builder

Everything else depends on this. `metadataBase` comes from an environment
variable so staging does not advertise production URLs.

**Metadata stops being nine hand-written objects and becomes one helper** —
`buildMetadata({ locale, path, title, description })` — returning canonical, Open
Graph, Twitter and `alternates`. The nine pages call it. Two reasons: the pages
are inconsistent today, and a locale-aware builder is the difference between
Spanish being a data change and a `<head>` rewrite.

### 1.2 `robots.ts` and `sitemap.ts`

Both are static file conventions and neither appears in the static-export
unsupported list (verified against `node_modules/next/dist/docs/`, 5 September
2026). `robots` disallows `/login/`, `/checkout/`, `/reset-password/`,
`/set-password/` and `/checkout-probe/` — the five routes that already carry
`robots: { index: false }` or should.

**`/redeem/` is indexable and belongs in the sitemap.** An earlier draft of this
document disallowed it, which was wrong: the page's own docblock argues the
opposite, and gives the reason — it duplicates no reading page, because a gift's
copy arrives from a lookup in the browser. *"A search result landing on 'enter
your gift code' is a page that works."*

So the sitemap carries six URLs: `/`, `/readings/`, `/readings/three-card/`,
`/readings/month-ahead/`, `/readings/in-depth/`, `/redeem/`.

**hreflang lives in the sitemap, not in `<head>`.** `sitemap.ts` supports
`alternates.languages` per entry. This is the better placement here because it
means **an English page's `<head>` never changes when Spanish ships** — the
reciprocity `hreflang` requires is satisfied in one file rather than across nine
pages.

### 1.3 Canonicals

`trailingSlash: true` and Cloudflare together make `/readings` and `/readings/`
both resolve. Each page canonicals to its slashed self.

### 1.4 Open Graph image

Composited from existing artwork with `sharp`, already a devDependency, and
written to `public/` by a script. Not `ImageResponse`: a static file is simpler
and this image does not vary.

**Highest visible value in this phase.** Every link the client shares to
WhatsApp, Instagram or Slack currently renders as a grey box, on a site whose
entire pitch is cinematic artwork.

### 1.5 `Product` / `Offer` JSON-LD

On the three reading pages, plus `Organization` on the homepage.

**The price in JSON-LD is the bundled USD figure and must stay that way.** It is
baked at build time; the visitor may be seeing EUR from the currency selector.
Writing this down because it reads like a bug and is not.

### 1.6 `<html lang>` reads `currentLocale()`

Hardcoded `"en"` in `app/layout.tsx` today, consulting nothing. A one-line fix,
and an SEO and accessibility signal.

### 1.7 `not-found.tsx`

The export ships a bare `404.html` that `wrangler.toml` points at — no header, no
footer, no way back.

### 1.8 `noindex` on `/checkout-probe/`

It has no metadata at all. `DEPLOYMENT.md` says a build carrying this route must
never reach production; belt and braces cost nothing.

**Phase 1 done when:** `npm run build` emits `robots.txt` and `sitemap.xml`; every
public route carries a canonical, OG and Twitter tags; the three reading pages
carry valid `Product`/`Offer` JSON-LD; `/checkout-probe/` is `noindex`; and a
bad URL lands on a styled 404.

---

# Phase 2 — The message catalogue

**Deliverable: a teammate opens `src/content/locales/es/home.json`, sees English
strings, overwrites them with Spanish, and is done.** No TypeScript, no JSX, no
build knowledge.

**Not in scope:** the `[locale]` route, `/es/` existing, the switcher going live.
Spanish is translated into a file that is not yet reachable. That is the intended
cut.

### The size of the job

Measured 5 September 2026, heuristically — a few entries will prove to be codes
rather than copy.

| | strings | words |
|---|---|---|
| `src/content/*.ts` | ~370 | ~2,220 |
| page `metadata` titles and descriptions | ~15 | ~140 |
| strings still inlined in components | 6 | ~15 |
| **total** | **~390** | **~2,400** |

A day or two of translation, not a project.

### 2.1 The six stragglers come into `content/`

`NewsletterForm`'s two placeholders, three `aria-label`s (`ScrollToTop`,
`SiteHeader`, `ConceptHeader`), and `RevealTrigger`'s default `label`. Left
inlined they are untranslatable holes.

### 2.2 Extract English to `locales/en/*.json`

One file per existing content module. **The `.ts` file keeps everything that is
not a string**: types, `href`s, image and icon references, `key`/`productKey`,
`questionLimit`, `rushDelivery.enabled`, and all doc comments. It imports the
JSON, merges, and exports the same objects it exports today.

**No component changes in this step** — 2.1 is where components are touched, and
it lands first and separately. That separation is the property that makes this
reviewable: the exported objects must be deep-equal to what they were.

`locales/en/*.json` is what the app reads. It is not a copy kept alongside the
real strings.

`resolveJsonModule` is already enabled in `tsconfig.json`, so this needs no
config change. Verified 5 September 2026.

### 2.3 Copy English to `locales/es/*.json`

Byte-identical. Typed as `typeof enHome` and so on, so the compiler refuses a
missing or misspelled **key**.

It will not refuse an **extra** key: excess-property checking does not apply to
a non-literal assignment, so a stray entry in `es.json` compiles. `check:translations`
covers that gap as well as the untranslated one.

### 2.4 `check:translations`

**The compiler cannot tell a translated value from an untranslated one** — a
copied English string is a valid string. With ~390 entries across nine files,
without this the teammate cannot see what is left and nobody can tell when they
are done.

The script diffs each locale against English and reports coverage with file and
key path:

```
es: 112 of 390 strings still identical to English
    home.json      hero.tagline
    home.json      hero.body
    …
```

Same shape as the existing `check:` scripts. This is the completeness gate ADR
0004 asks this repository to own.

### 2.5 `locales/README.md`

Two conventions are not guessable and the translator will otherwise get them
wrong:

- **An array is line breaks.** `["One Question. Three Cards.", "Your Path
  Illuminated."]` renders as two lines, and they are choosing where Spanish
  breaks — at a word count roughly 20–25% longer.
- **Some values are rarely seen.** Product names and prices are overwritten by
  `/products` at runtime. Those entries are the offline fallback only.

**Phase 2 done when:** `npm test` shows the exported content objects unchanged by
the extraction; `npm run check:translations` reports every one of the ~390 `es`
entries as still identical to English, and names them; and the README answers
both conventions above without a developer present.

That full count is the **expected** result at handoff, not a failure. The script
reports; it does not fail a build. Deciding when an incomplete locale should
break something is the routing ticket's problem, and there is no route to break.

---

## Rejected

| Considered | Why not |
|---|---|
| **English moves to `/en/`** | The consistent answer, and the one the API itself takes. Declined on cost, priced by `locale-controls.md` on 30 August 2026 and re-weighed 4 September: a route move across nine routes, a root-layout move, `generateStaticParams`, a `LocaleLink` across **48 `href`s in `src/content/`**, all **seven `check:` scripts**, a Cloudflare Worker for the `/` → `/en/` redirect, and **`/` answering 404 in `next dev` forever**. That last is not avoidable: `redirects`, `rewrites`, `headers` and Proxy are all listed as unsupported under `output: "export"`. Keeping `/` costs a "unless it's English" branch in the link and canonical helpers, and nothing else |
| **Language as a stored preference, no URL** | The 30 August design, reversed by ADR 0004. Its own cost statement is the argument against it: *"Non-English pages cannot be found in search. Ever, until this decision is reversed."* |
| **Translated slugs (`/es/lecturas/`)** | Real but small ranking gain, against a slug↔route map and a second set of paths to keep in step. `productKey` joins stay English regardless. Pure addition later if wanted |
| **`es/*.json` seeded with empty strings** | Makes untranslated entries obvious for free, and removes the need for `check:translations`. Declined because a translator needs the English in front of them, and an empty file is a worse handoff than a script |
| **Copy into a CMS** | Contradicts ADR 0004's reasoning that static copy stays in the repository because it is entangled with layout. The products seam already exists for the half the backend genuinely owns |
| **`ImageResponse` for the OG image** | Needs a runtime the export does not have a reason to involve, for an image that never varies |
| **Extracting copy and changing components in one pass** | The extraction's whole verification is that nothing changed. Mixing in component edits removes the only property that makes it reviewable |

## Known before starting

- **The dependencies are narrow.** 0.3 blocks Phase 1, because Phase 1 edits the
  config. 0.5 settles 0.4, and 0.4 blocks Phase 2 — extracting three spellings of
  one product name bakes the divergence into every language. 0.1 and 0.2 block
  nothing and should go first anyway, being a live fault and a live falsehood
  respectively. Phase 1 and Phase 2 do not block each other; they are sequenced
  by preference.
- **0.4 and 0.5 are the only part of this document that changes what is on
  screen.** Everything else in Phase 0 and all of Phase 2 is invariant by
  construction, and Phase 1 is `<head>` and a 404 page. Worth knowing when
  reviewing: a visual diff anywhere else is a bug.
- **`/languages` still answers one entry and still has no `native_name`** —
  verified 4 September 2026. Ask 1 of `TheWorldTarot#66` remains open. The
  language switcher is correctly invisible and stays so; nothing here changes it.
- **The GitHub MCP server would not connect** during this planning
  (`400: Authorization header is badly formatted`), so #66 and #69 were not read.
  Both are referenced above on the strength of repository documents alone.
- **`npm run check:panel` is the user's to run.** It is silent for about seven
  minutes. Nothing here needs it.
- **Branches are the user's.** Read HEAD and ask before committing.
