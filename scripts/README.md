# Scripts

Three different jobs live under this folder's `npm run` scripts, and they are
not equally available in a fresh checkout.

## Checks that need no browser

These read files and exit. Nothing to serve, nothing to launch.

- `check:translations` — walks `src/content/locales/`, reports every value in a
  language still identical to its English counterpart, and fails on a key that
  is missing or extra. **Untranslated is not a failure** — at handover every
  string is, which is the correct state. See
  [`../src/content/locales/README.md`](../src/content/locales/README.md).
- `assets:og` — recomposites `public/og-image.jpg` from artwork already in
  `public/figma`, with `sharp`. The output is **committed**, so a build never
  depends on this having been run; the script exists for when the artwork
  changes. It is deterministic — running it on unchanged sources produces a
  byte-identical file, which is worth knowing when a diff looks alarming.

## QA scripts (committed, always available)

`measure.mjs`, `shoot.mjs`, `check-images.mjs`, `check-reveal.mjs` — all
Playwright, all assume `npm run dev` is already running on
`http://localhost:3000`. They exist because this layout was matched to Figma
numerically, not by eye (see
[`../src/app/README.md`](../src/app/README.md)):

- `check:measure` — prints rendered bounding boxes for key elements plus
  section-band heights, next to the equivalent Figma numbers, so a layout
  change can be checked against the frame instead of squinting at it.
- `check:shoot` — section-by-section (or `--full`) screenshots into
  `.screens/` (gitignored) for a visual diff pass.
- `check:images` — flags any `<img>` that failed to load or rendered at
  `0x0`, e.g. after an asset gets renamed in `src/lib/assets.ts` without
  updating `public/`.
- `check:reveal` — walks the full reveal interaction (idle → click →
  revealed → reload → restored) and asserts on the DOM/opacity state at each
  step. Prefers a system Chrome install over Playwright's bundled Chromium
  because that Chromium build has no H.264 decoder and the card-back video
  won't play without one — if this script errors on video playback, check
  which browser it actually launched in its first log line.

Four more are Playwright too, but drive the **built export** rather than
`next dev`, because what they exercise only exists after `npm run build`:

- `check:panel` — the payment panel's four states and the wallet row. Silent
  for about seven minutes; it is the user's to run, not something to reach for
  casually.
- `check:confirmation` — `/checkout/complete/` through every payment outcome.
- `check:redeem` — `/redeem/` through every state a gift code can be in.
- `check:login` — the sign-in road.
- `check:currency` — the currency control, against stubbed endpoints.

Run the relevant one after any change to hero layout, image assets, or the
reveal state machine.

**Two of `check:measure`'s selectors match nothing** and print `missing` rather
than a box — `footer` and `productFrame`. Selector rot rather than layout
faults; the root README has the detail.

## Asset pipeline scripts (local-only, not in this repo)

`package.json` also defines `assets:fetch`, `assets:optimize` and
`assets:media`, pointing at `scripts/fetch-figma-assets.mjs`,
`scripts/optimize-figma-assets.mjs` and `scripts/stage-media.mjs`. **Those
three files do not exist here** — they're deliberately listed in
`.gitignore` ("asset pipeline — local-only; QA check scripts stay in the
repo"). They were the one-off tooling that pulled exports from Figma, baked
per-layer opacity into each webp's alpha channel (referenced in
`globals.css`'s `.page-atmosphere` comment), and staged client-supplied video
into `public/videos`, run locally against Figma/Dropbox credentials that
have no reason to be in version control.

If you need to re-run that pipeline — new Figma exports, or staging more of
the client's Living Tarot videos — you'll need the original scripts from
whoever ran them last; don't try to reverse-engineer replacements from
`public/figma`'s output alone. If you're an agent and a task asks you to run
`npm run assets:fetch`, expect it to fail with "file not found" — that's
this, not a broken checkout.
