# SEO Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the site a complete, single-locale SEO baseline — canonical URLs, a sitemap, robots, Open Graph, structured data and a real 404 — built so that adding `/es/` later is addition rather than revision.

**Architecture:** One pure, unit-tested module (`src/lib/seo.ts`) turns a route into a `Metadata` object. Ten hand-written `metadata` exports become ten calls to it. Two Next file conventions (`robots.ts`, `sitemap.ts`) emit static files at build. Nothing here fetches, and nothing here changes what a visitor sees on an existing page — the whole phase is `<head>`, one new page, and one build script.

**Tech Stack:** Next 16 (App Router, `output: "export"`), React 19, TypeScript, `node --test` on Node 22, `sharp` for image compositing.

**Spec:** [`docs/plans/seo-and-translations.md`](./seo-and-translations.md) — Phase 0 (0.1–0.3) and Phase 1. Read it before task 1; this plan argues from it and does not repeat its reasoning.

**Not in this plan:** spec sections 0.4, 0.5 and Phase 2 (product-name reconciliation and the message catalogue). Those are a second plan, written after this one lands.

## Global Constraints

- **Node is pinned to 22 via Volta.** `package.json` carries `"volta": { "node": "22.23.2" }`. Do not remove it — on Node 20 the test suite silently runs zero tests and exits 0.
- **`src/lib/*.ts` may import `@/…` only as `import type`.** `node --test` does not resolve the `@/` alias; a value import through it breaks the suite. Value imports inside `src/lib/` are relative and carry the `.ts` extension.
- **Tests are `node:test` + `node:assert/strict`**, beside the code as `*.test.ts`, importing with explicit `.ts` extensions. Test names are sentences in the repo's voice, not `should_do_x`.
- **Nothing is fetched at build time.** The rule at the top of `src/lib/api.ts` is not negotiable and nothing here changes it.
- **`trailingSlash: true`.** Every internal path in this plan ends in `/`, the root being `/`.
- **`next.config.mjs` is the config that runs**, not `next.config.ts`. Task 2 collapses them.
- **House style is argument, not summary.** Doc comments state costs and name rejected alternatives. Terse bullet comments read as foreign here.
- **Commit messages carry no `Co-Authored-By` trailer.**
- **Branches are the user's.** Read HEAD and ask where this work belongs before the first commit. The working tree is currently on `ui-fixes` with `package.json` modified by the Volta pin.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/seo.ts` | **New.** Pure. Owns `SITE_NAME`, the canonical URL rule, the title rule, and `buildMetadata`. No `@/` value imports, no fetching, no React |
| `src/lib/seo.test.ts` | **New.** Covers every rule in `seo.ts` |
| `src/content/site.ts` | **Modified.** `siteName` moves to `seo.ts`; this re-exports it so existing consumers keep working |
| `src/app/robots.ts` | **New.** Static `robots.txt` |
| `src/app/sitemap.ts` | **New.** Static `sitemap.xml`, with per-entry `alternates.languages` driven by `BUILT_LOCALES` |
| `src/app/not-found.tsx` | **New.** A styled 404 inside the site chrome |
| `src/app/layout.tsx` | **Modified.** `metadataBase`, `<html lang>` from `currentLocale()` |
| 9 × `src/app/**/page.tsx` | **Modified.** Each `metadata` export becomes a `buildMetadata` call |
| `src/components/seo/JsonLd.tsx` | **New.** Renders a JSON-LD `<script>` |
| `src/lib/structured-data.ts` | **New.** Pure builders for `Product`/`Offer` and `Organization` |
| `src/lib/structured-data.test.ts` | **New.** |
| `scripts/build-og-image.mjs` | **New.** Composites `public/og-image.jpg` with `sharp` |
| `scripts/check-config.mjs` | **New.** Asserts the config's deployability guards fire |
| `next.config.mjs` | **Modified.** Absorbs the `.ts` doc comments; gains the registrable-domain guard |
| `next.config.ts` | **Deleted.** |

---

### Task 1: Pin Node 22 and make the test suite real

**Files:**
- Modify: `package.json` (already modified in the working tree — verify, do not repeat)
- Modify: `README.md` — the "Checking the work" section

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test`. Every later task depends on it.

- [ ] **Step 1: Confirm the pin is present**

```bash
node -p "require('./package.json').volta"
```

Expected: `{ node: '22.23.2' }`. If absent, run `volta pin node@22`.

- [ ] **Step 2: Confirm the runtime actually switched**

```bash
node --version
```

Expected: `v22.23.2`. Volta reads the pin from `package.json`, so this only holds inside the project directory.

- [ ] **Step 3: Run the whole suite**

```bash
npm test
```

Expected: `# pass 316`, `# fail 0`. On 5 September 2026 that is what it answered the first time it had ever run.

If anything fails, **stop and report before continuing.** A failure here is a pre-existing bug that has been invisible, not something this plan introduced, and triaging it is its own piece of work.

- [ ] **Step 4: Record why the pin exists**

In `README.md`, under "Checking the work", above the existing `npm run check:*` block:

```markdown
```bash
npm test        # 316 unit tests over the pure resolvers in src/lib
```

**Node 22 is pinned in `package.json` and the pin is load-bearing.** On Node 20
`node --test` does not expand the `src/**/*.test.ts` glob and cannot strip types
from a `.ts` file, so the script finds nothing, runs nothing, and **exits 0** —
a green result over an empty set. Discovered 5 September 2026, by which point
twenty test files had never once executed and several plan documents carried
"**Done when:** `npm test` is green" as their completion gate.
```

- [ ] **Step 5: Commit**

```bash
git add package.json README.md
git commit -m "The test suite runs, for the first time

`node --test` on Node 20 expands no glob and strips no types, so `npm test`
found nothing, ran nothing and exited 0 — the gate several plans close
against. Node 22 is pinned in package.json; the 316 tests that were already
written all pass."
```

---

### Task 2: Collapse the two `next.config` files, and prove the guards fire

**Files:**
- Create: `scripts/check-config.mjs`
- Modify: `package.json` — add `check:config`
- Modify: `next.config.mjs` — absorb the doc comments from `next.config.ts`
- Delete: `next.config.ts`
- Modify: `DEPLOYMENT.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run check:config`. Task 3 extends it.

**Why `.mjs` survives and `.ts` is deleted:** `.mjs` is the file Next actually loads, so keeping it is the change that alters nothing about what runs. It is also the only one of the two that `node` can import directly, which is what makes `check:config` cheap — the alternative is driving a full `next build` per assertion. The two files are otherwise functionally identical; verified by diff on 5 September 2026, both carrying `output: "export"`, `trailingSlash`, `images.unoptimized`, `devIndicators: false` and the same three guard functions. What is lost is TypeScript types on the config object, which the `@type` JSDoc annotation at the top of `.mjs` already supplies to an editor.

- [ ] **Step 1: Write the failing check script**

Create `scripts/check-config.mjs`:

```js
/**
 * The deployability guards in `next.config.mjs`, exercised without a build.
 *
 * The config's default export is a function of `phase`, and the guards run when
 * it is *called* rather than when the module loads — so this imports it once and
 * calls it per case, resetting the environment between.
 *
 * **This is why `next.config.ts` was deleted rather than `.mjs`.** Node can
 * import the `.mjs` directly; driving the same assertions through the `.ts`
 * would mean a full `next build` per case.
 */
import assert from "node:assert/strict";

const BUILD = "phase-production-build";

const config = (await import("../next.config.mjs")).default;

const KEYS = ["NEXT_PUBLIC_API_BASE_URL", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "ALLOW_LOCAL_API_BUILD"];

/**
 * Runs the config under one environment and says whether it threw.
 *
 * Restores key by key rather than reassigning `process.env` wholesale — the
 * latter is legal in Node and coerces every value on the way through, which is
 * a footgun for the sake of one line.
 */
function attempt(env) {
  const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

  for (const key of KEYS) delete process.env[key];
  Object.assign(process.env, env);

  try {
    config(BUILD);
    return null;
  } catch (error) {
    return error;
  } finally {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

const cases = [
  {
    name: "an unset API base is refused",
    env: {},
    throws: true,
  },
  {
    name: "a loopback API base is refused",
    env: { NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8000", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x" },
    throws: true,
  },
  {
    name: "a live Stripe key against staging is refused",
    env: { NEXT_PUBLIC_API_BASE_URL: "https://staging-api.theworldtarot.com", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_x" },
    throws: true,
  },
  {
    name: "a test Stripe key against production is refused",
    env: { NEXT_PUBLIC_API_BASE_URL: "https://api.theworldtarot.com", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x" },
    throws: true,
  },
  {
    name: "staging with a test key builds",
    env: { NEXT_PUBLIC_API_BASE_URL: "https://staging-api.theworldtarot.com", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x" },
    throws: false,
  },
  {
    name: "a deliberate local preview build is exempt from every guard",
    env: { ALLOW_LOCAL_API_BUILD: "1", NEXT_PUBLIC_API_BASE_URL: "http://localhost:8000" },
    throws: false,
  },
];

let failed = 0;

for (const { name, env, throws } of cases) {
  const error = attempt(env);

  try {
    if (throws) assert.ok(error, `expected a refusal: ${name}`);
    else assert.equal(error, null, `expected to build: ${name}${error ? ` — ${error.message}` : ""}`);
    console.log(`  ok   ${name}`);
  } catch (failure) {
    failed += 1;
    console.error(`  FAIL ${name}\n       ${failure.message}`);
  }
}

console.log(`\n${cases.length - failed} of ${cases.length} guard cases hold.`);
process.exit(failed === 0 ? 0 : 1);
```

Add to `package.json` scripts, after `check:currency`:

```json
"check:config": "node scripts/check-config.mjs",
```

- [ ] **Step 2: Run it against the config as it stands**

```bash
npm run check:config
```

Expected: all six cases pass. This is the baseline — it proves the script exercises the guards before anything is moved.

- [ ] **Step 3: Move the doc comments into `next.config.mjs`**

Open `next.config.ts` and `next.config.mjs` side by side. Every docblock in the `.ts` — on `assertDeployableApiBase`, on `assertStripeKeyMatchesApi`, on the `devIndicators` line — is copied into the `.mjs` above the same function. The `.mjs`'s own docblock explaining that it is the copy which runs is **replaced** with:

```js
/**
 * The one config. `next.config.ts` stood beside this file until 5 September
 * 2026 carrying an identical implementation and better comments, which is a
 * hazard rather than a redundancy: Next resolves `.mjs` first, so a fix applied
 * to the `.ts` silently did nothing, and `DEPLOYMENT.md` had to carry a
 * paragraph warning about it.
 *
 * `.mjs` survived rather than `.ts` for a reason beyond "it is the one that
 * ran": `node` can import it directly, which is what lets `scripts/check-config.mjs`
 * exercise the guards below without driving a full build per case.
 */
```

- [ ] **Step 4: Delete the TypeScript copy and re-run**

```bash
rm next.config.ts
npm run check:config
```

Expected: all six cases still pass.

- [ ] **Step 5: Correct `DEPLOYMENT.md`**

Replace the paragraph beginning "Both `next.config.ts` and `next.config.mjs` exist side by side" with:

```markdown
~~Both `next.config.ts` and `next.config.mjs` exist side by side with equivalent
settings, and Next loads only one.~~ **Struck 5 September 2026.** There is one
config, `next.config.mjs`. The `.ts` copy was deleted rather than kept in step,
and `npm run check:config` now asserts the guards below actually refuse what
they claim to — without a build, which is why the `.mjs` is the copy that
survived.
```

- [ ] **Step 6: Confirm the build still loads its config**

```bash
ALLOW_LOCAL_API_BUILD=1 npm run build
```

Expected: the build completes. It is exempt from the guards, which is the point — this step proves Next still finds and loads a config at all, not that the guards work. Step 4 proved that.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-config.mjs package.json next.config.mjs DEPLOYMENT.md
git rm next.config.ts
git commit -m "One config, and its guards are checked rather than asserted

Two config files with identical implementations is a hazard, not a
redundancy — Next resolves the .mjs first, so a fix to the .ts did nothing
and DEPLOYMENT.md carried a warning about it. `check:config` calls the
surviving config under six environments and asserts which four it refuses."
```

---

### Task 3: Close the registrable-domain hole, and correct `.env.local`

**Files:**
- Modify: `scripts/check-config.mjs` — two new cases
- Modify: `next.config.mjs` — `assertOwnRegistrableDomain`
- Modify: `.env.local`
- Modify: `docs/adr/0001-one-registrable-domain.md`

**Interfaces:**
- Consumes: `npm run check:config` from Task 2.
- Produces: nothing later tasks read.

**The spec's 0.1 asked for the env fix and an issue raised about the guard's blind spot. This closes the blind spot instead**, which is cheaper than the issue and permanent. `assertDeployableApiBase`'s own docblock names the gap: *"It cannot catch the other wrong value — an API base outside `theworldtarot.com`, which passes here and then loses the cookies on every write."* `.env.local` currently holds exactly that value.

- [ ] **Step 1: Add the failing cases**

In `scripts/check-config.mjs`, add to `cases`, before the two passing cases at the end:

```js
  {
    name: "the Laravel Cloud platform URL is refused",
    env: {
      NEXT_PUBLIC_API_BASE_URL: "https://theworldtarot-staging-9naya2.laravel.cloud",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x",
    },
    throws: true,
  },
  {
    name: "any host outside theworldtarot.com is refused",
    env: {
      NEXT_PUBLIC_API_BASE_URL: "https://theworldtarot.pages.dev",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x",
    },
    throws: true,
  },
```

- [ ] **Step 2: Run and watch them fail**

```bash
npm run check:config
```

Expected: `FAIL the Laravel Cloud platform URL is refused` and `FAIL any host outside theworldtarot.com is refused`, exit 1. The other six still pass.

- [ ] **Step 3: Add the guard**

In `next.config.mjs`, after `assertDeployableApiBase`:

```js
/**
 * Refuses an API base outside `theworldtarot.com`.
 *
 * The failure this prevents is the quietest one in the deployment. Cookies are
 * issued for `.theworldtarot.com`, so from any other registrable domain the
 * browser treats the session and `XSRF-TOKEN` cookies as third party, Safari
 * discards them, and **every write is refused while every unauthenticated read
 * keeps working.** The site looks healthy right up to checkout. See
 * `docs/adr/0001-one-registrable-domain.md`.
 *
 * `assertDeployableApiBase` named this exact gap in its own docblock and did
 * not close it, and on 5 September 2026 `.env.local` was found holding
 * `theworldtarot-staging-9naya2.laravel.cloud` — the platform URL that ADR 0001
 * names as the wrong value, passing every guard there was.
 *
 * Suffix matching on a dot, not `includes`: `nottheworldtarot.com` and
 * `theworldtarot.com.evil.test` are both outside and both would pass a looser
 * test.
 */
function assertOwnRegistrableDomain() {
  if (process.env.ALLOW_LOCAL_API_BUILD === "1") return;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase) return; // `assertDeployableApiBase` owns the unset case.

  const { hostname } = new URL(apiBase);

  if (hostname === "theworldtarot.com" || hostname.endsWith(".theworldtarot.com")) return;

  throw new Error(
    `NEXT_PUBLIC_API_BASE_URL is ${hostname}, which is not under theworldtarot.com. ` +
      "Cookies are issued for .theworldtarot.com, so from this origin Safari discards " +
      "them and every write is refused while reads keep working — the build succeeds and " +
      "the site looks healthy right up to checkout. Use staging-api.theworldtarot.com or " +
      "api.theworldtarot.com, never the Laravel Cloud platform URL, a pages.dev or a " +
      "workers.dev. See docs/adr/0001-one-registrable-domain.md.",
  );
}
```

Call it from the default export, immediately after `assertDeployableApiBase()`:

```js
  assertDeployableApiBase();
  assertOwnRegistrableDomain();
  assertStripeKeyMatchesApi();
