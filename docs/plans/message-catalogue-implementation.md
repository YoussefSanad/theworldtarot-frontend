# Message Catalogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teammate opens `src/content/locales/es/home.json`, sees English strings, overwrites them with Spanish, and is done — no TypeScript, no JSX, no build knowledge.

**Architecture:** Structure stays in TypeScript; strings move to JSON. Each `src/content/*.ts` module keeps its types, `href`s, image references, keys and every doc comment, imports its strings from `locales/{lang}/*.json`, merges, and exports the same objects it exports today. Spanish is typed as `typeof` its English counterpart, so the compiler refuses a missing key; a script reports which values are still English, because the compiler cannot.

**Tech Stack:** TypeScript with `resolveJsonModule` (already enabled), `node --test` on Node 22, Next 16 App Router, static export.

**Spec:** [`docs/plans/seo-and-translations.md`](./seo-and-translations.md) — §§0.4–0.8 and Phase 2. Read it before Task 1; this plan argues from it and does not repeat its reasoning.

**Not in this plan:** the `[locale]` route segment, `/es/` existing as a URL, the switcher going live, first-visit language detection. Spanish is translated into files that are not yet reachable. That is the intended cut — routing is a third plan, and the spec's §0.8 records that the last step belongs to the backend.

## Global Constraints

- **This plan contains no git operations.** Do not commit, branch, stage, push, or rebase. Leave every change in the working tree; the repository owner decides what becomes a commit and when.
- **Node is pinned to 22 via Volta** in `package.json`. On Node 20 the test suite silently runs zero tests and exits 0.
- **`src/lib/*.ts` may import `@/…` only as `import type`.** `node --test` does not resolve the `@/` alias; a value import through it breaks the suite. Value imports inside `src/lib/` are relative and carry the `.ts` extension. `src/content/`, `src/app/` and `src/components/` are not unit-tested and may use `@/` freely.
- **Tests are `node:test` + `node:assert/strict`**, beside the code as `*.test.ts`, importing with explicit `.ts` extensions. Test names are sentences in the repo's voice, not `should_do_x`.
- **`npm test` passes 336 before this plan starts.** Every task states its expected new total.
- **All builds carry `ALLOW_LOCAL_API_BUILD=1`** — `.env.local` has no Stripe publishable key.
- **House style is argument, not summary.** Doc comments state costs and name rejected alternatives. Terse bullet-point comments read as foreign here.
- **Bash heredocs in this environment corrupt em dashes** (U+2014 becomes a plain hyphen). Prefer the Write/Edit tools for prose; verify with `cat -A`, looking for `M-bM-^@M-^T`.
- **The API owns the price and nothing else a visitor reads, except card copy.** Spec §0.6.

## File Structure

| File | Responsibility |
|---|---|
| `src/content/locales/en/*.json` | **New, 9 files.** Every English string the site renders. What the app actually reads — not a copy kept beside the real thing |
| `src/content/locales/es/*.json` | **New, 9 files.** Byte-identical to English at handover; the teammate's workspace |
| `src/content/locales/README.md` | **New.** The two conventions a translator cannot guess |
| `src/content/*.ts` (9 files) | **Modified.** Keep types, `href`s, assets, keys, doc comments. Import strings, merge, export the same shapes |
| `src/lib/copy.ts` | **New.** `activeLocale()` and the typed loader both content modules and the checker use |
| `src/lib/copy.test.ts` | **New.** |
| `scripts/check-translations.mjs` | **New.** Reports which values are still English |
| `package.json` | **Modified.** One script: `check:translations` |
| `src/lib/products.ts` | **Modified.** `resolveProducts` merges `price` only |
| `src/lib/reading-prices.ts` | **Modified.** `resolveReadingName` / `useReadingName` deleted |
| 5 component files | **Modified.** Stop calling `useReadingName` / `resolveReadingName` |
| `src/content/site.ts` | **Modified.** Nav rows drop `productKey` |
| `src/lib/api.ts` | **Modified.** Docblock only — the English pin, §0.7 |

**Task order is deliberate.** Tasks 1–3 change what renders and are the risky half; Tasks 4–8 are mechanical extraction whose whole verification is that nothing changed. Doing the risky half first means the extraction's "nothing moved" property is true against a stable baseline.

---

### Task 1: One bundled spelling per product

