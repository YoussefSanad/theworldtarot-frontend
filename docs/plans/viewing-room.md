# The Viewing Room

> **Written 22 October 2026.** The Viewing Room (Figma `384:2`, "VIEWING ROOM 10_16") — a portrait
> film player over the rotunda floor, a band of card thumbnails beneath it, and a paywall panel
> over the whole room for anybody who has not bought the pass.
>
> **This plan built the presentation first and the wiring second.** The client needed to see and
> approve the room before it was worth connecting to anything, so phase one took the deck from the
> cards already in this repo, played one bundled film for every card, and wrote the two seams that
> would later talk to the backend — the card list and the signed playback URL — to their real
> shapes, unwired.
>
> **Phase two is done, on 25 October 2026**, and both seams are live: the deck comes from
> `GET /{locale}/cards` and the film from `GET /{locale}/cards/{id}/video`. See *What phase two
> was* below for what changed and for the two items still open. Everything above that section
> describes the design and still stands; where it says the deck is bundled or a seam is stubbed,
> read it as the history it is.
>
> It also retires `/living-tarot`, a URL on three links in the masthead and footer that has never
> had a page behind it, and renames the nav item to VIEWING ROOM.

---

## What the frame shows

One artboard, 1920x2132, and reading it settles most of the design. Measured off the node tree
rather than off the screenshot, so every number below is the client's own:

| Block | Node | Position | Size |
|---|---|---|---|
| Background (two layers) | `384:3` | 0, 0 | 1920x2132 |
| Top text | `384:25` | 659, 102 | 613x108 |
| Main video | `384:24` | 703, 313 | **509x842** |
| Overlay (paywall panel) | `384:28` | 574, 604 | 772x713 |
| Thumbnails and viewing area | `384:12` | 0, 1211 | 1920x506 |
| Carousel button | `384:20` | 614, 1529 | 743x290 |
| Bottom CTA | `384:6` | 646, 1109 | 619x744 |

Four things in that table decide the build.

**The player is a tarot card, not a cinema screen.** 509x842 is 1:1.654, within a pixel of the
3:5 the deck is drawn at, and the same shape as `17-the-star-last.png` (1280x2120). The ticket's
wording — "cinematic proportions at every width, no letterboxing" — reads as 16:9 and is
misleading. **The constraint is the card aspect**, and it is the reason the bundled film drops
straight in: it was shot for this shape.

**The panel covers the player.** 772x713 centred at 574,604 sits over a player at 703,313 —
the panel's top edge is 291px below the player's, and it hides the bottom two thirds of the card
being sold. That is deliberate: the room is visible, the card is teasingly not.

**The thumbnail band is full-bleed and the cards are not.** The band (`384:13`) is 1920 wide at
29% opacity; the five cards sit between x=311 and x=1590, so there is a 311px margin either side
and 262px between card centres. Cards are ~228-232 x 377-384 — call it 230x380, the same 3:5.

**The client draws no masthead and no footer.** As with the Library and World Tarot frames. The
consequence is the one `library/page.tsx` already documents at length: her vertical budget ends at
her artboard, and the real page then puts a 522px footer underneath it. See *Vertical rhythm*
below, where this is spent rather than taken literally.

### The paywall panel, in full

The ticket says the PSD "does not draw" the payment step and that it needs client approval. **That
is wrong, and it is the most useful thing the frame settles.** `384:28` is a complete purchase
design:

