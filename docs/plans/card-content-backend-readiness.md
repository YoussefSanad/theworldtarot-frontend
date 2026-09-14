# The card reference page and the backend

Assessment, 14 September 2026, written against the code on
`major-arcana-reference-page` as built. It answers one question that gets asked
in a short form — *"is the reference page ready to be wired to the backend so
card info comes from one file?"* — and the short form hides two different
questions with two different answers.

This continues [`major-arcana-card-page.md`](./major-arcana-card-page.md), which
built the template, and follows the shape of
[`products-api-wiring.md`](./products-api-wiring.md), which is the only other
place a page of this site meets the API.

## The two questions

| Asked | Answer |
|---|---|
| Can one file drive all twenty-two cards? | **Yes, today. That is already the design.** |
| Can that file be replaced by an API response? | **No, and not for a while.** Three blockers below. |

The first is done and needs nothing. The rest of this document is about the
second, because the gap is deliberate and somebody will otherwise close it by
accident.

## What is already content-driven

`CardReferencePage` reads nothing. It takes `card` and `content` as props and
every section — essay, appears panel, look-for, spheres, shadow, meta strip,
closing line — renders from the `MajorArcanaContent` it is handed. There is no
card-specific branch anywhere in `src/components/library/card/`.

The seam is the one `if` in `src/app/(site)/library/[card]/page.tsx`:

```ts
if (!card.content) return <ComingSoonPage ... />;
return <CardReferencePage card={card} content={card.content} />;
```

So adding The Magician is one object in `src/content/card-content.ts` and one
`content:` key in `src/content/library.ts`. No component changes. The type helps
here rather than merely describing: `appears` is a four-tuple, so a card whose
copy arrives with three or five columns fails `tsc` instead of silently
breaking the grid it is drawn into.

**This is what "one file" means and it exists.** `card-content.ts` is that file.

## Why it is not wired to the API

### 1. There is no endpoint carrying this shape

`API_CONTRACT.md` section 2, `GET /api/v1/{locale}/cards`, returns six fields:

```json
{ "id": 1, "number": 0, "name": "The Fool",
  "short_description": "A beginning.",
  "long_description": "The longer meaning of the card.",
  "image": "https://…", "in_viewing_room": true }
```

`MajorArcanaContent` needs roughly thirty: `keywords`, `subtitle`, three essay
paragraphs, four `appears` columns of icon + label + body, two `lookFor` lines,
three named spheres, three `shadow` lines, five `meta` entries of symbol +
value, the two-part `closing`, and `metaDescription`.

`long_description` is one string. It cannot carry any of that structure, and
the mismatch is not a rename — it is a schema that does not exist yet.

### 2. The content embeds build-time assets, not strings

This is the real cost and the least obvious one.

```ts
icon: cardReference.appearsIcon1,
element: { symbol: cardReference.symbolAir, value: "air" },
```

Those are `ImageAsset` objects imported from `src/lib/assets.ts`, carrying
intrinsic width and height because `next/image` requires them. **A JSON payload
cannot produce one.** Any API version of this content sends `"air"` and
`"uranus"` as keys and the frontend maps key → local asset.

That indirection is the one change that makes a future swap cheap, and it can
be made now, independently, while the content still lives here. Nothing else in
the shape is un-serialisable.

### 3. The assets on disk are The Fool's, not a shared set

`public/figma/card-reference/` holds five symbols — air, uranus, aquarius, key,
compass — and four `appears` icons. They are The Fool's. The Magician needs
mercury and fire; every card needs its own five.

**Whether this is a lookup table or an upload backlog is an open question for
the client**, and it is cheap to ask and expensive to assume. If her glyphs come
from a pool — four elements, ten planets, twelve signs, a handful of keywords —
the mapping in blocker 2 covers all twenty-two and roughly a dozen new files
close it. If she has drawn bespoke icons per card, it is closer to twenty-two
times nine.

## The contract question this work answers

`API_CONTRACT.md` section 10 item 6 is still open and reads:

> **Whether a card ever needs an address of its own.** Cards are identified by
> number today, on the assumption that the Library opens them in a pop-up. If
> any card is ever linkable, shareable or indexed on its own URL, adding a
> readable identifier is cheap now and awkward once you have built against ids.

**This branch answers it: yes.** There are twenty-two indexed SEO URLs of the
form `/library/the-fool-tarot-card-meaning/`, statically exported, each with its
own `<title>` and meta description. The pop-up assumption the contract is
written on no longer holds for the Major Arcana.

The backend team should be told, because the answer has a deadline attached in
their own words — cheap now, awkward later. Nothing breaks today: `slug` is the
frontend's own and never crosses the wire.

## The recommendation

**Keep `card-content.ts` as the source and fill in the other twenty-one as the
client's copy lands.** Do not wire this page to the API yet.

The reasoning is not inertia. These pages are statically exported and exist to
be indexed — build-time content is the correct architecture for them, not a
stopgap. `src/lib/api.ts` opens by stating that nothing in it may be fetched at
build time, for reasons that hold here. Moving to a runtime fetch would trade
SEO away and buy nothing until a CMS exists to put something behind it.

Compare the products seam, which went the other way and was right to: prices and
names change, four tiles render above the fold, and `home.ts` kept the entries
as a fallback. Card meanings do not change, and there is no endpoint to fall
back from.

### If you want the swap to be cheap later

One change, worth making on its own schedule:

- Replace `icon: ImageAsset` and `symbol: ImageAsset` in `card-content.ts` with
  string keys plus a resolver in `src/lib/assets.ts`. That is the only part of
  `MajorArcanaContent` a JSON API could never send, and doing it while the
  content is still local is a refactor with a compiler behind it rather than an
  integration with a network behind it.

Everything else — essay, spheres, shadow, meta values, closing — is already
plain strings and arrays, and would serialise unchanged.

## Status

- The template: **done**, and card-agnostic.
- The one-file mechanism: **done**, one card populated of twenty-two.
- The API seam: **not started, deliberately.** Blocked on an endpoint that does
  not exist, an asset indirection not yet built, and a client question not yet
  asked.