**Files:**
- Modify: `src/content/home.ts`, `src/content/readings.ts`, `src/content/reading-pages.ts`
- Modify: `src/content/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: one canonical bundled string per `productKey`, which Tasks 2 and 3 rely on being unambiguous.

Three files carry three different spellings of the same product, all acting as fallback for one API string. Extracted as-is in Task 5, a translator writes three Spanish variants of one name and the divergence reappears in every language after.

Current state, with staging's answers confirmed 4 September 2026:

| | `one-card` | `three-card` | `month-ahead` | `in-depth` |
|---|---|---|---|---|
| `home.ts` | `1 CARD READING` | `3 CARD READING` | `MONTH AHEAD` | *(no tile)* |
| `readings.ts` | `1 Card Reading` | `3 Card Reading` | `Month Ahead` + tail | `In-Depth` + tail |
| `reading-pages.ts` | — | `3 Card Reading` | `Month Ahead Reading` | `In-Depth Reading` |
| API | `1 CARD READING` | `3 CARD READING` | `MONTH AHEAD` | `IN DEPTH READING` |

- [ ] **Step 1: Decide nothing; record what each surface renders**

Read all three files and write down, per `productKey`, the exact string each renders today **before the API answers**. That is what a visitor sees on a cold load and in the static export, and it is the string being kept.

**The API's casing is not the target.** Spec §0.6 makes this repository the owner of product copy, so the API's `ALL CAPS` answers stop being consulted in Task 2. Each surface keeps the casing the client's PSD gave it: uppercase on the homepage tiles, title case on the readings index and the reading pages.

- [ ] **Step 2: Make the three files agree per key, per surface role**

The rule is one spelling **per key per role**, not one spelling globally — a tile label and a page heading are different typographic objects and always were:

- `home.ts` tiles keep uppercase (`1 CARD READING`, `3 CARD READING`, `MONTH AHEAD`).
- `readings.ts` and `reading-pages.ts` agree with each other in title case for the same key. Today `readings.ts` says `Month Ahead` + `titleTail: " Reading"` while `reading-pages.ts` says `Month Ahead Reading`; those already compose to the same words, so the fix is to confirm it for all four keys rather than to change text.
- Correct `reading-pages.ts`'s `inDepth.price` from `"$125"` to `"$120"`. `readings.ts` already reads `$120` and the API answers `12000`.

**Change no wording.** If two surfaces disagree on words rather than casing, stop and report it rather than picking one — that is the client's copy, not ours.

- [ ] **Step 3: Correct `src/content/README.md`**

It claims the bundled copy is "the source of truth for what the backend seeds… verified character for character". Under spec §0.6 that relationship inverts: the backend's copy is no longer read at all. Replace the "A CMS later has started, for products" section's claim with a dated strikethrough naming §0.6, and state the new rule — the API supplies the price; every word comes from here.

- [ ] **Step 4: Verify nothing moved**

```bash
npx tsc --noEmit && npm test
```

Expected: clean, and **336** tests still passing. This task changes strings, not structure.

---

### Task 2: `resolveProducts` merges the price and nothing else

**Files:**
- Modify: `src/lib/products.ts:59-95`
- Modify: `src/lib/products.test.ts`

**Interfaces:**
- Consumes: Task 1's canonical bundled strings.
- Produces: `resolveProducts(live, bundled)` returning bundled `title`/`subtitle` with a live `price`.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/products.test.ts`, matching whatever fixture helper that file already defines — read it first and reuse it rather than inventing a second one:

```ts
test("a live answer prices a tile and leaves its words alone", () => {
  const [tile] = resolveProducts(
    [priced("one-card", "USD", 1000, "SOMETHING ELSE ENTIRELY", "and another subtitle")],
    [bundledTile("one-card", "1 CARD READING", "A Single Message from the Tarot", "$12")],
  );

  assert.equal(tile.title, "1 CARD READING");
  assert.equal(tile.subtitle, "A Single Message from the Tarot");
  assert.equal(tile.price, "$10");
});

test("the words are ours in every language, which is why the API's copy is not read", () => {
  const [tile] = resolveProducts(
    [priced("three-card", "EUR", 2000, "TRES CARTAS", "una pregunta")],
    [bundledTile("three-card", "3 CARD READING", "One Question, Three Cards", "$52")],
  );

  assert.equal(tile.title, "3 CARD READING");
  assert.equal(tile.subtitle, "One Question, Three Cards");
  assert.equal(tile.price, "€20");
});
```

If `products.test.ts` has no `priced`/`bundledTile` helpers under those names, write the two tests using the helpers it does have. **Do not rename existing helpers.**

- [ ] **Step 2: Run and watch them fail**

```bash
npm test -- --test-name-pattern="leaves its words alone"
```

Expected: FAIL — `tile.title` is `"SOMETHING ELSE ENTIRELY"`.

- [ ] **Step 3: Drop the two copy fields from the merge**

In `resolveProducts`, the returned object becomes:

```ts
    return [
      {
        ...tile,
        price: formatPrice(match.price),
      },
    ];
```

`title` and `subtitle` go. **Everything else in the function stays** — the `byKey` map, the bundled-driven `flatMap`, the `!match` branch with its `console.warn` and `HIDE_WITHDRAWN`. None of that is about copy: it decides whether a product is still *sold*, which is still the backend's to say.