| Element | Node | Detail |
|---|---|---|
| Panel art | `384:29` | 764x704 at 88% opacity, inset 4px |
| Outline | `384:44` | 772x713, drawn over everything |
| Heading | `384:43` | "Unlock the Viewing Room", 45px, `#f9f3d0` |
| Key divider | `384:40` | 452x38 ornament under the heading |
| Body | `384:42` | 32px/34px, `#f9f3d0`, 680 wide, centred |
| Three benefits | `384:37-39`, `384:34/35/41` | 18px/18px `#f9f3d0` captions under ~70px icons |
| Gold button | `384:30` | 470x66 |
| Button label | `384:33` | " ENTER THE VIEWING ROOM", Cinzel 30px, `#101b2e` |
| Keyhole mark | `384:36` | 17x29, inside the button's left end |
| Price | `384:32` | "$29 — One-time payment", 36px, white |
| Sign in | `384:31` | "Already Have Access? Sign in Here." 30px `#d4b06a`, second clause underlined |

The three benefits are **ALL 22 MAJOR ARCANA**, **LIFETIME ACCESS**, **MOTION, LIGHT & SOUND**, each
a two-line caption under its own icon (cards, infinity, star).

**What the panel does not have**, and both gaps are real work rather than oversights to copy:

- **No wallet row.** One gold button is the whole buy affordance. But Apple Pay *and* Google Pay
  were added to the reading pages on 29 August 2026 **at the client's request** (see the header of
  `components/reading/ExpressCheckout.tsx`), so she wants wallets. Resolved below as a second
  screen.
- **No way to switch account.** Section 1 of the ticket requires one for a signed-in visitor
  without the pass, and `API_CONTRACT.md` warns specifically about people paying under one account
  and signing in as another. There is nowhere in the frame for it. Resolved below, and flagged to
  the client.

There is also no close control, no back arrow and no dismissal affordance of any kind, which
**matches** the ticket: no Escape, no backdrop dismiss. There is nothing behind the panel to use.

### Copy, verbatim

Transcribed from the frame. Two artefacts are corrected and the correction is deliberate:
`384:8` reads "GET A  READING" with a double space, and `384:11` reads "stories.~ now" where the
`~` is a line break in her layout, not a character. Everything else is hers.

| Where | Words |
|---|---|
| Title | The Living Tarot |
| Subtitle | CINEMATIC TAROT CARDS AS MOVING ART |
| Above thumbnails | Click any card to experience the Living Tarot |
| Panel heading | Unlock the Viewing Room |
| Panel body | Enter a private viewing room for The Living Tarot — a cinematic art collection bringing all 22 Major Arcana to life through motion, atmosphere, light, and sound. |
| Button | ENTER THE VIEWING ROOM |
| Price | $29 — One-time payment |
| Sign in | Already Have Access? **Sign in Here.** |
| Closing | The cards can tell stories. / now let them tell yours. |
| Closing button | GET A READING |

---

## What this page is made of that already exists

The ticket reads as a large build. It is not, because six of its requirements are already solved
in this repo and the right move for each is to use what is there rather than write a second one.

| Requirement | What answers it |
|---|---|
| Three access states | `components/account/useSignedIn.ts` |
| HLS and MP4 playback, fatal-error channel | `lib/video-source.ts` — `attachVideoSource` |
| Auto-scrolling carousel, pause on interaction, reduced motion | `components/ui/Carousel.tsx` + `embla-carousel-auto-scroll`, **already configured** in `library/card/MetaStripCarousel.tsx` |
| Wallet row | `components/reading/ExpressCheckout.tsx` |
| Hosted checkout | `components/reading/HostedCheckoutButton.tsx` |
| Panel chrome | `components/ui/OrnateFrame.tsx` |

**`useSignedIn` is an exact fit and not a near one.** It returns `undefined` before `/me` answers,
`null` for signed out, and a `Customer` otherwise — which is the ticket's three states plus the
loading veil, with no mapping layer. It asks once per page load however many components ask, it
is a module store rather than component state, and it writes nothing to storage. `Customer`
already carries `hasViewingRoomAccess`, parked there with a comment saying it is for this page.

**`attachVideoSource` is better than the ticket knows.** It already has `onFatalError`, a second
channel for failures that arrive after `ready` resolved — which is exactly the "a segment 403s
twenty minutes in" case the expiry rules are about. Its own header names the CDN referrer risk this
page inherits. It takes the plain-file path for anything that is not `.m3u8`, so **the bundled MP4
and a real HLS URL go through the same call** and phase two changes a string, not a code path.