```

- [ ] **Step 4: Run and watch all eight pass**

```bash
npm run check:config
```

Expected: `8 of 8 guard cases hold.`

- [ ] **Step 5: Correct `.env.local`**

```
NEXT_PUBLIC_API_BASE_URL=https://staging-api.theworldtarot.com
```

Confirm the host answers, which it did on 4 September 2026:

```bash
curl -s "https://staging-api.theworldtarot.com/api/v1/en/products" | head -c 120
```

Expected: a JSON array beginning `[{"key":"one-card"`.

`.env.local` is gitignored (`.env*` in `.gitignore`), so this change is local and must be made in the Cloudflare environment separately. Say so when reporting the task done.

- [ ] **Step 6: Record it in ADR 0001**

Append:

```markdown
## The guard that now enforces this

**Added 5 September 2026.** `assertOwnRegistrableDomain` in `next.config.mjs`
refuses a build whose `NEXT_PUBLIC_API_BASE_URL` is outside `theworldtarot.com`,
and `npm run check:config` asserts it. Until then this ADR was enforced by
reading it: `assertDeployableApiBase` caught loopback only and said so in its own
docblock, and `.env.local` was found that day holding the Laravel Cloud platform
URL this document names as the wrong value.
```

- [ ] **Step 7: Commit**

```bash
git add next.config.mjs scripts/check-config.mjs docs/adr/0001-one-registrable-domain.md
git commit -m "ADR 0001 is enforced by the build rather than by reading it

An API base outside theworldtarot.com loses the cookies on every write while
reads keep working, so the site looks healthy right up to checkout. The old
guard caught loopback only and named this gap in its own docblock; .env.local
was meanwhile holding the platform URL the ADR forbids."
```

---

### Task 4: Delete the three superseded plans, keeping their argument

**Files:**
- Modify: `docs/adr/0004-language-is-a-path-segment.md`
- Delete: `docs/plans/locale-controls.md`, `docs/plans/locale-controls-implementation.md`, `docs/plans/local-controls-reply.md`

**Interfaces:** none. Documentation only.

**These three are untracked and `git` cannot restore them**, so the part worth keeping is lifted before they go. Spec 0.2 has the full account.

- [ ] **Step 1: Confirm they are untracked, so the deletion is real**

```bash
git log --all --oneline -- docs/plans/locale-controls.md
git status --porcelain docs/plans/
```

Expected: no commits for the first; three `??` lines for the second. If any of them is tracked, **stop** — this task assumed otherwise.

- [ ] **Step 2: Add the rejected alternative to ADR 0004**

Append to `docs/adr/0004-language-is-a-path-segment.md`:

```markdown
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
```

- [ ] **Step 3: Delete them**

```bash
rm docs/plans/locale-controls.md docs/plans/locale-controls-implementation.md docs/plans/local-controls-reply.md
```

- [ ] **Step 4: Check nothing links to them**

```bash
grep -rn "locale-controls\|local-controls-reply" --include=*.md --include=*.ts --include=*.tsx . --exclude-dir=node_modules --exclude-dir=.next
```

Expected: matches only inside `docs/plans/seo-and-translations.md` and this plan, both of which reference them as deleted. Any other match is a live link to a file that no longer exists — fix it to point at ADR 0004.

- [ ] **Step 5: Report the open backend question**

`local-controls-reply.md` note 3 told the backend *"we are not putting language in our own URLs […] treat that as a decision on our side"*, which ADR 0004 reversed four days later. `API_CONTRACT.md` §3 still carries its original path-routing wording, so it may never have travelled — but notes 2 and 4 from the same file clearly did, via `TheWorldTarot#66`.

**Read #66. If note 3 is in it, correct it.** This was not verifiable while planning: the GitHub MCP server would not connect. Report what you find rather than closing the task silently either way.

- [ ] **Step 6: Commit**

```bash
git add docs/adr/0004-language-is-a-path-segment.md
git commit -m "The route move is priced in the ADR, and the plans that lost are gone

Three untracked documents from 30 August argued language as a browser
preference with no URL; ADR 0004 reversed them on 3 September and they sat in
docs/plans/ undated, reading as current. The cost table is the part worth
keeping, so it moves into the ADR's own rejected alternatives."
```

---

### Task 5: `src/lib/seo.ts` — the one metadata rule

**Files:**
- Create: `src/lib/seo.ts`
- Create: `src/lib/seo.test.ts`
- Modify: `src/content/site.ts:152`

**Interfaces:**
- Consumes: `BUILT_LOCALES`, `DEFAULT_LOCALE`, `Locale` from `./locale.ts`.
- Produces, and every later task uses these exact names:
  - `SITE_NAME: string`
  - `siteUrl(): string`
  - `canonicalFor(path: string, locale?: Locale): string`
  - `localePath(path: string, locale: Locale): string`
  - `pageTitle(path: string, title: string): string`
  - `type PageSeo = { path: string; title: string; description?: string; index?: boolean }`
  - `buildMetadata(page: PageSeo): Metadata`

**`SITE_NAME` moves here from `content/site.ts` because `src/lib` may not value-import through `@/`** (see Global Constraints) and this module must stay unit-testable. `content/site.ts` re-exports it so its ten existing consumers keep compiling.

- [ ] **Step 1: Write the failing test**

Create `src/lib/seo.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildMetadata, canonicalFor, localePath, pageTitle, siteUrl, SITE_NAME } from "./seo.ts";

test("the site name leads on the home page and trails everywhere else", () => {
  assert.equal(pageTitle("/", "Enter The Living Tarot"), `${SITE_NAME} — Enter The Living Tarot`);
  assert.equal(pageTitle("/readings/", "Readings"), `Readings — ${SITE_NAME}`);
});

test("a canonical is absolute, and keeps the trailing slash the export is built on", () => {
  assert.equal(canonicalFor("/readings/"), `${siteUrl()}/readings/`);
  assert.equal(canonicalFor("/"), `${siteUrl()}/`);
});

test("the default locale keeps the bare path, which is the whole of ADR 0004", () => {
  assert.equal(localePath("/readings/", "en"), "/readings/");
  assert.equal(localePath("/", "en"), "/");
});

test("any other locale takes a prefix, so adding one is addition rather than a move", () => {
  assert.equal(localePath("/readings/", "es"), "/es/readings/");
  assert.equal(localePath("/", "es"), "/es/");
});

test("an indexable page carries a canonical and an Open Graph URL that agree", () => {
  const metadata = buildMetadata({ path: "/readings/", title: "Readings", description: "Choose a reading." });

  assert.equal(metadata.alternates?.canonical, `${siteUrl()}/readings/`);
  assert.equal(metadata.openGraph?.url, `${siteUrl()}/readings/`);
  assert.equal(metadata.openGraph?.title, `Readings — ${SITE_NAME}`);
  assert.equal(metadata.description, "Choose a reading.");
});

test("a page that opts out of the index says so, and still canonicalises", () => {
  const metadata = buildMetadata({ path: "/login/", title: "Sign In", index: false });

  assert.deepEqual(metadata.robots, { index: false, follow: false });
  assert.equal(metadata.alternates?.canonical, `${siteUrl()}/login/`);
});

test("an indexable page says nothing about robots, rather than saying yes", () => {
  assert.equal(buildMetadata({ path: "/readings/", title: "Readings" }).robots, undefined);
});

test("one built locale offers no alternates, because a page is not an alternate of itself", () => {
  assert.equal(buildMetadata({ path: "/readings/", title: "Readings" }).alternates?.languages, undefined);
});

test("a path without its trailing slash is a mistake worth refusing", () => {
  assert.throws(() => canonicalFor("/readings"), /trailing slash/);
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm test -- --test-name-pattern="site name leads"
```

Expected: FAIL — `Cannot find module './seo.ts'`.

- [ ] **Step 3: Write `src/lib/seo.ts`**

```ts
import type { Metadata } from "next";

import { BUILT_LOCALES, DEFAULT_LOCALE, type Locale } from "./locale.ts";

/**
 * Every rule that turns a route into a `<head>`.
 *
 * **Pure, and unit-tested, which is why it is here and not in `content/`.**
 * `node --test` does not resolve the `@/` alias, so this module value-imports
 * nothing through it — see the Global Constraints in
 * `docs/plans/seo-baseline-implementation.md`. That constraint is the reason
 * `SITE_NAME` lives here rather than in `content/site.ts`, which re-exports it.
 *
 * **Locale-aware while there is one locale**, deliberately. Nothing here draws a
 * second language today: `BUILT_LOCALES` holds `en` alone, so `localePath` is an
 * identity function and `languageAlternates` answers nothing. What it buys is
 * that adding Spanish is a change to `BUILT_LOCALES` and a set of copy files,
 * rather than a rewrite of ten `<head>`s. See
 * `docs/adr/0004-language-is-a-path-segment.md`.
 */

/**
 * The house name, in one place.
 *
 * It was `siteName` in `content/site.ts` until 5 September 2026, and that export
 * still exists as a re-export of this one: every consumer was a page title, and
 * all ten of them now come through `buildMetadata`.
 */
export const SITE_NAME = "The World Tarot";

/**
 * Where this build believes it is deployed.
 *
 * `metadataBase` needs an absolute origin, and a static export has no request to
 * infer one from — so it is configuration, like the API base beside it.
 *
 * **Development falls back rather than throwing**, because `.env*` is gitignored
 * and a fresh clone would otherwise fail to run `next dev`. A production build
 * with this unset would silently emit canonical URLs pointing at localhost,
 * which is worse than a refused build, so that case throws.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;

  if (configured) return configured.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is unset, so every canonical, Open Graph and sitemap URL in " +
        "this build would point at localhost. Set it to the origin this export is served " +
        "from — https://theworldtarot.com in production, https://staging.theworldtarot.com " +
        "on staging.",
    );
  }

  return "http://localhost:3000";
}

/**
 * The path a route takes in one locale.
 *
 * **The default locale keeps the bare path.** That asymmetry is the whole of
 * ADR 0004 and it is not an oversight: `/` stays where it is, `/es/` is pure
 * addition, and no URL that exists today ever moves. The ADR prices the
 * alternative.
 */
export function localePath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;

  return `/${locale}${path}`;
}

/**
 * An absolute URL for a route, which is what a canonical and a sitemap both want.
 *
 * Refuses a path with no trailing slash rather than quietly normalising one.
 * `trailingSlash: true` means `/readings` costs a 308, and a canonical that
 * names the redirecting form points search engines at the hop rather than the
 * page. A typo here is silent everywhere else, so it is loud here.
 */
export function canonicalFor(path: string, locale: Locale = DEFAULT_LOCALE): string {
  if (!path.endsWith("/")) {
    throw new Error(`Route "${path}" has no trailing slash. The export is a directory of index.html files.`);
  }

  return `${siteUrl()}${localePath(path, locale)}`;
}

/**
 * The `<title>`.
 *
 * **The house name leads on the home page and trails everywhere else.** That is
 * how the site read before this module existed and it is a real rule rather than
 * an accident of two authors: the home page is the brand, and an interior page
 * is a thing within it.
 */
export function pageTitle(path: string, title: string): string {
  return path === "/" ? `${SITE_NAME} — ${title}` : `${title} — ${SITE_NAME}`;
}

/**
 * `hreflang`, once there is more than one language to declare.
 *
 * **Answers `undefined` at one built locale**, which is the state today. A page
 * is not an alternate of itself, and a lone `hreflang="en"` pointing at the page
 * carrying it is noise that some crawlers treat as a mistake.
 */
function languageAlternates(path: string): Record<string, string> | undefined {
  if (BUILT_LOCALES.length < 2) return undefined;

  return Object.fromEntries(BUILT_LOCALES.map((locale) => [locale, canonicalFor(path, locale)]));
}

export type PageSeo = {
  /** Absolute, from the site root, with a trailing slash. `/readings/`, or `/`. */
  path: string;
  /** The page's own name. `pageTitle` decides where the house name goes. */
  title: string;
  description?: string;
  /** Defaults to true. False emits `robots: { index: false, follow: false }`. */
  index?: boolean;
};

/**
 * One page's `<head>`.
 *
 * **An indexable page says nothing about robots at all**, rather than declaring
 * `index: true`. The default is to index; stating it adds a tag that means
 * nothing and invites somebody to think the ones that do say something are
 * optional.
 *
 * The Open Graph image is site-wide and lives in `metadataBase`'s shadow —
 * `openGraph.images` resolves relative paths against it, which is the one thing
 * `metadataBase` is genuinely load-bearing for. See `scripts/build-og-image.mjs`.
 */
export function buildMetadata({ path, title, description, index = true }: PageSeo): Metadata {
  const url = canonicalFor(path);
  const fullTitle = pageTitle(path, title);

  return {
    title: fullTitle,
    ...(description ? { description } : {}),
    alternates: {
      canonical: url,
      ...(languageAlternates(path) ? { languages: languageAlternates(path) } : {}),
    },
    ...(index ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: fullTitle,
      ...(description ? { description } : {}),
      url,
      images: ["/og-image.jpg"],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      ...(description ? { description } : {}),
      images: ["/og-image.jpg"],
    },
  };
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
npm test
```

Expected: `# fail 0`, and the total risen from 316 to 325.

- [ ] **Step 5: Re-export `siteName` so nothing breaks**

In `src/content/site.ts`, replace line 152:

```ts
export const siteName = "The World Tarot";
```

with:

```ts
/**
 * The house name.
 *
 * **Declared in `src/lib/seo.ts` since 5 September 2026** and re-exported here,
 * which is the opposite of where a name like this belongs — copy lives in
 * `content/`. It moved because `src/lib` cannot value-import through the `@/`
 * alias without breaking `node --test`, and `seo.ts` is unit-tested while this
 * file is not. Every consumer was a page title and all of them now call
 * `buildMetadata`, so this export exists for anything that arrives later.
 */
export { SITE_NAME as siteName } from "@/lib/seo";
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/seo.ts src/lib/seo.test.ts src/content/site.ts
git commit -m "One rule for a page's head, locale-aware while there is one locale

Nine hand-written metadata objects had drifted into four shapes between them.
This is the rule they should all have been: canonical, Open Graph, Twitter and
title from a route and a name. localePath is an identity function today and is
the reason adding /es/ is addition rather than ten rewrites."
```

---

### Task 6: Every page's metadata comes through `buildMetadata`, and `<html lang>` stops lying

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/(site)/page.tsx` *(gains a metadata export; it has none today and inherits the root's)*
- Modify: `src/app/(site)/readings/page.tsx`, `readings/three-card/page.tsx`, `readings/month-ahead/page.tsx`, `readings/in-depth/page.tsx`, `redeem/page.tsx`, `login/page.tsx`, `reset-password/page.tsx`, `set-password/page.tsx`, `checkout/complete/page.tsx`
- Modify: `src/app/(site)/checkout-probe/page.tsx` *(has no metadata at all)*
- Modify: `.env.local`

**Interfaces:**
- Consumes: `buildMetadata`, `SITE_NAME` from `src/lib/seo.ts`; `currentLocale` from `src/lib/locale.ts`.
- Produces: nothing later tasks read.

- [ ] **Step 1: Add the site origin to `.env.local`**

```
NEXT_PUBLIC_SITE_URL=https://staging.theworldtarot.com
```

Gitignored, so it must be set in the Cloudflare environment separately — production takes `https://theworldtarot.com`. Report this alongside Task 3's env change.

- [ ] **Step 2: Root layout — `metadataBase`, and a truthful `lang`**

In `src/app/layout.tsx`, replace the `metadata` export:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  ...buildMetadata({
    path: "/",
    title: "Enter The Living Tarot",
    description:
      "A cinematic interpretation of the Major Arcana. Reveal a card and experience The Living Tarot one story at a time.",
  }),
};
```

Imports become:

```tsx
import { buildMetadata, siteUrl } from "@/lib/seo";
import { currentLocale } from "@/lib/locale";
```

and the `siteName` import is removed. Then the opening tag:

```tsx
    <html
      lang={currentLocale()}
```

**`metadataBase` is set once, on the root layout, and nowhere else.** Next merges metadata down the tree, so a page-level `buildMetadata` inherits it. It is what makes `images: ["/og-image.jpg"]` resolve to an absolute URL, which every platform that reads Open Graph requires.

- [ ] **Step 3: The home page takes its own metadata**

`src/app/(site)/page.tsx` has no `metadata` export and inherits the root's, which is correct today and stops being correct the moment the root's differs from the home page's. Leave it inheriting — **do not add one.** This step is here to record that the omission was considered.

- [ ] **Step 4: Rewrite the four indexable interior pages**

`src/app/(site)/readings/page.tsx`:

```tsx
export const metadata: Metadata = buildMetadata({
  path: "/readings/",
  title: "Readings",
  description:
    "Begin with our signature interactive experience, where the cards come to life and answer your question in real time, or choose a traditional written reading for a deeper exploration of your path.",
});
```

`readings/three-card/page.tsx`:

```tsx
export const metadata: Metadata = buildMetadata({
  path: "/readings/three-card/",
  title: "3 Card Reading",
  description:
    "One question, three cards, your path illuminated. A written tarot reading, thoughtfully interpreted and delivered by email within 24 hours.",
});
```

`readings/month-ahead/page.tsx`:

```tsx
export const metadata: Metadata = buildMetadata({
  path: "/readings/month-ahead/",
  title: "Month Ahead Reading",
  description:
    "One month, five cards, a clear path ahead. A written reading of the weeks to come, thoughtfully interpreted and delivered by email within 24 hours.",
});
```

`readings/in-depth/page.tsx`:

```tsx
export const metadata: Metadata = buildMetadata({
  path: "/readings/in-depth/",
  title: "In-Depth Reading",
  description:
    "One question, twelve cards, a deeper story revealed. A written reading of the patterns shaping your story, delivered by email within 48 hours.",
});
```

In each, replace `import { siteName } from "@/content/site";` with `import { buildMetadata } from "@/lib/seo";`.

- [ ] **Step 5: `/redeem/`, which stays indexable**

```tsx
export const metadata: Metadata = buildMetadata({
  path: "/redeem/",
  title: redeemCopy.pageTitle,
  description:
    "Enter the code from your email to open the reading you have been given, and ask your question.",
});
```

Keep the existing docblock above it. It argues this page belongs in the index and the reasoning is still live.

- [ ] **Step 6: The four pages that stay out of the index**

Each keeps its existing comment explaining why. `login/page.tsx`:

```tsx
export const metadata: Metadata = buildMetadata({
  path: "/login/",
  title: loginCopy.title,
  index: false,
});
```

`reset-password/page.tsx` — `path: "/reset-password/"`, `title: resetPasswordCopy.title`, `index: false`.

`set-password/page.tsx` — `path: "/set-password/"`, `title: setPasswordCopy.title`, `index: false`.

`checkout/complete/page.tsx` — `path: "/checkout/complete/"`, `title: checkoutCompleteCopy.pageTitle`, `index: false`.

- [ ] **Step 7: `/checkout-probe/` gains metadata it never had**

At the top of `src/app/(site)/checkout-probe/page.tsx`, after the existing docblock:

```tsx
import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";

/**
 * Out of the index, belt and braces.
 *
 * `DEPLOYMENT.md` says no production build may be cut from a branch carrying
 * this route, and deleting the file at #38 is the real guarantee. This is the
 * cheap second one: anybody who loads this page places a real pending order
 * against whatever API the build points at, and a search result is the one way
 * somebody arrives here without meaning to.
 */
export const metadata: Metadata = buildMetadata({
  path: "/checkout-probe/",
  title: "Checkout Probe",
  index: false,
});
```

- [ ] **Step 8: Type-check and build**

```bash
npx tsc --noEmit && ALLOW_LOCAL_API_BUILD=1 npm run build
```

Expected: both clean.

- [ ] **Step 9: Confirm the head is what it claims**

```bash
grep -o '<link rel="canonical"[^>]*>' out/readings/month-ahead/index.html
grep -o '<meta property="og:image"[^>]*>' out/index.html
grep -o '<html lang="[^"]*"' out/index.html
grep -c 'name="robots"' out/login/index.html
```

Expected, in order: a canonical naming the absolute `/readings/month-ahead/` URL; an `og:image` that is absolute, not `/og-image.jpg`; `<html lang="en"`; and `1`.

- [ ] **Step 10: Commit**

```bash
git add src/app .env.local
git commit -m "Ten heads, one rule, and html lang stops being a literal

Every page canonicalises to its own slashed URL and carries Open Graph and
Twitter cards. /checkout-probe/ had no metadata at all and is now noindex,
which DEPLOYMENT.md wanted and deleting the route at #38 still owns properly."
```

*(`.env.local` is gitignored; the `git add` will skip it. Set `NEXT_PUBLIC_SITE_URL` in Cloudflare separately.)*

---

### Task 7: `robots.txt` and `sitemap.xml`

**Files:**
- Create: `src/app/robots.ts`
- Create: `src/app/sitemap.ts`
- Create: `src/lib/routes.ts`
- Create: `src/lib/routes.test.ts`

**Interfaces:**
- Consumes: `canonicalFor`, `siteUrl` from `src/lib/seo.ts`; `BUILT_LOCALES` from `src/lib/locale.ts`.
- Produces: `PUBLIC_ROUTES: readonly string[]`, `PRIVATE_ROUTES: readonly string[]`, `sitemapEntries(): { url: string; alternates?: { languages: Record<string, string> } }[]`.

**Both are static file conventions and neither appears in the static-export unsupported list**, verified against `node_modules/next/dist/docs/01-app/02-guides/static-exports.md` on 5 September 2026.

- [ ] **Step 1: Write the failing test**

Create `src/lib/routes.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { PRIVATE_ROUTES, PUBLIC_ROUTES, sitemapEntries } from "./routes.ts";
import { canonicalFor } from "./seo.ts";

test("the six public routes are the ones a stranger can usefully land on", () => {
  assert.deepEqual(PUBLIC_ROUTES, [
    "/",
    "/readings/",
    "/readings/three-card/",
    "/readings/month-ahead/",
    "/readings/in-depth/",
    "/redeem/",
  ]);
});

test("redeem is public, because a gift code page is a page that works", () => {
  assert.ok(PUBLIC_ROUTES.includes("/redeem/"));
  assert.ok(!PRIVATE_ROUTES.includes("/redeem/"));
});

test("nothing is both public and private", () => {
  const overlap = PUBLIC_ROUTES.filter((route) => PRIVATE_ROUTES.includes(route));
  assert.deepEqual(overlap, []);
});

test("every route carries its trailing slash, or the canonical would name a 308", () => {
  for (const route of [...PUBLIC_ROUTES, ...PRIVATE_ROUTES]) {
    assert.ok(route.endsWith("/"), `${route} has no trailing slash`);
  }
});

test("the sitemap holds one absolute entry per public route", () => {
  const entries = sitemapEntries();

  assert.equal(entries.length, PUBLIC_ROUTES.length);
  assert.equal(entries[0].url, canonicalFor("/"));
  assert.equal(entries[1].url, canonicalFor("/readings/"));
});

test("one built locale declares no alternates, so no hreflang goes out unreciprocated", () => {
  for (const entry of sitemapEntries()) assert.equal(entry.alternates, undefined);
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm test -- --test-name-pattern="six public routes"
```

Expected: FAIL — `Cannot find module './routes.ts'`.

- [ ] **Step 3: Write `src/lib/routes.ts`**

```ts
import { BUILT_LOCALES } from "./locale.ts";
import { canonicalFor } from "./seo.ts";

/**
 * Which routes exist, and which of them a stranger should be able to find.
 *
 * **Hand-written rather than derived from the filesystem.** A static export
 * could be walked, but `out/` does not exist until after a build and the answer
 * this file gives is a judgment rather than a fact: `/redeem/` and
 * `/checkout-probe/` are both routes, and only one of them belongs in an index.
 */

/**
 * In the sitemap, and indexable.
 *
 * **`/redeem/` is here deliberately.** Its own docblock argues the case: it
 * duplicates no reading page, because a gift's copy arrives from a lookup in the
 * browser rather than from the export — which is what put `noindex` on
 * `/presentation-probe/` before it was deleted. A search result landing on
 * "enter your gift code" is a page that works.
 */
export const PUBLIC_ROUTES: readonly string[] = [
  "/",
  "/readings/",
  "/readings/three-card/",
  "/readings/month-ahead/",
  "/readings/in-depth/",
  "/redeem/",
];

/**
 * Disallowed in `robots.txt`, and each carrying `index: false` of its own.
 *
 * The two mechanisms are not redundant. `robots.txt` asks a crawler not to
 * fetch; the meta tag tells one that fetched anyway not to index. A page reached
 * from a link somewhere else is caught only by the second.
 *
 * `/checkout/` covers `/checkout/complete/` and anything later under it. It is a
 * prefix here rather than an exact route for that reason.
 */
export const PRIVATE_ROUTES: readonly string[] = [
  "/login/",
  "/checkout/",
  "/reset-password/",
  "/set-password/",
  "/checkout-probe/",
];

export type SitemapEntry = {
  url: string;
  alternates?: { languages: Record<string, string> };
};

/**
 * One entry per public route.
 *
 * **No `lastModified`.** A build stamp would say every page changed on every
 * deploy, which is both untrue and the thing that teaches a crawler to stop
 * believing the field. Nothing here knows when a page's copy last changed.
 *
 * `alternates` stays absent while one locale is built, for the reason
 * `languageAlternates` in `seo.ts` gives.
 */
export function sitemapEntries(): SitemapEntry[] {
  const many = BUILT_LOCALES.length > 1;

  return PUBLIC_ROUTES.map((route) => ({
    url: canonicalFor(route),
    ...(many
      ? {
          alternates: {
            languages: Object.fromEntries(
              BUILT_LOCALES.map((locale) => [locale, canonicalFor(route, locale)]),
            ),
          },
        }
      : {}),
  }));
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
npm test
```

Expected: `# fail 0`, total risen to 331.

- [ ] **Step 5: Write the two route files**

`src/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";

import { PRIVATE_ROUTES } from "@/lib/routes";
import { siteUrl } from "@/lib/seo";

/**
 * Emitted as a static `robots.txt` at build. This file convention is not in the
 * static-export unsupported list — checked against
 * `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`, 5 September 2026.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PRIVATE_ROUTES],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
```

`src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";

import { sitemapEntries } from "@/lib/routes";

/**
 * **`hreflang` lives here rather than in every page's `<head>`.**
 *
 * `hreflang` is reciprocal — an unanswered annotation is ignored — so declaring
 * it per page would mean editing all six the day Spanish ships. In the sitemap
 * it is one file, and an English page's `<head>` never changes. `sitemapEntries`
 * emits nothing while `BUILT_LOCALES` holds one locale.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries();
}
```

- [ ] **Step 6: Build and read what came out**

```bash
ALLOW_LOCAL_API_BUILD=1 npm run build
cat out/robots.txt
cat out/sitemap.xml
```

Expected: `robots.txt` disallowing all five private prefixes and naming the sitemap absolutely; `sitemap.xml` holding exactly six `<url>` entries and **no** `<xhtml:link>` elements.

- [ ] **Step 7: Commit**

```bash
git add src/lib/routes.ts src/lib/routes.test.ts src/app/robots.ts src/app/sitemap.ts
git commit -m "A sitemap and a robots.txt, and hreflang has somewhere to live

hreflang is reciprocal, so per-page annotations would mean editing six heads
the day a second language ships. In the sitemap it is one file and an English
page's head never changes. It emits nothing at one built locale."
```

---

### Task 8: The Open Graph image

**Files:**
- Create: `scripts/build-og-image.mjs`
- Modify: `package.json` — add `assets:og`
- Create: `public/og-image.jpg` *(generated, and committed — see below)*

**Interfaces:**
- Consumes: `public/figma/hero-card.webp` (449×743), `public/figma/world-globe.webp` (1600×1215).
- Produces: `public/og-image.jpg` at 1200×630, referenced by `buildMetadata` from Task 5.

**A static file, not `ImageResponse`.** The image never varies, and `ImageResponse` would involve a runtime this export has no other reason to have. **Generated by a script rather than drawn by hand** so it can be regenerated when the artwork changes, and **committed** because the build must not depend on the script having been run.

- [ ] **Step 1: Write the script**

Create `scripts/build-og-image.mjs`:

```js
/**
 * Composites `public/og-image.jpg` — what a link to this site looks like in
 * WhatsApp, Slack, iMessage and every social card.
 *
 * **Artwork only, no text.** Every platform that renders this image renders
 * `og:title` beside it from the page's own head, so text baked in here would be
 * the title twice at two different sizes. It also avoids depending on the brand
 * faces being installed wherever this runs — Magically and Gill Sans are local
 * files this repository ships, not system fonts sharp could reach.
 *
 * Run with `npm run assets:og`. The output is committed: a build must not depend
 * on somebody having run this.
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;

/** `--color-night` in `globals.css`, sampled from the Figma solid-base fill. */
const NIGHT = { r: 8, g: 21, b: 37 };

/*
  `fit: "cover"` anchored to the bottom, rather than a resize plus a negative
  offset. sharp requires non-negative integers for `composite` placement, and
  the offset arithmetic that would put the horizon where the page puts it
  resolves to about -91. This gets the same picture — the sky low, bleeding off
  both edges — with nothing to get wrong.
*/
const globe = await sharp(await readFile("public/figma/world-globe.webp"))
  .resize(WIDTH, HEIGHT, { fit: "cover", position: "bottom" })
  .toBuffer();

const card = await sharp(await readFile("public/figma/hero-card.webp"))
  .resize({ height: Math.round(HEIGHT * 0.78), fit: "inside" })
  .toBuffer();

const { width: cardWidth } = await sharp(card).metadata();

const composed = await sharp({
  create: { width: WIDTH, height: HEIGHT, channels: 3, background: NIGHT },
})
  .composite([
    { input: globe, left: 0, top: 0, blend: "over" },
    // The card is centred rather than offset: a social card is cropped to a
    // square by some clients and to 1.91:1 by others, and centre survives both.
    { input: card, left: Math.round((WIDTH - cardWidth) / 2), top: Math.round(HEIGHT * 0.11), blend: "over" },
  ])
  .jpeg({ quality: 86, progressive: true })
  .toBuffer();

await writeFile("public/og-image.jpg", composed);

console.log(`public/og-image.jpg — ${WIDTH}x${HEIGHT}, ${(composed.length / 1024).toFixed(0)}kB`);
```

Add to `package.json` scripts, beside the other `assets:` entries:

```json
"assets:og": "node scripts/build-og-image.mjs",
```

- [ ] **Step 2: Run it**

```bash
npm run assets:og
```

Expected: a line reporting `1200x630` and a size **under 300kB** — several platforms refuse to fetch larger. If it is over, drop `quality` to 80 and re-run.

- [ ] **Step 3: Look at it**

Open `public/og-image.jpg`. **This is a visual check and it is the user's to make** — the card should be legible at thumbnail size, nothing important should sit within 40px of an edge, and the composition should survive a centre-square crop. Report what you see rather than assuming; if it needs recomposing, the two `top`/`left` expressions in the script are the levers.

- [ ] **Step 4: Confirm the built pages reference it absolutely**

```bash
ALLOW_LOCAL_API_BUILD=1 npm run build
grep -o 'og:image" content="[^"]*"' out/index.html
```

Expected: an absolute URL ending `/og-image.jpg`. A relative path here means `metadataBase` did not take, and every social platform would fail to fetch it.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-og-image.mjs package.json public/og-image.jpg
git commit -m "A link to this site stops rendering as a grey box

Artwork only, no text: every platform renders og:title beside the image from
the page's own head, so baked-in text would be the title twice. Committed
rather than generated at build, so a build never depends on the script."
```

---

### Task 9: Structured data

**Files:**
- Create: `src/lib/structured-data.ts`
- Create: `src/lib/structured-data.test.ts`
- Create: `src/components/seo/JsonLd.tsx`
- Modify: `src/app/(site)/readings/three-card/page.tsx`, `month-ahead/page.tsx`, `in-depth/page.tsx`
- Modify: `src/app/(site)/page.tsx`

**Interfaces:**
- Consumes: `SITE_NAME`, `canonicalFor` from `src/lib/seo.ts`; `ReadingPage` from `@/content/reading-pages` (type only).
- Produces: `readingJsonLd(...)`, `organizationJsonLd()`, `<JsonLd data={...} />`.

**The price here is the bundled USD figure and must stay that way.** It is baked at build time while the visitor may be seeing EUR from the currency selector. This reads like a bug and is not — a crawler gets one number and it must be a real one, and `reading-pages.ts` holds the canonical USD price.

- [ ] **Step 1: Write the failing test**

Create `src/lib/structured-data.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { organizationJsonLd, readingJsonLd } from "./structured-data.ts";
import { canonicalFor, SITE_NAME } from "./seo.ts";

const reading = {
  path: "/readings/month-ahead/",
  name: "Month Ahead Reading",
  description: "One month, five cards, a clear path ahead.",
  price: "$75",
};

test("a reading is a Product with one Offer", () => {
  const data = readingJsonLd(reading);

  assert.equal(data["@type"], "Product");
  assert.equal(data.name, "Month Ahead Reading");
  assert.equal(data.offers["@type"], "Offer");
  assert.equal(data.url, canonicalFor("/readings/month-ahead/"));
});

test("the price is the number without its glyph, and the currency is named beside it", () => {
  const { offers } = readingJsonLd(reading);

  assert.equal(offers.price, "75");
  assert.equal(offers.priceCurrency, "USD");
});

test("a price with separators survives the strip", () => {
  assert.equal(readingJsonLd({ ...reading, price: "$1,250" }).offers.price, "1250");
});

test("a price that is not a price is refused rather than emitted as nonsense", () => {
  assert.throws(() => readingJsonLd({ ...reading, price: "Free" }), /price/i);
});

test("the organisation names the site and its own home page", () => {
  const data = organizationJsonLd();

  assert.equal(data["@type"], "Organization");
  assert.equal(data.name, SITE_NAME);
  assert.equal(data.url, canonicalFor("/"));
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm test -- --test-name-pattern="Product with one Offer"
```

Expected: FAIL — `Cannot find module './structured-data.ts'`.

- [ ] **Step 3: Write `src/lib/structured-data.ts`**

```ts
import { canonicalFor, SITE_NAME } from "./seo.ts";

/**
 * Schema.org objects, as plain data.
 *
 * **Built here rather than inline in a page** so the shapes are testable — a
 * malformed `Product` is invisible on the page and silently ignored by every
 * crawler, which is the worst combination a thing can have.
 */

export type ReadingSeo = {
  /** The reading's own route, slashed. */
  path: string;
  name: string;
  description: string;
  /** The bundled display string, `"$75"`. See the note on currency below. */
  price: string;
};

/**
 * The bare number from a display price.
 *
 * **Refuses anything that is not one.** A `Product` whose `price` reads "Free"
 * or "" is worse than no structured data: it is a rich result quoting a figure
 * nobody is charging, which is the failure the **Money** discipline exists to
 * prevent, in the one place nobody would think to look at it.
 */
function priceAmount(display: string): string {
  const digits = display.replace(/[^0-9.]/g, "");

  if (!/^\d+(\.\d+)?$/.test(digits)) {
    throw new Error(`"${display}" is not a price, so no Offer can be built from it.`);
  }

  return digits;
}

/**
 * One written reading.
 *
 * **`priceCurrency` is USD and does not follow the currency selector.** This is
 * baked into the export at build time, while a visitor may be reading prices in
 * EUR from `lib/currency.ts`. The two cannot agree — there is one document and
 * many visitors — so this states the canonical figure from
 * `content/reading-pages.ts`, which is the one the backend seeds in USD.
 */
export function readingJsonLd({ path, name, description, price }: ReadingSeo) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url: canonicalFor(path),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      price: priceAmount(price),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: canonicalFor(path),
    },
  } as const;
}

/** The house itself, on the home page only. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: canonicalFor("/"),
    logo: `${canonicalFor("/")}og-image.jpg`,
  } as const;
}
```

- [ ] **Step 4: Run and watch them pass**

```bash
npm test
```

Expected: `# fail 0`, total risen to 336.

- [ ] **Step 5: Write the component**

Create `src/components/seo/JsonLd.tsx`:

```tsx
/**
 * A Schema.org block in the document.
 *
 * `dangerouslySetInnerHTML` is how a JSON-LD script is written in React and
 * there is no safer form — the content is a `<script>` body, so React's escaping
 * would corrupt it rather than protect it. What makes it safe here is the input:
 * every caller passes a literal built by `lib/structured-data.ts` from bundled
 * copy, never anything a visitor or the API supplied. The `<` escape guards the
 * one case that would still bite if that ever stopped being true — a `</script>`
 * inside a string ending the block early.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
```

- [ ] **Step 6: Mount it on the three reading pages**

In each of `three-card`, `month-ahead` and `in-depth`, add the import and render it as the first child of the returned fragment. `month-ahead/page.tsx`:

```tsx
import { JsonLd } from "@/components/seo/JsonLd";
import { readingJsonLd } from "@/lib/structured-data";
import { monthAhead } from "@/content/reading-pages";

// …inside the returned JSX, first child:
      <JsonLd
        data={readingJsonLd({
          path: "/readings/month-ahead/",
          name: monthAhead.title,
          description: monthAhead.tagline.join(" "),
          price: monthAhead.price,
        })}
      />
```

Use `threeCard` / `"/readings/three-card/"` and `inDepth` / `"/readings/in-depth/"` for the other two, importing whichever `ReadingPage` const that route already imports.

- [ ] **Step 7: Mount `Organization` on the home page**

In `src/app/(site)/page.tsx`, as the first child:

```tsx
      <JsonLd data={organizationJsonLd()} />
```

- [ ] **Step 8: Build and validate what came out**

```bash
ALLOW_LOCAL_API_BUILD=1 npm run build
node -e "const h=require('fs').readFileSync('out/readings/month-ahead/index.html','utf8');const m=h.match(/<script type=\"application\/ld\+json\">(.*?)<\/script>/s);console.log(JSON.stringify(JSON.parse(m[1]),null,2))"
```

Expected: a parseable `Product` with `offers.price === "75"` and `offers.priceCurrency === "USD"`. If `JSON.parse` throws, the escaping in `JsonLd` is wrong and nothing downstream will read it.

- [ ] **Step 9: Commit**

```bash
git add src/lib/structured-data.ts src/lib/structured-data.test.ts src/components/seo/JsonLd.tsx src/app
git commit -m "Three readings and the house describe themselves to a crawler

The Offer price is the bundled USD figure and deliberately does not follow the
currency selector: one document, many visitors, and a rich result quoting a
figure nobody charges is worse than no rich result. A price that will not parse
throws rather than emitting nonsense nobody would look at."
```

---

### Task 10: A 404 that is part of the site

**Files:**
- Create: `src/app/not-found.tsx`
- Reference: `src/app/(site)/layout.tsx`, `src/components/layout/PageAtmosphere.tsx`, `src/content/site.ts`

**Interfaces:**
- Consumes: `SiteHeader`, `SiteFooter`, `PageAtmosphere` (requires `variant: "hero" | "readings" | "reading"`), `ButtonLink` from `@/components/ui/Button`.
- Produces: nothing.

**The three APIs this uses, verified 5 September 2026** — an earlier draft of this task guessed all three wrong, so they are written out rather than left to be discovered:

- **`ButtonLink`, not `Button`.** `Button` renders a `<button>` and has no `asChild`; `ButtonLink` is the sibling that renders a `next/link` with the same `variant` and `size` props.
- **`PageAtmosphere` takes a required `variant`.** The values are `"hero" | "readings" | "reading"` and there is no default. `"hero"` portals a globe into `#hero-sky`, which this page does not render — **use `"readings"`**, the parlour, which is self-contained.
- **There is no `shell--narrow`.** The classes are `shell--copy`, `shell--hero`, `shell--measure`, `shell--page`, `shell--reading`, `shell--readings`. **Use `shell--copy`.** Do not add a class for this page.

**The export currently ships a bare `404.html`** that `wrangler.toml` points at via `not_found_handling = "404-page"` — no header, no footer, no way back.

`not-found.tsx` sits at `src/app/`, outside the `(site)` group, so it does **not** inherit `SiteLayout`. It renders the chrome itself. That is why this task references `(site)/layout.tsx` rather than modifying it: the `isolate` and `overflow-y-clip` on that column are load-bearing for `PageAtmosphere` and must be reproduced, not approximated.

- [ ] **Step 1: Write it**

```tsx
import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";

/**
 * The page behind `not_found_handling = "404-page"` in `wrangler.toml`.
 *
 * **It renders its own chrome.** `not-found.tsx` must sit at `src/app/` to be
 * the export's 404, which puts it outside the `(site)` route group and so
 * outside `SiteLayout` — the header and footer are not inherited here the way
 * every other page inherits them. The wrapper below reproduces that layout's
 * `isolate` and `overflow-y-clip`, both of which `PageAtmosphere` depends on:
 * `isolate` is what lets the artwork sit at `-z-10` without every section
 * needing a z-index, and the clip is what stops an atmosphere that hangs below
 * its content from lengthening the document past the footer.
 *
 * Copy is inline rather than in `content/`, and that is a deliberate exception
 * of exactly three strings — this page is not in the navigation document and has
 * no Figma frame. It joins `content/` when the message catalogue lands and it
 * needs translating; see `docs/plans/seo-and-translations.md`.
 */
export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-y-clip">
      {/* The parlour, not the hero: `variant="hero"` portals a globe into
          `#hero-sky`, and this page has no hero to render one. */}
      <PageAtmosphere variant="readings" />
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="shell--copy flex flex-col items-center gap-6 text-center">
          <p className="font-display text-h1 leading-none text-cream">This path is unwritten</p>
          <p className="text-body text-mist-dim">
            The page you were looking for is not here. The cards are, though.
          </p>
          <ButtonLink href="/readings/">GET MY READING</ButtonLink>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 2: Type-check, which is what proves the three APIs above**

```bash
npx tsc --noEmit
```

Expected: clean. A failure here means one of the three signatures in **Interfaces** has changed since 5 September 2026 — read the component rather than working around the error.

- [ ] **Step 3: Build and confirm the 404 is a real page**

```bash
ALLOW_LOCAL_API_BUILD=1 npm run build
grep -c "SiteFooter\|footer" out/404.html
node -e "console.log(require('fs').statSync('out/404.html').size + ' bytes')"
```

Expected: a footer present, and a file size comparable to other pages rather than the near-empty one it was.

- [ ] **Step 4: Look at it**

**The user's check, not yours.** Serve `out/` and visit a bad path:

```bash
npx serve out -p 4173
```

Then open `http://localhost:4173/no-such-page`. Confirm the header, atmosphere and footer render, and that nothing overlaps. Report rather than assume.

- [ ] **Step 5: Commit**

```bash
git add src/app/not-found.tsx
git commit -m "A lost visitor lands on the site rather than on a bare 404

not-found.tsx sits outside the (site) group, so it renders its own chrome —
including the isolate and overflow-y-clip that PageAtmosphere depends on and
that SiteLayout normally provides."
```

---

### Task 11: Verify the whole export, and close out

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/seo-and-translations.md` — a close-out section at its head

**Interfaces:** none.

- [ ] **Step 1: Everything green, from clean**

```bash
npm test
npm run check:config
npx tsc --noEmit
npm run lint
ALLOW_LOCAL_API_BUILD=1 npm run build
```

Expected: `# fail 0`; `8 of 8`; no type errors; no lint errors; a completed build.

- [ ] **Step 2: Walk the built export against the spec's own bar**

```bash
echo "--- robots"     && cat out/robots.txt
echo "--- sitemap"    && grep -c "<url>" out/sitemap.xml
echo "--- canonicals" && grep -rho 'rel="canonical" href="[^"]*"' out/*/index.html out/index.html | sort
echo "--- noindex"    && grep -rl 'name="robots"' out --include=index.html | sort
echo "--- og"         && grep -c 'property="og:' out/index.html
echo "--- jsonld"     && grep -rlc 'application/ld+json' out --include=index.html | sort
```

Expected, in order: five disallow lines and a sitemap URL; `6`; six canonicals, each absolute and slashed and naming its own page; the four noindex pages plus `/checkout-probe/`; a non-zero Open Graph count; JSON-LD on the home page and the three reading pages.

- [ ] **Step 3: Confirm nothing visible moved**

The spec's own review aid: **nothing in this plan changes what is on screen** except the new 404. Any visual difference on the home page, the readings index or a reading page is a bug introduced here.

```bash
npm run check:measure
npm run check:images
```

Expected: both as green as they were before this branch. If `check:measure` has drifted, the metadata refactor touched something it should not have.

- [ ] **Step 4: Record what shipped**

Add to `README.md`, after the "Checking the work" block:

```markdown
## Search, and what a shared link looks like

`src/lib/seo.ts` is the one rule: a route and a page name become a title, a
canonical, Open Graph and Twitter cards. Every page's `metadata` is a call to
`buildMetadata`, and `metadataBase` is set once on the root layout — it is what
makes the Open Graph image resolve absolutely, which every platform requires.

`src/lib/routes.ts` decides which routes a stranger should find.
`app/sitemap.ts` and `app/robots.ts` read it. **`hreflang` lives in the sitemap
rather than in each page's head**, because it is reciprocal: annotating per page
would mean editing all six the day a second language ships.

`NEXT_PUBLIC_SITE_URL` must be set per environment, like the API base beside it.
A production build with it unset is refused rather than allowed to emit
canonicals pointing at localhost.
```

- [ ] **Step 5: Close out the spec**

At the head of `docs/plans/seo-and-translations.md`, below the preamble:

```markdown
## Close-out — Phase 0 and Phase 1

**Shipped [date].** What deviated from the plan and why:

- **0.1 closed the guard's blind spot instead of raising an issue about it.**
  `assertOwnRegistrableDomain` refuses any API base outside `theworldtarot.com`,
  and `check:config` asserts it. Cheaper than the issue and permanent.
- **The test suite had never run.** `npm test` on Node 20 expanded no glob and
  stripped no types, so it found nothing and exited 0. Node 22 is pinned in
  `package.json`; all 316 existing tests passed the first time they executed.
  Every "**Done when:** `npm test` is green" in this repository's plan documents
  had been closing against an empty set.
- **`/redeem/` is indexable**, contradicting an earlier draft of §1.2 which
  disallowed it. The page's own docblock argues the opposite and is right.

Still owed: Phase 2, and spec §§0.4–0.5, which are a plan of their own.
```

- [ ] **Step 6: Commit**

```bash
git add README.md docs/plans/seo-and-translations.md
git commit -m "Phase 1 closed out, with what deviated and why

The one that matters for everything after this: npm test had never executed a
single file, so the gate several plans close against was passing over an empty
set."
```

---

## Self-Review

**Spec coverage.** Every Phase 0 (0.1–0.3) and Phase 1 item maps to a task: 0.1 → Task 3; 0.2 → Task 4; 0.3 → Task 2; 1.1 → Tasks 5–6; 1.2 → Task 7; 1.3 → Task 5 (`canonicalFor`, asserted in Task 6 step 9); 1.4 → Task 8; 1.5 → Task 9; 1.6 → Task 6 step 2; 1.7 → Task 10; 1.8 → Task 6 step 7. Spec §§0.4, 0.5 and Phase 2 are explicitly out of scope and named as a second plan.

**One task exists that the spec did not ask for:** Task 1, the Node pin. It is a prerequisite rather than scope creep — without it every TDD step in this plan is theatre, which is what the spec's own reliance on `npm test` assumed away.

**Type consistency.** `buildMetadata`, `canonicalFor`, `localePath`, `pageTitle`, `siteUrl`, `SITE_NAME` are defined in Task 5 and used under those exact names in Tasks 6, 7 and 9. `PUBLIC_ROUTES`, `PRIVATE_ROUTES` and `sitemapEntries` are defined in Task 7 and used there. `readingJsonLd` and `organizationJsonLd` are defined and consumed within Task 9. `ReadingSeo.price` is a display string in both the test and the implementation.

**Two steps deliberately hand the check to the user** rather than asserting a result: Task 8 step 3 (the OG image composition) and Task 10 step 4 (the 404 in a browser). Both are visual, and this repository's standing preference is that the user verifies visual work.