**Name the fields taken from the response; do not spread it.** Spec §0.6 requires that handing a field back to the backend later is a small, findable edit rather than an excavation, and one merge that names `price` explicitly is what makes `name` a two-line re-add. Concretely: keep `price: formatPrice(match.price)` written out, and do not replace the merge with `...match` or a helper that copies whatever arrives.

Replace the docblock's description of what is merged with the §0.6 rule, in house style — the API owns the price, this repository owns the words, translation lives here until the backend's own is finished, and this is reversible per field. Name what it costs: **a product renamed in the admin panel no longer changes the site**, and somebody has to tell whoever uses that panel. Prices there keep working.

- [ ] **Step 4: Run and watch them pass**

```bash
npm test
```

Expected: **338** passing, 0 failing. If an existing `products.test.ts` case asserted that live copy replaces bundled copy, it is now asserting the old rule — update it to the new one and say so in your report. Do not delete it.

---

### Task 3: `resolveReadingName` goes, and its five callers with it

**Files:**
- Modify: `src/lib/reading-prices.ts` — delete `resolveReadingName` and `useReadingName`
- Modify: `src/lib/reading-prices.test.ts`
- Modify: `src/components/layout/NavDropdown.tsx`, `src/components/reading/ReadingHero.tsx`, `src/components/readings/ReadingCard.tsx`, `src/components/readings/SignatureExperience.tsx`, `src/components/checkout/CheckoutComplete.tsx`
- Modify: `src/content/site.ts`

**Interfaces:**
- Consumes: Task 1's canonical bundled strings.
- Produces: `reading-prices.ts` exporting only `resolveReadingPrice` and `useReadingPrice`.

`resolveReadingName` was added on 4 September 2026 to read the API's product `name`. Under §0.6 there is no such source, so the function has no purpose. **Deleted, not left with one caller** — a dead seam invites somebody to wire it back up.

- [ ] **Step 1: Restore `titleTail`'s responsive behaviour in `ReadingCard`**

This is a bug fix that only becomes possible now. `ReadingCard` used to render:

```tsx
          {reading.title}
          {/* Added back at `lg`; the mobile card drops it so the title holds one line. */}
          {reading.titleTail ? <span className="hidden lg:inline">{reading.titleTail}</span> : null}
```

It was replaced by `useReadingName(reading.productKey, \`${reading.title}${reading.titleTail ?? ""}\`)`, which folds the tail into one string and loses the phone-width behaviour the comment describes. Restore the two lines above verbatim, including the comment, and delete the `fullTitle` local.

- [ ] **Step 2: Revert the other four callers to their bundled strings**

- `ReadingHero.tsx:38` — `const title = useReadingName(reading.productKey, reading.title);` becomes a direct use of `reading.title`; drop the local if it now only aliases.
- `SignatureExperience.tsx:50` — same shape, using `signature.title`. Its `aria-label` interpolates the same value; keep them agreeing.
- `NavDropdown.tsx` — `NavGroupLinkLabel` becomes `return link.label;`. **Once it calls no hook it is no longer a component that needs to exist**: inline `{link.label}` at both call sites (`NavDropdownLink`, and the drawer in `SiteHeader.tsx`) and delete `NavGroupLinkLabel` and its export. Its own docblock says it exists only so the two surfaces ask once rather than twice — there is nothing left to ask.
- `CheckoutComplete.tsx:628` — the wrapper around `resolveReadingName` returns the bundled noun. Read the docblock at line 263 before editing; it explains what the confirmation screen calls a reading and why, and that argument still holds under the new source.

- [ ] **Step 3: Nav rows drop `productKey`**

In `src/content/site.ts`, remove `productKey` from the four `primaryNav` dropdown rows and delete the field from the `NavGroupLink` type, leaving `export type NavGroupLink = NavLink`. Consider whether the type still earns a name of its own or should collapse to `NavLink`; if it collapses, follow it through `NavGroup`.

**"1 CARD EXPERIENCE" comes back** as a side effect, and that is the intended outcome rather than a coincidence. The row was deliberately worded to name the interactive AI experience rather than the written reading, and reading the API's `name` overwrote it with "1 CARD READING". Update the type's docblock, which currently explains `productKey` as "asked for a name instead" — that sentence describes a mechanism that no longer exists.

- [ ] **Step 4: Delete the functions and their tests**

Remove `resolveReadingName` and `useReadingName` from `src/lib/reading-prices.ts`, and their cases from `reading-prices.test.ts`. Leave `resolveReadingPrice` and `useReadingPrice` untouched — prices are still the backend's.

Add a short note in the file's docblock recording that a name resolver lived here between 4 and 6 September 2026 and why it went, so the next person does not re-derive it. House style: name the reversed decision and its date.