**`ExpressCheckout` and `HostedCheckoutButton` take clean props** — `productKey` and `money`, and
nothing about readings. `GetMyReading`, which composes them on the reading pages, is *not* reusable:
it is tangled with gifting, a question field, a `ReadingPage` object and container-query units tuned
to that panel's width. The two controls are the reuse; their arrangement is new.

So the genuinely new work is: the page and its layout, the modal (dialog semantics, focus trap,
inert room), the two-screen flow inside it, selection and race handling, the replay control, and
the responsive derivation.

---

## The room

### Route and entry points

A new `src/app/(site)/viewing-room/page.tsx`. `trailingSlash: true` is set, so the export is
`/viewing-room/` and **every link must carry the slash** or take a redirect hop.

Four links change, and three of them are dead today — `/living-tarot` has never had a page:

| File | Line | Now | Becomes |
|---|---|---|---|
| `content/site.ts` | 55 | `LIVING TAROT` → `/living-tarot` | `VIEWING ROOM` → `/viewing-room/` |
| `content/site.ts` | 118 | `Living Tarot` → `/living-tarot` | `Viewing Room` → `/viewing-room/` |
| `content/home.ts` | 23 | hero → `/living-tarot` | → `/viewing-room/` |
| `content/home.ts` | 155 | tile → `/viewing-room` | → `/viewing-room/` |

**No `/living-tarot` redirect page is built.** Nothing has ever linked there from outside, because
there has never been anything to link to. The label becomes VIEWING ROOM, which the client should
be told about: it takes her brand term out of the top-level nav while the homepage hero still says
"experience The Living Tarot". The page's own title keeps *The Living Tarot*, so the term survives
where it is doing work.

### Vertical rhythm

Her artboard ends at 2132 with 744px of bottom CTA and no footer under it. Spending that literally
stacks empty rotunda on top of the real 522px footer — the exact mistake `library/page.tsx`
describes and corrects. **Follow that precedent**: hold the composition down to the closing button,
then trim the room beneath it by eye against the rendered page, and record the trimmed number in a
comment at the call site so the next person moves a measured value rather than guessing.

### The player

A portrait 3:5 panel, `509/842` as an aspect ratio rather than fixed pixels, centred, constrained
with the site's container. States:

1. **Resting.** The selected card's `image`, with a play overlay. `preload="none"`.
2. **Loading.** Between the press and the first frame.
3. **Playing.** Plays once. No autoplay, ever, under any state.
4. **Ended.** Holds the final frame, with the replay control (below).
5. **Error.** A retry, after one silent recovery attempt.

The card's name sits beside the player if the frame supports it — `384:25` is a title block, not a
per-card label, so **there is no per-card name in the frame** and none is added. The ticket marks
this "optional, confirm against PSD"; the PSD says no.

### Replay

The frame has no post-playback state, because the ticket's author did not consider one either.
**This is a real gap**: the film ends, the last frame holds, and the only documented way back is to
select a different card and return. Watching the same card twice has no path at all.

A low-emphasis gold control over the held final frame, in the vocabulary the frame already uses
(the gold circular button at `384:23` is 43x43, which is the size to match). It is:

- **always rendered, never hover-gated.** Hover does not exist on touch and is invisible to a
  keyboard. It rests at low opacity and comes to full strength on hover **and** on focus.
- **at full strength on touch from the start**, via `(hover: none)`.
- **reusing the URL already in memory** when `expires_at` has not passed, so a replay inside the
  thirty minutes costs no request. Past it, fetch a fresh one. That is the expiry rule the ticket
  already states, triggered from a place it did not think of.

### The carousel

