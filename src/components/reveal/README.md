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
  `revealed` and persists the card id. Swaps for the card's number + name and a
  prompt question in the same footprint via `AnimatePresence mode="wait"`.
  The swap is keyed to `revealed`, **not** `revealing` — the client asked for
  the button to give way only once the card's crossfade has finished, so the
  stage is what drives this component's timing.
- **`RevealStage.tsx`** — the card itself. A looping back-of-card `<video>`
  and the revealed card share one `.stack` grid cell (see
  [`src/app/README.md`](../../app/README.md)) and crossfade opacity, so
  nothing on the page moves when the face appears. A still poster frame sits
  above the back video and fades out once it actually has decoded pixels —
  without it, a slow connection can crossfade onto a black frame.
- **`HeroActions.tsx`** (in `components/home`) — not part of the reveal
  proper, but it reads `useReveal()`: once `revealed`, the hero's two ghost
  buttons take the `pulse-glow` animation and the return prompt fades in
  under them.

## The revealed card is a video, and a still

The face is a `<video>` that plays once and is **not** looped, so it holds on
its closing frame — that is where the card is meant to stay for the visit.

A restored visit renders `card.image` instead. That still *is* the video's
closing frame, so it is visually identical to the state the visitor left, and
it avoids re-downloading ~19MB of MP4 on every page view in the session just to
seek it to the end (which is what the pre-`10ad8ee` implementation did).

This flipped twice: `10ad8ee` replaced the video face with a still image
outright, and the client has since reversed that. If you are wondering why
`TarotCard` carries both `video` and `image`, this is why — they are the two
halves of the same card, not a leftover.

## `ready` and hydration

`RevealProvider`'s `oncePerVisit` mode gates rendering the idle button behind
`ready`, a `useSyncExternalStore` flag that is `true` synchronously on the
client and `false` during SSR. Without this gate, a returning visitor would
see a flash of the "REVEAL YOUR CARD" button before the sessionStorage read
resolves and swaps it for the card name. `oncePerVisit={false}` (used
anywhere else the trigger appears, e.g. a future paid reading flow) skips the
gate entirely — `ready` is always `true`.

## Adding the rest of the deck

Only **The Star** is wired up right now, so the client's "a random video
plays" is a no-op until the rest arrive — worth saying out loud before anyone
tests for randomness that cannot happen yet.

The card videos are to be served from a **backend endpoint** rather than
`public/`. `TarotCard.video` is deliberately a plain URL string so a remote URL
drops in without touching a component; the seam is `RevealProvider` choosing
the card (today always `defaultRevealCard`), which is what will do the fetch.
`findCard(id)` already exists for turning a stored session id back into a
`TarotCard`, which both the random-pick and restored-visit paths need.

The file currently in `public/videos` is the placeholder that stands in until
that endpoint exists.

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