- [ ] **Step 5: `apiLocale()` — one name for "which language do we ask the backend in"**

**Files:** modify `src/lib/locale.ts`, `src/lib/locale.test.ts` (create if absent), `src/lib/api.ts`.

Every read in `api.ts` already defaults its `locale` parameter to `DEFAULT_LOCALE`, and nothing overrides it — so the behaviour is right and only the *name* is missing. Spec §0.7 explains why the name earns its keep; the short version is that "which language does the visitor read" and "which language do we ask the backend in" are different questions that happen to share an answer today, and conflating them is what empties the shop.

Add to `src/lib/locale.ts`:

```ts
/**
 * The language the **backend** is asked in, which is not the language the
 * visitor is reading. `currentLocale()` answers that one.
 *
 * **English, always, and deliberately.** Static copy is translated in this
 * repository (`src/content/locales/`), and the backend's own translation work is
 * unfinished — `/api/v1/es/products` answers **404, not English**
 * (`API_CONTRACT.md` §3). So asking in the visitor's language would empty the
 * catalogue rather than translate it: `resolveProducts` reads an empty answer as
 * a fallback to bundled copy, and the page would quietly show bundled **price
 * strings** where live money belongs.
 *
 * **This is the line that changes when the backend is ready**, and it changes per
 * endpoint rather than all at once — when `/products` is translated and `/cards`
 * is not, this grows an argument naming the endpoint and answers differently for
 * one of them. See `docs/plans/seo-and-translations.md` §§0.6–0.7.
 */
export function apiLocale(): Locale {
  return DEFAULT_LOCALE;
}
```

Then change every `locale = DEFAULT_LOCALE` default in `src/lib/api.ts` to `locale = apiLocale()` — there are four (`fetchCardDraw`, `fetchCard`, `fetchProducts`, `fetchProduct`; confirm against the file rather than trusting this count). Import `apiLocale` alongside the existing `DEFAULT_LOCALE` import, and drop `DEFAULT_LOCALE` from that import if nothing else in the file uses it.

Add a test:

```ts
test("the backend is asked in English however the site is being read", () => {
  assert.equal(apiLocale(), DEFAULT_LOCALE);
});
```

**Do not wire `currentLocale()` into `api.ts`.** That is the change this function exists to make visible, and it is not this plan's to make.

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit && npm test && ALLOW_LOCAL_API_BUILD=1 npm run build
```

Expected: clean; **336** passing (338 from Task 2, minus the three `resolveReadingName` cases, plus the one above); build completes.

- [ ] **Step 7: Report what a visitor sees differently**

This is the one task in the plan that changes the rendered page. List, for the report: the nav dropdown row that returns to "1 CARD EXPERIENCE"; the reading-page `<h1>`s that no longer flip to `ALL CAPS` when the API answers; the readings-index card titles likewise; and the mobile card whose title tail is dropped again at phone widths. **These need the repository owner's eyes** — do not start a dev server or drive a browser yourself.

---

### Task 4: `src/lib/copy.ts` — the loader every content module uses

**Files:**
- Create: `src/lib/copy.ts`
- Create: `src/lib/copy.test.ts`

**Interfaces:**
- Consumes: `BUILT_LOCALES`, `DEFAULT_LOCALE`, `type Locale` from `./locale.ts`.
- Produces:
  - `type Copy<T> = { [K in keyof T]: T[K] }`
  - `pickCopy<T>(en: T, byLocale: Partial<Record<Locale, T>>, locale: Locale): T`

- [ ] **Step 1: Write the failing test**

Create `src/lib/copy.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { pickCopy } from "./copy.ts";

const en = { heading: "Readings", lead: ["one line", "and another"] };
const es = { heading: "Lecturas", lead: ["una linea", "y otra"] };

test("the locale being read is the copy that comes back", () => {
  assert.deepEqual(pickCopy(en, { es }, "es"), es);
  assert.deepEqual(pickCopy(en, { es }, "en"), en);
});

test("a locale with no file falls back to English rather than rendering nothing", () => {
  assert.deepEqual(pickCopy(en, { es }, "fr"), en);
});

test("the fallback is the whole file, not a field-by-field merge", () => {
  const partial = { heading: "Lecturas" } as unknown as typeof en;

  assert.equal(pickCopy(en, { es: partial }, "es").lead, undefined);
});
```

- [ ] **Step 2: Run and watch it fail**

```bash
npm test -- --test-name-pattern="locale being read"
```

Expected: FAIL — `Cannot find module './copy.ts'`.

- [ ] **Step 3: Write `src/lib/copy.ts`**

```ts
import { DEFAULT_LOCALE, type Locale } from "./locale.ts";