`Carousel` plus `embla-carousel-auto-scroll`. Five cards visible at 1920, the full deck scrolling
through — the band is a window on a longer strip, which is what continuous auto-scroll means.

**`library/card/MetaStripCarousel.tsx` has already solved this and is the model to follow.** Its
plugin configuration is the one this page wants, for reasons its header already argues: drift
rather than snap, `stopOnMouseEnter` and `stopOnFocusIn` for the pause, `stopOnInteraction: false`
so the strip is never left parked where a thumb abandoned it, and **the plugin simply not passed**
under reduced motion, which leaves a draggable strip that moves only when asked. The one thing to
re-tune is `speed` — 0.6 crosses a five-item meta strip in about a quarter-minute, and
twenty-two cards is a longer journey.

Two deliberate departures from that precedent, both because this strip is a set to choose from
rather than decoration: the selected thumbnail is marked, and the manual controls exist.

- Thumbnail is the card `image`, 3:5, explicit width and height so nothing shifts.
- Pauses on hover, focus and touch.
- The manual control is `384:23`, a 43x43 gold button on the dotted rule beneath the band. The
  frame draws one control with both arrows; it is built as **two buttons**, since one control
  cannot be a previous *and* a next to a screen reader.
- Lazy-loaded at the site's existing image conventions.
- Alt text: `"[Card Name] tarot card from The World Tarot"`.

### Selection

Clicking a thumbnail loads that card with its play overlay shown. If something is playing it stops
**before** the swap, not after. A new selection never autoplays.

**Race safety is the part that must not be approximated.** Every video-URL request carries an
`AbortController` and a request token; a selection change aborts the in-flight request and any
response whose token is stale is dropped on arrival. Rapid switching must never play the wrong
film, and this is tested in `npm test` rather than by hand — it is logic, it has no DOM, and it is
the single most likely thing to regress silently in phase two.

Cards with `in_viewing_room: false` render as **coming soon**: visible, not selectable, announced
as such.

---

## The paywall modal

### States

`useSignedIn` gives the three directly:

| `useSignedIn` | State | What shows |
|---|---|---|
| `undefined` | Still asking | Room renders, under a brief veil. No modal. |
| `null` | Signed out | Panel with ENTER THE VIEWING ROOM and "Sign in Here." |
| `Customer`, `hasViewingRoomAccess: false` | No pass | Panel, plus the account line and a way to switch |
| `Customer`, `hasViewingRoomAccess: true` | Member | No modal, no veil, no flash |

**A member must never see a frame of the modal.** The veil covers the gap before `/me` answers;
the modal is rendered only once the answer is known and is negative.

### The second screen

Screen one is the frame, built as drawn. Pressing ENTER THE VIEWING ROOM **swaps the panel body in
place** — the ticket's journey ("the payment step appears in place"), and the reason the frame
needs no second drawing:

- `ExpressCheckout` with `productKey="viewing-room-pass"`, which the catalogue carries as
  `type: "pass"` and which `content/home.ts:150` already keys the homepage tile to.
- `HostedCheckoutButton` beneath it, same key and money.
- The price line and a way back to screen one.

The panel keeps its outline, heading area and ornament so the swap reads as one panel changing
rather than a second dialog opening. **Gifting is not offered.** The pass can be bought once and
never expires; `API_CONTRACT.md` makes buying it twice a 422, and a gifted pass has no redemption
path built.

**This screen is ours, not hers, and the client must approve it.** It is an arrangement of two
controls she has already signed off, which is a far smaller ask than a new payment design — but it
is still a screen she has not seen.

### Switching account

For the no-pass state only: the signed-in address and a control to sign out and use another. It
goes near the sign-in line at the panel's foot, in that line's type. Minimal by design — it exists
because the contract warns about it, not because the frame asked for it — and flagged to the client
as an addition.

### Dialog behaviour

