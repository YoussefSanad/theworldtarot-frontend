# The Reveal

The homepage's one free look at The Living Tarot: a looping card back that the
visitor clicks, which crossfades into a card face and stays revealed for the
rest of the browser session.

This is not incidental interaction polish — it is a deliberate product
constraint from the client. The homepage reveal exists to preview the paid
experiences (One Card Reading, Viewing Room), so a visitor must not be able to
keep re-rolling for a different card. The two designs this had to satisfy at
once:

1. **One card per visit.** Enforced by writing the revealed card's id to
   `sessionStorage` (`wt.reveal.card`, via [`createSessionValue`](../../lib/session-value.ts))
   the moment the crossfade finishes, and reading it back on every render.
2. **A disabled button reads as broken.** Early scope had the trigger simply
   grey out after the first reveal. That was flagged during scoping because a
   greyed-out control next to a feature that still "works" on refresh reads as
   a bug report waiting to happen. The fix implemented here: a visitor who
   already saw their card this visit never sees the button at all — the page
   replays the same crossfade straight into the card name on load
   (`restored` in [`reveal-context.tsx`](./reveal-context.tsx)). There is
   nothing to look broken because there is nothing disabled.

## Pieces

- **`reveal-context.tsx`** — `RevealProvider` / `useReveal`. Owns the
  `idle → revealing → revealed` state machine and the sessionStorage read/write.
  The trigger and the stage live in different grid columns of the hero (and
  will be arranged differently again in the One-Card Experience), so this is a
  context rather than a single self-contained widget.
- **`RevealTrigger.tsx`** — the gold button. Click sets `revealing`; once the
  stage's crossfade completes it calls `onRevealComplete`, which commits
  `revealed` and persists the card id. Swaps for the card's name + a prompt
  question in the same footprint via `AnimatePresence mode="wait"`.
- **`RevealStage.tsx`** — the card itself. A looping back-of-card `<video>`
  and the revealed-card `<img>` share one `.stack` grid cell (see
  [`src/app/README.md`](../../app/README.md)) and crossfade opacity, so
  nothing on the page moves when the face appears. A still poster frame sits
  above the video and fades out once the video actually has decoded pixels —
  without it, a slow connection can crossfade onto a black frame.

## `ready` and hydration

`RevealProvider`'s `oncePerVisit` mode gates rendering the idle button behind
`ready`, a `useSyncExternalStore` flag that is `true` synchronously on the
client and `false` during SSR. Without this gate, a returning visitor would
see a flash of the "REVEAL YOUR CARD" button before the sessionStorage read
resolves and swaps it for the card name. `oncePerVisit={false}` (used
anywhere else the trigger appears, e.g. a future paid reading flow) skips the
gate entirely — `ready` is always `true`.

## Adding the rest of the deck

Only **The Star** is wired up right now. The client is supplying all 22
Living Tarot MP4s (see [`src/content/README.md`](../../content/README.md)) —
when they land, extend `livingTarot` in
[`src/content/cards.ts`](../../content/cards.ts) and have `RevealProvider`
pick a card at random on mount instead of always taking
`defaultRevealCard`. `findCard(id)` already exists for turning a stored
session id back into a `TarotCard`, which is what a random-pick implementation
will need for the restored-visit path.

## A second, parallel copy exists

[`src/components/concept/reveal`](../concept/reveal) is **not** a re-export
of this folder — it is a deliberately separate copy with its own state model,
built for the `/concept` route's sunrise-atmosphere experiment. See that
folder's README before assuming the two can be merged.

## Verifying changes

`npm run check:reveal` drives the whole interaction with Playwright — idle
label, crossfade timing, restored-on-reload — against a running
`npm run dev` server. Run it after touching state transitions here; the
timing constants (`REVEAL_CROSSFADE_SECONDS`, `STILL_HANDOFF_SECONDS`) are
tuned to specific waits in that script.