/**
 * Which language's strings a content module hands back.
 *
 * **Pure, and the only shared machinery the catalogue needs.** Every
 * `src/content/*.ts` module imports its own JSON and calls this; there is no
 * registry, no dynamic import and no key lookup by string path. A missing file
 * is a compile error at the import, which is the earliest anything can catch it.
 *
 * `src/lib` may not value-import through the `@/` alias — `node --test` cannot
 * resolve it — which is why this lives here and takes its inputs as arguments
 * rather than reaching into `content/` itself.
 */

/**
 * The strings for one locale.
 *
 * **Whole-file fallback, never a field-by-field merge**, and the third test
 * pins it. A merge would let a half-written Spanish file render as Spanish
 * headings over English body copy — a page in two languages, which
 * `docs/plans/locale-controls.md` argued is worse than either language alone
 * before it was deleted. A file is translated or it is not.
 *
 * That is also why `check-translations.mjs` exists: the type system proves the
 * Spanish file has every key, and cannot prove any value was translated.
 */
export function pickCopy<T>(en: T, byLocale: Partial<Record<Locale, T>>, locale: Locale): T {
  if (locale === DEFAULT_LOCALE) return en;

  return byLocale[locale] ?? en;
}
```

- [ ] **Step 4: Run and watch it pass**

```bash
npm test
```

Expected: **338** passing (335 from Task 3, plus three).

---

### Task 5: Extract one module, and prove the shape is right

**Files:**
- Create: `src/content/locales/en/site.json`, `src/content/locales/es/site.json`
- Modify: `src/content/site.ts`
- Create: `src/content/site.test.ts`

**Interfaces:**
- Consumes: `pickCopy` from `src/lib/copy.ts`.
- Produces: the pattern Tasks 6 and 7 repeat eight more times.

**`site.ts` first, deliberately.** It is the smallest of the nine (~44 strings), it is imported by the most other modules, and it is the one whose structure — nav arrays mixing labels with `href`s — is the awkward case. If the pattern survives `site.ts` it survives the rest.

- [ ] **Step 1: Write the invariance test**

Create `src/content/site.test.ts`. This is the whole verification of Tasks 5–7: the exported objects must be what they were.

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { footerNav, headerActions, primaryNav, siteName } from "./site.ts";

/*
  The extraction's only claim is that nothing changed. These are the values as
  of 6 September 2026, written out longhand rather than derived, because a test
  that computes its expectation from the thing under test proves nothing.
*/

test("the house name survives the move into JSON", () => {
  assert.equal(siteName, "The World Tarot");
});

test("primary nav keeps its labels, its order, and its hrefs", () => {
  assert.deepEqual(
    primaryNav.map((item) => item.label),
    ["WORLD TAROT", "LIVING TAROT", "READINGS", "LIBRARY", "FAQ"],
  );

  const readings = primaryNav.find((item) => item.label === "READINGS");
  assert.ok(readings && "children" in readings);
  assert.deepEqual(
    readings.children.map((child) => [child.label, child.href]),
    [
      ["OVERVIEW", "/readings/"],
      ["1 CARD EXPERIENCE", "/readings/one-card"],
      ["3 CARD", "/readings/three-card/"],
      ["MONTH AHEAD", "/readings/month-ahead/"],
      ["IN DEPTH", "/readings/in-depth/"],
    ],
  );
});

test("the masthead's call to action still points at the readings index", () => {
  assert.equal(headerActions.cta.label, "GET MY READING");
  assert.equal(headerActions.cta.href, "/readings/");
});

test("an href never becomes a translatable string", () => {
  for (const link of footerNav) {
    assert.ok(link.href.startsWith("/") || link.href.startsWith("http"), `${link.href} is not a path`);
  }
});
```

- [ ] **Step 2: Run it against the file as it stands**

```bash
npm test -- --test-name-pattern="primary nav keeps"
```

Expected: **PASS.** This is the baseline — it must pass *before* the extraction, or it is not measuring invariance. If it fails now, the expectations above are wrong; fix them to match reality before touching `site.ts`.

- [ ] **Step 3: Create `src/content/locales/en/site.json`**

Strings only, in the same nested shape the module exports. Nav becomes labels indexed by position, so a translator never sees a URL:

```json
{
  "primaryNav": ["WORLD TAROT", "LIVING TAROT", "READINGS", "LIBRARY", "FAQ"],
  "readingsChildren": ["OVERVIEW", "1 CARD EXPERIENCE", "3 CARD", "MONTH AHEAD", "IN DEPTH"],
  "headerActions": {
    "cta": "GET MY READING",
    "account": "Sign in",
    "signOut": "Sign out",
    "bag": "Your bag"
  },
  "footerNav": ["World Tarot", "Living Tarot", "…"]
}
```