- `role="dialog"`, `aria-modal`, labelled by the heading, initial focus inside, focus trapped.
- **No Escape, no backdrop dismiss.** There is nothing usable behind it.
- The room container takes `inert`, with `aria-hidden` as the fallback. Body scroll locked.
- **`inert` is presentation and never the gate.** With it deleted in dev tools the video endpoint
  still refuses. A test proves a play attempt without access shows the modal and renders no video
  source — that test is written in phase one even though the refusal arrives in phase two, because
  it is asserting our behaviour, not the backend's.

### Mid-visit changes

A 401 on a video request shows the signed-out modal. A 403 shows the no-pass modal. A 404 marks
that card coming soon. None of them shows a broken player. After a purchase or a sign-in the modal
clears without a reload, because `useSignedIn` publishes to every subscriber.

**On 403 in practice:** `has_viewing_room_access` looks one-way — the pass never expires and can
only be bought once — so a live `true → false` needs a refund or an admin revoking it. The handler
is written because the contract specifies it and because trusting a cached `true` is the mistake
`session.ts` warns against in its own header, but it gets a correct plain handler rather than a
designed experience.

---

## What is scaffolded, and what that means precisely

Phase one is for the client's eyes. Two seams are therefore written to their real shapes and left
unwired, and **the distinction between them matters**:

**The card list is faked with real data.** A `viewingRoomCards` list in `content/`, all twenty-two,
each using the card art already in this repo. A few are marked `in_viewing_room: false` **on
purpose**, so the coming-soon treatment is reviewed now rather than discovered after wiring. The
page consumes `TarotCard[]` — the type `content/cards.ts` already defines and `api.ts` already maps
the wire shape into via `toTarotCard` — and takes it as a prop from one call site. Phase two changes
that call site.

**The video seam is stubbed, not faked.** `fetchVideoUrl(id)` is written with its real signature,
`AbortSignal`, and its 401/403/404 mapping as types. In phase one it resolves to the bundled film.
It is **never given a local URL dressed up as a signed one**, and nothing is ever persisted, because
a component that learns to treat a playback URL as an ordinary string is a component that will keep
doing so when the string becomes a credential.

**A dev-only state switch.** `?state=signed-out|no-pass|member`, honoured only outside production,
so all three states can be seen and screenshotted without a session. Without it the signed-out modal
is the only reachable state and the member's room cannot be reviewed at all.

Known limits of the scaffold, to say out loud at handover: **every card plays the same film**, so
switching cards replays The Star; and the one bundled file is 19MB, which is fine for one cached
file and is not what twenty-two will look like.

### What phase two was — **done, 25 October 2026**

Listed here when it was still ahead, so the seam was not mistaken for the whole. What landed:

- **`fetchCards()` in `api.ts`**, answering the wire shape. `ApiCard` is exported and is now the
  *listing* shape — it no longer declares `video`, and `poster` is gone rather than optional; the
  draw extends it as `ApiDrawnCard`, which is the only response that carries a credential. The
  types were the wrong way round before: the listing was `Omit<ApiCard, "video">`, which read as
  though a card ordinarily came with a playback URL.
- **`fetchVideoUrl` pointed at `/{locale}/cards/{id}/video`**, with `credentials: "include"` —
  which is what makes it the access check — and `cache: "no-store"`. Refusals throw
  `PlaybackRefused`, carrying the `playbackFailure` property `FilmPlayer` was already written to
  read and which nothing had ever set.
- **The deck is fetched in the browser**, through `useViewingRoomDeck` in `lib/viewing-room-deck.ts`,
  and `content/viewing-room.ts` no longer holds a deck at all. **The API is the only source**: the
  derivation from `content/library.ts` and its hand-picked `FILMS_NOT_READY` set are both gone.
- **Card identity is the backend's integer**, not the Library's slug. The contract is explicit that
  a card has no slug, so the integer is the only handle — and it is what the video endpoint is
  addressed with.
