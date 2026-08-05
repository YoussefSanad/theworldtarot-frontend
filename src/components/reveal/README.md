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
  The swap is keyed to `revealing` — **the click itself**, not the end of the
  card's crossfade — so the press is answered immediately instead of a second
  and a half later. (It was keyed to `revealed` until the 08/03 revision; if
  you are reading old commits or the 08/01 client notes, that is why the button
  used to sit there through the whole fade.) The button also has no enter
  animation: it is the hero's primary ask, so it paints already in place.
  What still waits for the crossfade is the *commit* — `onRevealComplete`,
  and with it the sessionStorage write and `HeroActions`' pulse.
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

A restored visit renders `card.image` instead, which avoids re-downloading the
film on every page view in the session just to seek it to the end (which is what
the pre-`10ad8ee` implementation did).

For a card from the API that still is the **poster frame**, not the film's
closing frame, so a restored visit is no longer pixel-identical to the state the
visitor left. Taken deliberately on 5 August 2026: a second per-card upload is a
lot of the client's time for one restored-visit state. The bundled fallback card
keeps its true closing frame.

There is also no choice about it. The playback URL is a credential that expires
in two hours and must never be stored, so nothing about the film survives a
reload even if we wanted it to.

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

**`ready` now has a second condition, and only for a returning visitor.** The
stored card used to resolve synchronously against the bundled deck; it now takes
a request to `GET /cards/{id}`, so a visitor with a stored id also waits for that
to settle or the button flashes and swaps, which is the exact thing this gate
exists to prevent. A first-time visitor has no stored id and waits for nothing,
so the hero's primary ask still paints immediately. The draw itself is never
waited on: it is issued on mount and lands long before anyone reads the hero and
clicks.

## Where the card comes from

`RevealProvider` draws it from the backend on mount, through `drawCard()` in
[`@/lib/api`](../../lib/api.ts). `GET /api/v1/{locale}/cards/draw` returns a
random card **and a signed film**. A restored visit calls `GET /cards/{id}`
instead, which returns the card and no film, because a restored visit shows the
still and has nothing to play.

**Three rules come with that URL, and each one fails as a bare 403:**

1. **The film is signed against the viewer's IP address.** It works for the
   person who asked for it and for nobody else
2. **It must be fetched in the browser, never on a server or at build time.** A
   server-side fetch binds the token to that machine and then refuses every real
   visitor, while working perfectly wherever it was tested. This app is a static
   export and has no server, which is the only reason it is currently safe.
   Moving the draw into a server component would break playback for everyone
3. **It cannot be opened in a browser tab.** The CDN refuses requests carrying no
   referrer, which is exactly what pasting a URL into the address bar produces.
   Never set `Referrer-Policy: no-referrer` on a page that plays video

`NEXT_PUBLIC_API_BASE_URL` must point at a **deployed** backend even in
development, for rule 1: a local backend sees `127.0.0.1` while your browser
reaches the CDN from your public address.

### It is HLS, not a file

What this section used to say was that `TarotCard.video` is "deliberately a plain
URL string so a remote URL drops in without touching a component". True of an
MP4, **false of what the API returns**.

Safari plays an `.m3u8` from `src` like anything else. Chrome and Firefox do not
and need Media Source Extensions driven by a library.
[`attachVideoSource`](../../lib/video-source.ts) picks the path and imports
`hls.js` on demand, so Safari never downloads a byte of it. The bundled fallback
is still an MP4 and takes the plain path.

Playback also waits for the manifest before calling `play()`. Playing earlier
does nothing, and spends the click that permitted sound.

**`hls.js` is preferred wherever Media Source Extensions exist, even when the
browser claims it can play HLS itself.** Chrome on macOS answers `"maybe"` to
`canPlayType("application/vnd.apple.mpegurl")`, so trusting that check hands
playback to a native player we cannot configure, on the platform where we most
want to configure it. That is not hypothetical: it is what happened here, and it
silently turned every setting below into dead code while still appearing to
work. Only the iPhone, which has no MSE, takes the native path.

### Warming, and why the opening seconds used to look soft

Adaptive streaming opens cautiously and climbs as it measures the connection. For
a stream that starts at the moment of the click, that climb happens underneath
the crossfade, so the card arrives at the worst quality the film has. It opened
at **240p** on a fast connection.

Three things fix it, all in [`video-source.ts`](../../lib/video-source.ts):

- **The film is fetched on hover, focus or `pointerdown`**, not on click, through
  `warm()` on the context. Intent arrives before the press, and those few hundred
  milliseconds are the whole difference
- **The opening rendition is chosen, not guessed**, matched to the card's
  rendered size. Only the first fragment is pinned; everything after is chosen by
  measurement, so a slow connection drops back immediately
- **Quality is capped to the player's size** and **loading stops once warm**.
  Without the cap a fast connection climbs to 1080p for a panel a few hundred
  pixels wide. Without the stop it quietly buffers the whole film for somebody
  who only hovered, which is a smaller version of the 230MB page load this
  project exists to fix

Measured in Chrome against staging:

| | opening | click to playing | fetched before the click |
|---|---|---|---|
| before | 240p, 212x352 | 488ms | none |
| cold click | 360p, 386x640 | 558ms | none |
| hovered first | 360p, 386x640 | **52ms** | 3 segments, 0.8MB |

Warming is skipped entirely on Data Saver or a 2G-class connection, where
spending bandwidth on a maybe makes the page worse rather than better.

### The fallback is load-bearing

`defaultRevealCard` still shows The Star, and it is no longer a placeholder. It
takes over when the API cannot be reached, and when the API 404s because no card
yet has both a finished film and a poster frame.

The backend deliberately has no fallback of its own, so without this the hero of
the homepage would be an error state until the client's films are uploaded. It is
loud in the console and invisible to the visitor.

`findCard(id)` still resolves a stored session id against the bundled deck, which
is what a restored visit falls back to when the API is unavailable.

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