Fill `footerNav` and anything else in `site.ts` from the file itself — the ellipsis above is shorthand for "the rest of the real list", not a value to type.

**`siteName` does not go in.** It moved to `src/lib/seo.ts` as `SITE_NAME` and `site.ts` re-exports it; it is a proper noun and is not translated.

- [ ] **Step 4: Copy it to `src/content/locales/es/site.json`**

Byte-identical. Do not translate anything — that is the teammate's work, and an English `es` file is the correct handover state.

- [ ] **Step 5: Rewire `site.ts`**

Import both files, `pickCopy` between them, and compose the exported arrays by zipping labels against the structural data that stays in the `.ts`:

```ts
import en from "./locales/en/site.json";
import es from "./locales/es/site.json";
import { pickCopy } from "@/lib/copy";
import { currentLocale } from "@/lib/locale";

const copy = pickCopy(en, { es }, currentLocale());
```

**Every doc comment in `site.ts` stays.** The trailing-slash rule, the `cta` argument, the note about routes that do not exist yet — none of that is copy and all of it is load-bearing. Add one docblock explaining the split: strings come from `locales/`, structure stays here, and a `href` never crosses over because a translator will eventually change one.

Positional indexing is the seam to be careful with. Add a comment saying so: a label array and its structural array are matched by position, so inserting a nav item means editing both, and the test in step 1 is what catches a mismatch.

- [ ] **Step 6: Run the invariance test again**

```bash
npx tsc --noEmit && npm test
```