- **Three deck states the frame never drew**: loading, empty and unreachable, with words in
  `content/viewing-room.ts` and a retry on the last one only. An empty deck is the backend's
  considered answer and asking again will not finish a film.

Two things deliberately **not** done, and they are the open items:

- **The dev `?state=` switch is kept.** The plan said to delete it. It is still the only way to see
  the member's room without a real pass on staging, it only chooses which panel is drawn, and the
  video endpoint refuses regardless. Delete it once a pass can be bought on staging.
- **`Referrer-Policy: no-referrer` has not been checked on the deployed headers.** Bunny answers
  403 with no referrer, measured, so this must not be set on this page or by a host default. It
  cannot be verified from here — it needs a look at the deployed response.

---

## Responsive

No mockups exist below 1920, so these are derived. The atmosphere is the thing to preserve:
background treatment, gold accents, spacing rhythm, type hierarchy.

**Tablet** holds the desktop composition — player centred, band beneath — with fewer thumbnails in
view and the panel narrowing before it is restyled.

**Mobile** stacks: player, then carousel, with controls in thumb reach. The player keeps 3:5, and
**that is the constraint to watch**: a 3:5 portrait at 390px wide is 650px tall and will push the
carousel off-screen. Cap the player's height in the viewport (`max-height` in `dvh`) and let it
narrow rather than letterbox.

The modal becomes a full-width sheet: nothing clipped by browser chrome or the keyboard, buttons
reachable, and the benefit row stacking before it crowds. The second screen matters more here than
on desktop, because a wallet sheet on a phone is the likeliest way this page takes money.

Fluid type and spacing between breakpoints, tap targets 44px or more, no horizontal page scroll,
no cropped cards. Reviewed and polished at 360, 390, 430, 768, 1024 and 1280+.

Tab minimised and restored: a clean play state or a resume, with a fresh URL if the old one expired.

---

## Accessibility

Keyboard-operable player, carousel and modal, with visible focus throughout. Meaningful labels on
play, replay, the two carousel buttons and every thumbnail. Coming-soon cards announce as such. Alt
text is `"[Card Name] tarot card from The World Tarot"`. The carousel's auto-scroll is off under
`prefers-reduced-motion`, not merely slower.

---

## Testing

Per `AGENTS.md`:

- **`npm test`** for the logic, which is where the risk is: access-state mapping, the request-race
  guard, and URL-expiry refresh. All three are pure and testable without a DOM.
- **`npm run lint`.**
- **`scripts/check-viewing-room.mjs`**, a browser check against `out/` with a faked API, following
  `check-login.mjs` as its model: signed-out, no-pass, member, a coming-soon card, an expired URL
  and rapid switching.

---

## Acceptance

- Desktop matches the frame. Tablet and mobile are polished and keep its feel.
- The deck renders from a single list passed at one call site, so phase two is that call site.
- Signed-out and no-pass visitors see the room behind a panel they cannot interact past. Members
  see no modal and no flash of one.
- With `inert` removed by hand, no video plays.
- No video URL in the page source, the initial payload, or any storage.
- Nothing is requested until a member presses play, and only for the selected card.
- Plays once, holds the last frame, replay works by pointer, keyboard and touch; switching stops
  playback; rapid switching never plays the wrong film.
- The carousel auto-scrolls, is manually controllable, and pauses on interaction.
- No horizontal scroll and no cropped cards on mobile.
- Keyboard and screen-reader basics work, including the modal.

---

## For the client, at handover

Three things she has not seen and should be asked about:

1. **The modal's second screen** — the wallet step behind her gold button. Her controls, our
   arrangement.
2. **The switch-account line** in the no-pass state, which her panel has no room for and the
   backend contract specifically warns is needed.
3. **The nav rename**, LIVING TAROT to VIEWING ROOM, which takes her term out of the masthead while
   the page title and homepage hero keep it.

Plus the two scaffold limits above — one film for all twenty-two cards — so nothing in the review
is mistaken for a bug.