Expected: clean, and **342** passing (338 from Task 4, plus this file's four). The four `site.test.ts` cases must pass **unchanged from step 2** — if you edited an expectation to make it pass, the extraction changed something and the edit hid it.

---

### Task 6: The four large content modules

**Files:**
- Create: `locales/{en,es}/home.json`, `readings.json`, `reading-pages.json`, `redeem.json`
- Modify: `src/content/home.ts`, `readings.ts`, `reading-pages.ts`, `redeem.ts`
- Create: `src/content/home.test.ts`, `readings.test.ts`, `reading-pages.test.ts`, `redeem.test.ts`

**Interfaces:**
- Consumes: `pickCopy`, and the pattern Task 5 established.
- Produces: nothing later tasks read.

These four hold ~250 of the ~390 strings. **Do them one module at a time**, completing every step for one before starting the next, so a failure names its own file.

For each module, in order: write the invariance test from the module's current exports → run it and watch it **pass** → extract strings to `en/*.json` → copy to `es/*.json` → rewire the `.ts` → run the test again unchanged.

- [ ] **Step 1: `home.ts`** (~67 strings)

The awkward shapes here, all of which stay exactly as they are:
- `hero.secondaryActions[].label` and `.labelMobile` are `string[]` — two rendered lines. They stay arrays.
- `worldTarot.body` is `{ before, after }`, split around an inline badge. It stays split.
- `products[]` carries `title`, `subtitle`, `action` (copy) alongside `key`, `href`, `image` (structure). **Only the first three move.**

The invariance test should assert `hero.titleMain`, both `bodyMobile` and `body`, the four product `title`/`subtitle` pairs, and that every `products[].image` is still an object with a `src`.

- [ ] **Step 2: `readings.ts`** (~46 strings)

`titleTail` is copy and moves with `title`. Task 3 restored its responsive rendering, so it is load-bearing again — assert both fields per reading in the test.

- [ ] **Step 3: `reading-pages.ts`** (~107 strings, the largest)

`tagline`, `closing` and `testimonial.quote`/`.attribution` are all `readonly string[]` — rendered lines, kept as arrays. `included` is `readonly (readonly string[])[]`: a list of items, each pre-split into lines. It stays nested.

**`questionLimit` and `rushDelivery` do not move.** `content/README.md` calls both settings rather than copy. `rushDelivery.label` and `.standard` are strings but the export ships `enabled: false` and the README calls it dead code pending removal — leave the whole object in the `.ts` and say why in the docblock.

- [ ] **Step 4: `redeem.ts`** (~34 strings)

- [ ] **Step 5: Verify the four together**

```bash
npx tsc --noEmit && npm test && ALLOW_LOCAL_API_BUILD=1 npm run build
```

Expected: clean; **342 plus your four files' cases**; build completes. Report the exact total.

---

### Task 7: The four remaining modules, and the six stray strings

**Files:**
- Create: `locales/{en,es}/checkout.json`, `login.json`, `passwords.json`, `cards.json`
- Modify: `src/content/checkout.ts`, `login.ts`, `passwords.ts`, `cards.ts`
- Create: the matching four `*.test.ts`
- Modify: `src/components/layout/NewsletterForm.tsx`, `src/components/layout/ScrollToTop.tsx`, `src/components/layout/SiteHeader.tsx`, `src/components/concept/ConceptHeader.tsx`, `src/components/reveal/RevealTrigger.tsx`
- Modify: `src/content/site.ts` (to hold the strays)

**Interfaces:**
- Consumes: the Task 5 pattern.
- Produces: a corpus with no untranslatable holes.

- [ ] **Step 1: The four modules**

Same six-step cycle per module as Task 6. `cards.ts` holds only two strings (`name`, `number` for The Star) — and **`number` is a Roman numeral, not copy.** Move `name` only, and say so in the docblock: `XVII` is the same in every language.

- [ ] **Step 2: The six strays**

Left inline, these are holes a translator cannot reach. Move each into `site.ts`'s copy (a new `chrome` section) and import it:

| File | String |
|---|---|
| `NewsletterForm.tsx:168` | `placeholder="First name"` |
| `NewsletterForm.tsx:185` | `placeholder="Email"` |
| `ScrollToTop.tsx:58` | `aria-label="Scroll to top"` |
| `SiteHeader.tsx:164,259` | `"Close menu"` / `"Open menu"` |
| `RevealTrigger.tsx:32` | default `label = "REVEAL YOUR CARD"` |

`ConceptHeader.tsx` carries the same two menu labels and is **unreachable code** — `src/components/concept/README.md` records that its route was removed and the tree is kept for reference. Point it at the same strings for consistency, but do not treat it as a translation target; note in your report that it renders nowhere.

`RevealTrigger`'s is a default parameter, so the call sites that pass a `label` are unaffected; only the default moves.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit && npm test && ALLOW_LOCAL_API_BUILD=1 npm run build
```

Expected: clean; report the total; build completes.

- [ ] **Step 4: Prove the corpus is complete**

```bash
grep -rnE '"[A-Z][a-zA-Z'"'"'’,.!? ]{8,}"' src/components src/app --include=*.tsx | grep -v "className\|import\|from \"@\|data-\|console\." | grep -vE '^\s*\*|//'
```

Read every remaining hit and classify it in your report as copy (a hole — move it) or not copy (a CSS class, a `case` label, an error message for the console, a doc comment). **Do not move console messages** — they are for developers and are not translated.

---

### Task 8: `check:translations`, and the handover README

**Files:**
- Create: `scripts/check-translations.mjs`
- Modify: `package.json`
- Create: `src/content/locales/README.md`

**Interfaces:**
- Consumes: the 18 JSON files from Tasks 5–7.
- Produces: `npm run check:translations`, the teammate's progress bar.

**This is what makes the deliverable usable.** Typing `es` as `typeof en` proves every key exists; it cannot prove any value was translated, because a copied English string is a valid string. With ~390 entries across nine files, the teammate otherwise has no way to see what is left and you have no way to know when they are done.

- [ ] **Step 1: Write the script**

Create `scripts/check-translations.mjs`:

```js
/**
 * Which strings are still English, per locale.
 *
 * **The gap the compiler cannot close.** `es/home.json` is typed as
 * `typeof en/home.json`, so a missing or misspelled key is a build error. A
 * *copied* English value is a valid string and always will be, so completeness
 * is not a type question. This walks both trees and reports every value that is
 * still identical to its English counterpart.
 *
 * `docs/adr/0004-language-is-a-path-segment.md` asks this repository to own its
 * own completeness check, on the grounds that the backend's gate covers Product
 * and Card and will never cover static copy. This is that check.
 *
 * **Reports; does not fail a build.** At handover every string is untranslated
 * and that is the correct state, not an error. Deciding when an incomplete
 * locale should block something belongs to whatever ships the `[locale]` route,
 * and there is no route to block yet.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src/content/locales";
const BASE = "en";

/** Every leaf string in a nested object, as `a.b[0].c` paths. */
function leaves(value, path = "") {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, i) => leaves(item, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) =>
      leaves(item, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

function load(locale, file) {
  return JSON.parse(readFileSync(join(ROOT, locale, file), "utf8"));
}

const files = readdirSync(join(ROOT, BASE)).filter((f) => f.endsWith(".json")).sort();
const locales = readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== BASE)
  .map((e) => e.name)
  .sort();

if (locales.length === 0) {
  console.log(`Only ${BASE} exists. Nothing to compare.`);
  process.exit(0);
}

for (const locale of locales) {
  let same = 0;
  let total = 0;
  const untranslated = [];

  for (const file of files) {
    const base = new Map(leaves(load(BASE, file)));
    const other = new Map(leaves(load(locale, file)));

    for (const [path, value] of base) {
      total += 1;
      if (other.get(path) === value) {
        same += 1;
        untranslated.push([file, path, value]);
      }
    }

    for (const path of other.keys()) {
      if (!base.has(path)) console.warn(`  extra key, not in ${BASE}: ${file} ${path}`);
    }
  }

  console.log(`\n${locale}: ${same} of ${total} strings still identical to ${BASE}`);

  for (const [file, path, value] of untranslated.slice(0, 40)) {
    console.log(`    ${file.padEnd(20)} ${path.padEnd(44)} ${JSON.stringify(value).slice(0, 48)}`);
  }
  if (untranslated.length > 40) console.log(`    … and ${untranslated.length - 40} more`);
}
```

Add to `package.json` scripts, beside the other `check:` entries:

```json
"check:translations": "node scripts/check-translations.mjs",
```

- [ ] **Step 2: Run it**

```bash
npm run check:translations
```

Expected: `es: <N> of <N> strings still identical to en` where the two numbers are equal and around 390, followed by the first 40 named. **Equal numbers are the correct result at handover**, not a failure.

- [ ] **Step 3: Prove it can report progress**

Translate three values in `es/site.json` by hand — `"WORLD TAROT"` → `"TAROT DEL MUNDO"`, and two others — then re-run. The count must drop by exactly three and those three must leave the list. **Then revert your three edits**, because the handover state is a byte-identical copy.

A checker that cannot be seen to change is not a checker.

- [ ] **Step 4: Write `src/content/locales/README.md`**

Two conventions the teammate cannot guess, and one warning:

```markdown
# Translating this site

Every string the site renders lives in this folder, one JSON file per section.
To translate into Spanish, open the files under `es/` and replace the English
values with Spanish ones. Leave the keys alone.

Run `npm run check:translations` at any point to see what is left.

## An array is a set of lines, and you choose where they break

    "tagline": ["One Question. Three Cards.", "Your Path Illuminated."]

That renders as two lines, one above the other. It is not a list of alternatives
and it is not a sentence split by accident — a designer chose that break. So you
are choosing where the Spanish breaks, in a language whose sentences run roughly
20–25% longer. Keep the same number of entries unless the meaning genuinely
needs a different shape, and try to keep the lines close to each other in length.

Some entries have a `Mobile` twin — `label` and `labelMobile`. The short one is
what phones show, where the full version wraps too tall. Both need translating,
and the mobile one needs to stay noticeably shorter.

## Do not translate anything that looks like an address

You should not find any URLs, file paths or image names in these files — they
stay in the TypeScript alongside the layout. If you find something like
`/readings/month-ahead/` or `hero-card.webp` in a file under `es/`, that is a
bug in the extraction. Leave it and say so.

## Prices are not here

Money comes from the backend at page load and is formatted per currency. The
site never converts a price and never invents one.
```

- [ ] **Step 5: Final verification**

```bash
npx tsc --noEmit && npm test && npm run check:translations && ALLOW_LOCAL_API_BUILD=1 npm run build
```

Expected: clean; the full suite green; `es` reported fully untranslated; build completes.

- [ ] **Step 6: Write the handover note**

In your report, state plainly what a teammate does on day one: the folder, the command, the two conventions, and the one thing that is **not** ready — Spanish is not reachable in a browser, because the `[locale]` route does not exist and the backend has not published `es` in `/languages`. Both are named in the spec's §0.8 as other people's work.

---

## Self-Review

**Spec coverage.** §0.4 → Task 1. §0.6 → Tasks 2 and 3. §0.7 → the docblock in Task 3's file list, and the spec section itself. §0.8 → no code; the three backend questions are the spec's. §2.1 (strays) → Task 7 step 2. §2.2 → Tasks 5–7. §2.3 → the `es/` copies in each. §2.4 → Task 8. §2.5 → Task 8 step 4.

**One spec item deliberately has no task:** §0.8's three questions to the backend. They are a message from a person, not a change to this repository, and the plan says so rather than pretending an implementer can send them.

**Type consistency.** `pickCopy` is defined in Task 4 and used under that name in Tasks 5, 6 and 7. `resolveProducts` keeps its signature; only its return changes. `resolveReadingName`/`useReadingName` are deleted in Task 3 and referenced nowhere after. `NavGroupLink` loses `productKey` in Task 3 and is not reintroduced.

**Test-count arithmetic.** 336 at the start → 338 after Task 2 (+2) → 335 after Task 3 (−3 deleted cases) → 338 after Task 4 (+3) → 342 after Task 5 (+4). Tasks 6 and 7 add a file of cases each and are asked to report totals rather than predict them, because the number depends on how many invariants each module warrants.

**The risky half runs first.** Tasks 1–3 change what renders; Tasks 4–8 must not. That ordering is what lets the extraction's verification be "the exported objects are unchanged" against a baseline that has stopped moving.

**Two steps hand the check to the repository owner** rather than asserting a result: Task 3 step 6 (the four rendering changes) and Task 8 step 6 (the handover). Both are visual or human; the standing preference here is that the owner verifies visual work personally.
