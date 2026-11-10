# Viewing Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/viewing-room/` page — a portrait film player, an auto-scrolling thumbnail carousel of the deck, and a two-screen paywall modal over an inert room — as reviewable presentation, with the backend seams written to their real shapes and left unwired.

**Architecture:** A client component tree under a new static route. Access state comes from the existing `useSignedIn` store, which already returns exactly the three states needed. Playback goes through the existing `attachVideoSource`, which takes the plain-file path for the bundled MP4 and the HLS path for a real signed URL, so phase two changes a string rather than a code path. The deck is a local list of all twenty-two cards passed in at one call site; the video seam is a stub with its real signature. Three pure modules — access state, the request-race guard, URL expiry — carry the logic and are tested under `node --test` without a DOM.

**Tech Stack:** Next.js (static export, `output: "export"`, `trailingSlash: true`), React, TypeScript, Tailwind, Embla (`embla-carousel-auto-scroll`), `node:test` + `node:assert/strict`, Playwright for the browser check.

**Spec:** `docs/plans/viewing-room.md`

## Global Constraints

- **Phase one is presentation.** No task wires a real backend endpoint. `fetchCards` and `fetchVideoUrl` are written to their real shapes and stubbed; phase two is a separate issue.
- **Never persist a playback URL.** No `localStorage`, no `sessionStorage`, no service worker, no store written to disk. `Cache-Control: no-store` is respected and restated on every fetch.
- **No autoplay, ever**, in any state, on any breakpoint.
- **`inert` is presentation and never the gate.** Every access decision is re-made by the backend in phase two; the UI never treats its own state as enforcement.
- **The player, thumbnails and bundled film are all 3:5** (1:1.654 ± 0.004). Use the aspect ratio, never fixed pixel heights.
- **Trailing slashes are mandatory on internal links**: `/viewing-room/`, not `/viewing-room`.
- **Copy is verbatim from the spec's copy table.** Two corrections are deliberate and already applied there: `GET A READING` (single space) and the closing line's `~` as a line break.
- **Colours from the frame:** `#f9f3d0` (panel text), `#d4b06a` (sign-in link), `#101b2e` (gold-button label), `#b1b2b2` (carousel hint).
- **Tests import with `.ts` extensions** (`from "./access-state.ts"`), per this repo's `node --test` resolver.

## Review Focus

Five conditions the spec implies that no feature task would naturally exercise. Each has its test added to the task that owns the code.

1. **`/me` never answers** (API down, offline). The veil must not trap the room forever — resolve to signed-out and show the modal rather than spinning. *(Task 2)*
2. **A card is selected while its video URL request is still in flight, twice in a row.** The second abort must not resurrect the first response. *(Task 3)*
3. **`expires_at` is already past when play is pressed** (tab backgrounded for an hour). Must refetch before playing, not play a dead URL and recover. *(Task 4)*
4. **A locked (`in_viewing_room: false`) card is reached by keyboard** rather than clicked. It must not be focusable-and-silent — it announces as coming soon and does not load. *(Task 7)*
5. **The modal is open and the viewport is 360px with the on-screen keyboard up.** The gold button must stay reachable, not clipped below browser chrome. *(Task 11)*

---

## File Structure

**Pure logic** (tested under `node --test`, no DOM):

| File | Responsibility |
|---|---|
| `src/lib/viewing-room-access.ts` | Maps `useSignedIn`'s snapshot to one of four access states |
| `src/lib/video-request.ts` | The request-race guard (`AbortController` + token) and expiry check |
| `src/lib/viewing-room-video.ts` | The `fetchVideoUrl` seam — real signature, stubbed body |

**Content:**

| File | Responsibility |
|---|---|
| `src/content/viewing-room.ts` | All copy from the frame, plus the twenty-two-card deck list |

**Components** (`src/components/viewing-room/`):

| File | Responsibility |
|---|---|
| `ViewingRoom.tsx` | Composition root: owns selection, holds access state, applies `inert` |
| `FilmPlayer.tsx` | The 3:5 player and its five states |
| `ReplayControl.tsx` | The post-playback control |
| `ThumbnailCarousel.tsx` | Embla strip, auto-scroll, manual buttons |
| `PaywallModal.tsx` | Dialog shell: focus trap, scroll lock, screen switching |
| `UnlockPanel.tsx` | Screen one, exactly as drawn |
| `PaymentPanel.tsx` | Screen two: wallets + hosted checkout |
| `AccountLine.tsx` | The switch-account line for the no-pass state |

**Route:** `src/app/(site)/viewing-room/page.tsx`

**Modified:** `src/content/site.ts` (nav + footer), `src/content/home.ts` (hero + tile)

**Check:** `scripts/check-viewing-room.mjs`

---

### Task 1: Route, nav rename, and the copy module

Lands a reachable page and fixes four links, three of which are dead today. Nothing visual yet — this is the skeleton everything else hangs on.

**Files:**
- Create: `src/app/(site)/viewing-room/page.tsx`
- Create: `src/content/viewing-room.ts`
- Modify: `src/content/site.ts:55`, `src/content/site.ts:118`
- Modify: `src/content/home.ts:23`, `src/content/home.ts:155`
- Test: `src/content/viewing-room.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: from `@/content/viewing-room` — `viewingRoom` (the copy object), the type `ViewingRoomCard`, and `viewingRoomDeck: ViewingRoomCard[]`. **Not `TarotCard`**: that type's `number` is the Roman numeral string for display, and this page needs the integer to sort by, so `ViewingRoomCard` carries both (`number: number`, `numeral: string`) plus `inViewingRoom`.

- [ ] **Step 1: Write the failing test**

```ts
// src/content/viewing-room.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { viewingRoom, viewingRoomDeck } from "./viewing-room.ts";

test("the deck is the whole Major Arcana, in deck order", () => {
  assert.equal(viewingRoomDeck.length, 22);

  const numbers = viewingRoomDeck.map((card) => card.number);
  assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b));
  assert.equal(numbers[0], 0, "The Fool is 0");
  assert.equal(numbers[21], 21);
});

test("every card carries art, and the locked ones are marked", () => {
  for (const card of viewingRoomDeck) {
    assert.ok(card.image.src, `${card.name} has no art`);
    assert.equal(typeof card.inViewingRoom, "boolean");
  }

  const locked = viewingRoomDeck.filter((card) => !card.inViewingRoom);
  assert.ok(locked.length > 0, "some cards must be locked so coming-soon is reviewable");
  assert.ok(locked.length < viewingRoomDeck.length, "not all of them");
});

test("the copy is the client's, including the corrected artefacts", () => {
  assert.equal(viewingRoom.title, "The Living Tarot");
  assert.equal(viewingRoom.panel.price, "$29 — One-time payment");
  assert.equal(viewingRoom.closing.action, "GET A READING");
  assert.ok(!viewingRoom.closing.action.includes("  "), "the double space is corrected");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './viewing-room.ts'`

- [ ] **Step 3: Write the content module**

Transcribe the copy table from `docs/plans/viewing-room.md` verbatim. The deck reuses the card art already in this repo — read `src/content/card-content/` for the twenty-two names and `src/lib/assets.ts` for their faces, following how `src/content/cards.ts` shapes a `TarotCard`. Extend the local shape with `inViewingRoom: boolean` and `number: number` (the integer, for ordering — `TarotCard.number` is the Roman numeral string for display).

Mark **three** cards `inViewingRoom: false` so the coming-soon treatment is reviewable.

```ts
// src/content/viewing-room.ts — shape only; fill every field from the frame
export type ViewingRoomCard = {
  id: string;
  /** The integer on the card, 0–21. Deck order. */
  number: number;
  /** Roman numeral, for display. */
  numeral: string;
  name: string;
  image: { src: string; width?: number; height?: number };
  /** False while a film is still being prepared: shown, not selectable. */
  inViewingRoom: boolean;
};

export const viewingRoom = {
  title: "The Living Tarot",
  subtitle: "CINEMATIC TAROT CARDS AS MOVING ART",
  carouselHint: "Click any card to experience the Living Tarot",
  panel: {
    heading: "Unlock the Viewing Room",
    body: "Enter a private viewing room for The Living Tarot — a cinematic art collection bringing all 22 Major Arcana to life through motion, atmosphere, light, and sound.",
    benefits: [
      { lines: ["ALL 22", "MAJOR ARCANA"] },
      { lines: ["LIFETIME", "ACCESS"] },
      { lines: ["MOTION,", "LIGHT & SOUND"] },
    ],
    action: "ENTER THE VIEWING ROOM",
    price: "$29 — One-time payment",
    signIn: { lead: "Already Have Access? ", link: "Sign in Here." },
  },
  closing: {
    lines: ["The cards can tell stories.", "now let them tell yours."],
    action: "GET A READING",
  },
} as const;

export const viewingRoomDeck: ViewingRoomCard[] = [/* all 22, in number order */];
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Create the route**

A server component that renders a placeholder for now. Follow `src/app/(site)/library/page.tsx` for metadata shape and `PageAtmosphere` usage.

```tsx
// src/app/(site)/viewing-room/page.tsx
import type { Metadata } from "next";

import { siteName } from "@/content/site";
import { viewingRoom } from "@/content/viewing-room";

export const metadata: Metadata = {
  title: `${viewingRoom.title} — ${siteName}`,
  description: viewingRoom.panel.body,
};

export default function ViewingRoomPage() {
  return <main />;
}
```

- [ ] **Step 6: Rename the nav and repoint all four links**

Every one gets a trailing slash. `site.ts:55` and `site.ts:118` change both label and href; `home.ts:23` and `home.ts:155` change href only.

```ts
// src/content/site.ts:55
{ label: "VIEWING ROOM", href: "/viewing-room/" },
// src/content/site.ts:118
{ label: "Viewing Room", href: "/viewing-room/" },
// src/content/home.ts:23  (hero secondary action)
href: "/viewing-room/",
// src/content/home.ts:155  (product tile — `key` stays "viewing-room-pass")
href: "/viewing-room/",
```

- [ ] **Step 7: Verify the build and the links**

Run: `npm run lint && npm run build`
Expected: PASS, and `out/viewing-room/index.html` exists.

Run: `grep -rn "living-tarot" src/`
Expected: no matches.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(site\)/viewing-room src/content/viewing-room.ts src/content/viewing-room.test.ts src/content/site.ts src/content/home.ts
git commit -m "feat(viewing-room): route, deck content, and the nav rename"
```

---

### Task 2: Access state

The four-way mapping, as a pure function. Includes Review Focus #1.

**Files:**
- Create: `src/lib/viewing-room-access.ts`
- Test: `src/lib/viewing-room-access.test.ts`

**Interfaces:**
- Consumes: `Customer` from `@/lib/session`.
- Produces: `type AccessState = "asking" | "signed-out" | "no-pass" | "member"` and `accessStateOf(customer: Customer | null | undefined): AccessState`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/viewing-room-access.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { accessStateOf, roomIsInert } from "./viewing-room-access.ts";
import type { Customer } from "./session.ts";

const customer = (hasViewingRoomAccess: boolean): Customer => ({
  id: 1,
  name: null,
  email: "jane@example.com",
  hasViewingRoomAccess,
});

test("undefined is still asking, which is not the same as signed out", () => {
  assert.equal(accessStateOf(undefined), "asking");
});

test("null is signed out", () => {
  assert.equal(accessStateOf(null), "signed-out");
});

test("a customer without the pass is no-pass, not signed out", () => {
  assert.equal(accessStateOf(customer(false)), "no-pass");
});

test("a pass holder is a member", () => {
  assert.equal(accessStateOf(customer(true)), "member");
});

/*
  Review Focus #1. `useSignedIn` publishes null when /me throws, so a broken
  API arrives here as "signed out" rather than as a permanent "asking". The
  veil must never be the final state: a visitor whose network died still gets
  a modal they can act on instead of a room that spins forever.
*/
test("only the member and the asking state leave the room usable", () => {
  assert.equal(roomIsInert("asking"), false, "the veil covers it; inert would fight the veil");
  assert.equal(roomIsInert("signed-out"), true);
  assert.equal(roomIsInert("no-pass"), true);
  assert.equal(roomIsInert("member"), false);
});

test("the modal shows for exactly the two refused states", () => {
  assert.equal(accessStateOf(undefined) === "asking", true);
  for (const state of ["signed-out", "no-pass"] as const) {
    assert.equal(roomIsInert(state), true, `${state} must lock the room`);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot find `./viewing-room-access.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/viewing-room-access.ts
import type { Customer } from "./session.ts";

/**
 * Which of the four the visitor is in.
 *
 * `asking` is not a fifth wheel: the room renders under a veil while `/me`
 * answers, because a member who sees a frame of the paywall has been told they
 * did not buy something they did buy.
 *
 * **A broken API arrives here as `signed-out`**, not as a permanent `asking` —
 * `useSignedIn` publishes `null` when the read throws. That is deliberate: a
 * visitor whose network died can act on a sign-in prompt and cannot act on a
 * spinner.
 */
export type AccessState = "asking" | "signed-out" | "no-pass" | "member";

export function accessStateOf(customer: Customer | null | undefined): AccessState {
  if (customer === undefined) return "asking";
  if (customer === null) return "signed-out";

  return customer.hasViewingRoomAccess ? "member" : "no-pass";
}

/**
 * Whether the room behind the modal is unusable.
 *
 * **Presentation, never the gate.** With this removed in dev tools the video
 * endpoint still refuses in phase two. It is here so a screen reader does not
 * read out a room the visitor cannot use.
 *
 * `asking` is false on purpose: the veil is already over the room, and `inert`
 * underneath it would have to be taken off again a moment later.
 */
export function roomIsInert(state: AccessState): boolean {
  return state === "signed-out" || state === "no-pass";
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/viewing-room-access.ts src/lib/viewing-room-access.test.ts
git commit -m "feat(viewing-room): map the session to the four access states"
```

---

### Task 3: The request-race guard

Rapid switching must never play the wrong film. Includes Review Focus #2.

**Files:**
- Create: `src/lib/video-request.ts`
- Test: `src/lib/video-request.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `createRequestGuard(): RequestGuard` where `RequestGuard = { begin(cardId: string): { signal: AbortSignal; isCurrent(): boolean }; abort(): void }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/video-request.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { createRequestGuard } from "./video-request.ts";

test("a single request is current", () => {
  const guard = createRequestGuard();
  const first = guard.begin("1");

  assert.equal(first.isCurrent(), true);
  assert.equal(first.signal.aborted, false);
});

test("beginning a second request retires the first", () => {
  const guard = createRequestGuard();
  const first = guard.begin("1");
  const second = guard.begin("2");

  assert.equal(first.isCurrent(), false, "a stale response must be droppable");
  assert.equal(first.signal.aborted, true, "and the request itself aborted");
  assert.equal(second.isCurrent(), true);
});

/*
  Review Focus #2. Three selections in a row, which is what a visitor dragging
  across the carousel actually does. Only the last may play, and an earlier
  response arriving late must not resurrect itself.
*/
test("rapid switching leaves exactly one survivor", () => {
  const guard = createRequestGuard();
  const requests = ["1", "2", "3", "4"].map((id) => guard.begin(id));

  const current = requests.filter((request) => request.isCurrent());
  assert.equal(current.length, 1);
  assert.equal(current[0], requests[3]);

  for (const stale of requests.slice(0, 3)) {
    assert.equal(stale.signal.aborted, true);
  }
});

test("aborting retires everything, so nothing plays after a teardown", () => {
  const guard = createRequestGuard();
  const request = guard.begin("1");

  guard.abort();

  assert.equal(request.isCurrent(), false);
  assert.equal(request.signal.aborted, true);
});

test("the same card selected twice still retires the first attempt", () => {
  const guard = createRequestGuard();
  const first = guard.begin("1");
  const second = guard.begin("1");

  assert.equal(first.isCurrent(), false, "identity is the attempt, not the card id");
  assert.equal(second.isCurrent(), true);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot find `./video-request.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/video-request.ts

/**
 * One attempt to fetch a playback URL.
 *
 * `isCurrent` is checked **after** the await, not before: an aborted fetch can
 * still resolve, and a response that arrives for a card the visitor has already
 * left is the bug this exists to prevent.
 */
export type VideoRequest = {
  signal: AbortSignal;
  isCurrent(): boolean;
};

export type RequestGuard = {
  begin(cardId: string): VideoRequest;
  abort(): void;
};

/**
 * Makes rapid switching safe.
 *
 * Two mechanisms, because one is not enough. The `AbortController` stops the
 * network; the token stops a response that was already in flight when the
 * visitor moved on. Abort alone leaves a race — `fetch` can resolve before the
 * abort lands — and a token alone leaves the request running.
 *
 * **Identity is the attempt, not the card.** Selecting the same card twice
 * retires the first attempt, so a slow first response cannot satisfy a second
 * press that should have fetched a fresh URL.
 */
export function createRequestGuard(): RequestGuard {
  let current: AbortController | null = null;

  return {
    begin(_cardId: string): VideoRequest {
      current?.abort();

      const controller = new AbortController();
      current = controller;

      return {
        signal: controller.signal,
        isCurrent: () => current === controller,
      };
    },

    abort() {
      current?.abort();
      current = null;
    },
  };
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/video-request.ts src/lib/video-request.test.ts
git commit -m "feat(viewing-room): guard against stale video-url responses"
```

---

### Task 4: The video seam and URL expiry

The stub with its real signature, and the expiry rule. Includes Review Focus #3.

**Files:**
- Create: `src/lib/viewing-room-video.ts`
- Test: `src/lib/viewing-room-video.test.ts`

**Interfaces:**
- Consumes: `VideoRequest` from `@/lib/video-request`.
- Produces: `type PlaybackUrl = { cardId: string; url: string; expiresAt: string }`, `type PlaybackFailure = "signed-out" | "no-pass" | "not-ready" | "unknown"`, `hasExpired(playback: PlaybackUrl, now?: Date): boolean`, `fetchVideoUrl(cardId: string, options: { signal?: AbortSignal }): Promise<PlaybackUrl>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/viewing-room-video.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { fetchVideoUrl, hasExpired, readPlaybackFailure } from "./viewing-room-video.ts";

const at = (iso: string) => ({ cardId: "1", url: "https://example.test/x.m3u8", expiresAt: iso });

test("a URL with time left has not expired", () => {
  const now = new Date("2026-10-22T12:00:00Z");
  assert.equal(hasExpired(at("2026-10-22T12:20:00Z"), now), false);
});

/*
  Review Focus #3. A tab left open overnight: the held URL is long dead, and
  pressing play must fetch a fresh one BEFORE attaching, not attach a corpse
  and recover from the fatal error afterwards.
*/
test("a URL whose time has passed has expired", () => {
  const now = new Date("2026-10-22T13:00:00Z");
  assert.equal(hasExpired(at("2026-10-22T12:20:00Z"), now), true);
});

test("the boundary counts as expired, with a margin for the trip", () => {
  const now = new Date("2026-10-22T12:19:50Z");
  assert.equal(
    hasExpired(at("2026-10-22T12:20:00Z"), now),
    true,
    "ten seconds left is not enough to start a stream",
  );
});

test("a malformed expiry is treated as expired rather than trusted", () => {
  assert.equal(hasExpired(at("not a date"), new Date()), true);
});

test("the backend's refusals map to the four the UI acts on", () => {
  assert.equal(readPlaybackFailure(401), "signed-out");
  assert.equal(readPlaybackFailure(403), "no-pass");
  assert.equal(readPlaybackFailure(404), "not-ready");
  assert.equal(readPlaybackFailure(500), "unknown");
});

test("the stub answers a playable source for any card", async () => {
  const playback = await fetchVideoUrl("1", {});

  assert.equal(playback.cardId, "1");
  assert.ok(playback.url.length > 0);
  assert.equal(hasExpired(playback, new Date()), false, "a fresh stub is not born expired");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — cannot find `./viewing-room-video.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/viewing-room-video.ts
import { videos } from "./assets.ts";

/**
 * A signed playback URL and its deadline.
 *
 * **A credential with a timer.** It is never written to storage of any kind,
 * never put in the HTML, and never logged. It lives in a ref for as long as the
 * player holds it and dies with the page.
 */
export type PlaybackUrl = {
  cardId: string;
  url: string;
  /** ISO 8601, from the backend. Thirty minutes out, in phase two. */
  expiresAt: string;
};

/** The four refusals the UI acts on differently. */
export type PlaybackFailure = "signed-out" | "no-pass" | "not-ready" | "unknown";

/**
 * How close to the deadline is too close.
 *
 * A stream that starts with fifteen seconds left dies mid-manifest, which looks
 * like a broken player rather than an expiry. Renew early instead.
 */
const EXPIRY_MARGIN_MS = 30_000;

export function hasExpired(playback: PlaybackUrl, now: Date = new Date()): boolean {
  const deadline = Date.parse(playback.expiresAt);

  // An unparseable deadline is treated as past. The alternative — trusting it —
  // hands a dead URL to the player and calls the failure a CDN problem.
  if (Number.isNaN(deadline)) return true;

  return deadline - now.getTime() <= EXPIRY_MARGIN_MS;
}

export function readPlaybackFailure(status: number): PlaybackFailure {
  if (status === 401) return "signed-out";
  if (status === 403) return "no-pass";
  if (status === 404) return "not-ready";

  return "unknown";
}

/**
 * The signed URL for one card's film.
 *
 * **Stubbed in phase one, with its real signature.** Phase two points it at
 * `GET /api/v1/{locale}/cards/{id}/video` and maps the status through
 * `readPlaybackFailure`; nothing above it changes, which is the point of the
 * shape being right now rather than later.
 *
 * It answers the bundled film so the room can be reviewed. It is **not** given
 * a local path dressed up as a signed URL in a longer-lived store: a component
 * that learns to treat this as an ordinary string keeps doing so when the
 * string becomes a credential.
 */
export async function fetchVideoUrl(
  cardId: string,
  { signal }: { signal?: AbortSignal },
): Promise<PlaybackUrl> {
  signal?.throwIfAborted();

  return {
    cardId,
    url: videos.theStar,
    // Far enough out that `hasExpired` is false, so the expiry path is
    // exercised by its own tests rather than tripped by the scaffold.
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  };
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/viewing-room-video.ts src/lib/viewing-room-video.test.ts
git commit -m "feat(viewing-room): playback seam with expiry and refusal mapping"
```

---

### Task 5: The film player

The 3:5 panel and its five states, driven by the existing `attachVideoSource`.

**Files:**
- Create: `src/components/viewing-room/FilmPlayer.tsx`
- Create: `src/components/viewing-room/ReplayControl.tsx`

**Interfaces:**
- Consumes: `attachVideoSource` from `@/lib/video-source`; `PlaybackUrl`, `fetchVideoUrl`, `hasExpired` from `@/lib/viewing-room-video`; `createRequestGuard` from `@/lib/video-request`; `ViewingRoomCard` from `@/content/viewing-room`.
- Produces: `<FilmPlayer card={card} onRefused={(failure: PlaybackFailure) => void} />`.

- [ ] **Step 1: Build the player**

Read `src/components/reveal/RevealStage.tsx` first — it already drives `attachVideoSource` and is the model for the attach/play/teardown lifecycle.

Requirements, each load-bearing:

- The frame is `aspect-[509/842]`, never a fixed height. Centred, within the site container.
- Five states: resting (card art + play overlay, `preload="none"`), loading, playing, ended (holds the final frame + `ReplayControl`), error (retry).
- **No autoplay.** `autoPlay` never appears in this file.
- Pressing play: `guard.begin(card.id)` → if a held URL exists and `hasExpired` is false, reuse it; otherwise `fetchVideoUrl`. After the await, **check `isCurrent()` before touching the DOM**.
- `source.onFatalError` → fetch a fresh URL **once**, then the error state. One retry, tracked in a ref, reset on card change.
- Selection change: `guard.abort()`, stop playback, tear the source down, return to resting.
- A refusal calls `onRefused` so the room can raise the right modal.
- The held `PlaybackUrl` lives in a `useRef`. It is never lifted into state that could be serialised, and never written to storage.

- [ ] **Step 2: Build the replay control**

```tsx
// src/components/viewing-room/ReplayControl.tsx
"use client";

import { cn } from "@/lib/cn";

/**
 * The way back into a film that has just ended.
 *
 * The frame draws no post-playback state, so this is ours. It borrows the
 * carousel button's vocabulary — a 43px gold disc — so it reads as part of the
 * room rather than as a browser control.
 *
 * **Not hover-gated**, which is the whole design. Hover does not exist on touch
 * and is invisible to a keyboard, so a control that only appears on hover is a
 * control most phone visitors never find. It rests quiet, lifts on hover *and*
 * focus, and starts at full strength where there is no hover to wait for.
 */
export function ReplayControl({ onReplay, label }: { onReplay: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onReplay}
      aria-label={label}
      className={cn(
        "absolute bottom-6 left-1/2 -translate-x-1/2",
        "grid size-[43px] place-items-center rounded-full",
        "opacity-55 transition-opacity duration-300",
        "hover:opacity-100 focus-visible:opacity-100",
        "[@media(hover:none)]:opacity-100",
      )}
    >
      {/* gold disc + replay mark */}
    </button>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run lint`
Expected: PASS

Run: `grep -n "autoPlay\|localStorage\|sessionStorage" src/components/viewing-room/FilmPlayer.tsx`
Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add src/components/viewing-room/FilmPlayer.tsx src/components/viewing-room/ReplayControl.tsx
git commit -m "feat(viewing-room): the film player and its replay control"
```

---

### Task 6: The thumbnail carousel

**Files:**
- Create: `src/components/viewing-room/ThumbnailCarousel.tsx`

**Interfaces:**
- Consumes: `Carousel`, `CarouselViewport`, `CarouselTrack`, `CarouselSlide`, `useCarouselDuration` from `@/components/ui/Carousel`; `ViewingRoomCard` from `@/content/viewing-room`. (The nesting is `Carousel > CarouselViewport > CarouselTrack > CarouselSlide`; `CarouselDots` is deliberately absent, as in `MetaStripCarousel`, since the manual arrows are the control.)
- Produces: `<ThumbnailCarousel cards={cards} selectedId={id} onSelect={(id: string) => void} />`.

- [ ] **Step 1: Build it**

**Read `src/components/library/card/MetaStripCarousel.tsx` first.** It has already solved continuous auto-scroll on this site and its plugin configuration is the one to copy:

```ts
const plugins = useMemo(
  () =>
    reducedMotion
      ? []
      : [
          AutoScroll({
            // Slower than the meta strip's 0.6: twenty-two cards is a longer
            // journey than five captions, and a visitor is choosing from these
            // rather than reading past them.
            speed: 0.4,
            startDelay: 0,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
            stopOnFocusIn: true,
          }),
        ],
  [reducedMotion],
);
```

Two deliberate departures from that precedent, both because this strip is a set to choose from rather than decoration:

- **The selected thumbnail is marked**, visibly and with `aria-current="true"`.
- **Manual controls exist.** The frame draws one 43×43 gold disc with both arrows; build it as **two buttons**, since one control cannot be both a previous and a next to a screen reader.

Also: five visible at 1920 (`~230px` slides, `262px` between centres), thumbnails at 3:5 with explicit width and height, lazy-loaded, alt text `"${card.name} tarot card from The World Tarot"`.

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/viewing-room/ThumbnailCarousel.tsx
git commit -m "feat(viewing-room): auto-scrolling thumbnail carousel"
```

---

### Task 7: Locked cards

Coming-soon treatment, reachable and announced. Includes Review Focus #4.

**Files:**
- Modify: `src/components/viewing-room/ThumbnailCarousel.tsx`
- Test: `src/lib/viewing-room-access.test.ts` (extend)

**Interfaces:**
- Consumes: `ViewingRoomCard.inViewingRoom`.
- Produces: `thumbnailLabel(card: ViewingRoomCard): string` exported from `@/lib/viewing-room-access`.

- [ ] **Step 1: Write the failing test**

```ts
// append to src/lib/viewing-room-access.test.ts
import { thumbnailLabel } from "./viewing-room-access.ts";

const card = (inViewingRoom: boolean) => ({
  id: "1",
  number: 0,
  numeral: "0",
  name: "The Fool",
  image: { src: "/fool.jpg" },
  inViewingRoom,
});

test("a playable card is announced by name", () => {
  assert.equal(thumbnailLabel(card(true)), "The Fool tarot card from The World Tarot");
});

/*
  Review Focus #4. A locked card is in the tab order — removing it would hide
  a third of the deck from a keyboard — so it must say why it does nothing.
  A focusable control that announces only its name and then refuses to act is
  worse than one that is absent.
*/
test("a locked card says so in its own label", () => {
  const label = thumbnailLabel(card(false));

  assert.ok(label.includes("The Fool"), "still names the card");
  assert.ok(/coming soon/i.test(label), "and says why it cannot be chosen");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `thumbnailLabel` is not exported

- [ ] **Step 3: Implement**

```ts
// append to src/lib/viewing-room-access.ts
import type { ViewingRoomCard } from "../content/viewing-room.ts";

/**
 * What a screen reader says for one thumbnail.
 *
 * The alt-text pattern the ticket fixes, plus the lock. **A locked card stays
 * in the tab order**: three of twenty-two are unfinished, and skipping them
 * would silently shorten the deck for anybody not using a mouse. So it is
 * reachable, and it explains itself rather than simply failing to respond.
 */
export function thumbnailLabel(card: ViewingRoomCard): string {
  const base = `${card.name} tarot card from The World Tarot`;

  return card.inViewingRoom ? base : `${base} — coming soon`;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Wire it into the carousel**

Locked thumbnails use `thumbnailLabel`, carry `aria-disabled="true"`, stay focusable, do not call `onSelect`, and take the dimmed coming-soon treatment.

- [ ] **Step 6: Commit**

```bash
git add src/lib/viewing-room-access.ts src/lib/viewing-room-access.test.ts src/components/viewing-room/ThumbnailCarousel.tsx
git commit -m "feat(viewing-room): coming-soon cards stay reachable and announce why"
```

---

### Task 8: The modal shell

Dialog semantics, focus trap, scroll lock, screen switching.

**Files:**
- Create: `src/components/viewing-room/PaywallModal.tsx`

**Interfaces:**
- Consumes: `AccessState` from `@/lib/viewing-room-access`; `viewingRoom` from `@/content/viewing-room`.
- Produces: `<PaywallModal state={state} screen={screen} onScreen={(s: "unlock" | "payment") => void} />`.

- [ ] **Step 1: Build the shell**

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the heading.
- Focus moves inside on open and is **trapped**: Tab from the last focusable returns to the first, Shift+Tab from the first wraps to the last.
- **No Escape handler. No backdrop click handler.** There is nothing usable behind it, and both would only appear to work.
- Body scroll locked while open, restored on unmount.
- Renders `UnlockPanel` or `PaymentPanel` by `screen`, inside one panel chrome so the swap reads as the panel changing rather than a second dialog opening.
- Never rendered in the `asking` or `member` states.

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: PASS

Run: `grep -n "Escape\|onKeyDown.*Esc\|backdrop.*onClick" src/components/viewing-room/PaywallModal.tsx`
Expected: no matches.

- [ ] **Step 3: Commit**

```bash
git add src/components/viewing-room/PaywallModal.tsx
git commit -m "feat(viewing-room): paywall dialog shell with focus trap"
```

---

### Task 9: Screen one — the unlock panel

Exactly as the frame draws it, plus the switch-account line the frame has no room for.

**Files:**
- Create: `src/components/viewing-room/UnlockPanel.tsx`
- Create: `src/components/viewing-room/AccountLine.tsx`

**Interfaces:**
- Consumes: `viewingRoom` copy; `customerLabel`, `signOut` from `@/lib/session`; `useSignedIn`.
- Produces: `<UnlockPanel state={state} onBuy={() => void} />`, `<AccountLine />`.

- [ ] **Step 1: Build the panel from the frame**

Node `384:28`, 772×713. Every value from the spec's panel table: heading 45px `#f9f3d0`, key divider, body 32px/34px over 680px centred, three benefit captions 18px/18px under ~70px icons, gold button 470×66 with its keyhole at the left end and a Cinzel 30px `#101b2e` label, price 36px white, sign-in line 30px `#d4b06a` with the second clause underlined.

Assets download from Figma per the design-to-code rules — no temporary Figma URLs in shipped code.

- [ ] **Step 2: Build the account line**

```tsx
// src/components/viewing-room/AccountLine.tsx
"use client";

/**
 * Which account is signed in, and the way out of it.
 *
 * **Not in the frame, and added deliberately.** `API_CONTRACT.md` warns that
 * people pay under one address and then sign in as another; the no-pass state
 * is exactly where that person lands, and a panel that only says "buy it" tells
 * somebody who already bought it to buy it twice — which the backend answers
 * with a 422.
 *
 * Shown only in `no-pass`. A signed-out visitor has no account to switch away
 * from, and a member never sees this panel.
 */
```

It renders the signed-in address via `customerLabel` and a control that calls `signOut()` then publishes `null` through `useSignedIn`'s `setCustomer`, so the modal falls back to the signed-out screen without a reload.

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/viewing-room/UnlockPanel.tsx src/components/viewing-room/AccountLine.tsx
git commit -m "feat(viewing-room): unlock panel and the switch-account line"
```

---

### Task 10: Screen two — the payment panel

**Files:**
- Create: `src/components/viewing-room/PaymentPanel.tsx`

**Interfaces:**
- Consumes: `ExpressCheckout` from `@/components/reading/ExpressCheckout`; `HostedCheckoutButton` from `@/components/reading/HostedCheckoutButton`; `useProduct` from `@/lib/product`.
- Produces: `<PaymentPanel onBack={() => void} />`.

- [ ] **Step 1: Build it**

The wallet step behind the gold button — the ticket's "the payment step appears in place".

- `useProduct("viewing-room-pass")` for the money. The catalogue carries it as `type: "pass"`; `content/home.ts:150` already keys the homepage tile to it.
- `<ExpressCheckout productKey="viewing-room-pass" money={offer.money} />` above.
- `<HostedCheckoutButton productKey="viewing-room-pass" money={offer.money} />` below.
- The price line, and a way back to screen one.
- **No gifting.** The pass can be bought once and never expires; `API_CONTRACT.md` makes a second purchase a 422 and there is no redemption path for a gifted pass.
- Do **not** reuse `GetMyReading` — it is tangled with gifting, a question field, a `ReadingPage` object and container-query units tuned to the reading panel's width. The two controls are the reuse.

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/viewing-room/PaymentPanel.tsx
git commit -m "feat(viewing-room): wallet and hosted-checkout step inside the modal"
```

---

### Task 11: The room, assembled, and the responsive pass

Composition root, the dev-only state switch, and every breakpoint. Includes Review Focus #5.

**Files:**
- Create: `src/components/viewing-room/ViewingRoom.tsx`
- Modify: `src/app/(site)/viewing-room/page.tsx`

**Interfaces:**
- Consumes: everything above.
- Produces: `<ViewingRoom cards={viewingRoomDeck} />`.

- [ ] **Step 1: Assemble**

- Owns selection and the current screen. Reads `useSignedIn`, maps with `accessStateOf`.
- Applies `inert` to the room container when `roomIsInert(state)`, with `aria-hidden` as fallback.
- The veil covers the room while `asking`. **A member never sees a frame of the modal.**
- `onRefused` from the player: `signed-out` → signed-out modal, `no-pass` → no-pass modal, `not-ready` → mark that card coming soon.
- After a purchase or sign-in the modal clears without a reload, because `useSignedIn` publishes to every subscriber.

**The deck arrives as a prop from one call site** — `page.tsx` passes `viewingRoomDeck`. That call site is what phase two changes.

- [ ] **Step 2: Add the dev-only state switch**

```tsx
/**
 * `?state=signed-out|no-pass|member`, outside production only.
 *
 * Without it the signed-out modal is the only reachable state and the member's
 * room — the thing the client is actually buying — cannot be reviewed at all.
 *
 * **Guarded by NODE_ENV**, and deleted in phase two. It overrides presentation
 * only; it cannot and must not make the backend serve a film.
 */
```

- [ ] **Step 3: Spend the vertical budget**

Her artboard ends at 2132 with a 744px bottom CTA block and **no footer under it**, because she draws none. Spending that literally stacks empty rotunda on top of the real 522px footer.

**Read the long comment at the top of `src/app/(site)/library/page.tsx` before touching this** — it documents the identical problem, the reasoning, and the correction, and that page's numbers are the precedent. Hold the composition down to the closing button, trim the room beneath it by eye against the rendered page, and **record the trimmed number in a comment at the call site** so the next person moves a measured value instead of guessing.

- [ ] **Step 4: The responsive pass**

- **Tablet:** desktop composition, fewer thumbnails in view, panel narrows before it restyles.
- **Mobile:** stacked — player, then carousel, controls in thumb reach.
- **The player keeps 3:5 and that is the constraint to watch.** At 390px wide, 3:5 is 650px tall and pushes the carousel off-screen. Cap with `max-height` in `dvh` and let it narrow rather than letterbox.
- Modal becomes a full-width sheet; benefit row stacks before it crowds.
- Fluid type and spacing; tap targets ≥44px; no horizontal page scroll; no cropped cards.

- [ ] **Step 5: Review at every width**

Review and polish at **360, 390, 430, 768, 1024, 1280+**.

**Review Focus #5** — at 360 with the modal open and the on-screen keyboard raised, the gold button must stay reachable and nothing may be clipped by browser chrome. Use `dvh`, not `vh`: `vh` ignores the collapsing address bar and is exactly what puts a button under it. Verified in Task 12's check at a 360×480 viewport, which is roughly a 360 phone with the keyboard up.

- [ ] **Step 6: Verify**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/viewing-room/ViewingRoom.tsx src/app/\(site\)/viewing-room/page.tsx
git commit -m "feat(viewing-room): assemble the room and derive tablet and mobile"
```

---

### Task 12: The browser check

**Files:**
- Create: `scripts/check-viewing-room.mjs`
- Modify: `package.json` (add `check:viewing-room`)

**Interfaces:**
- Consumes: the built `out/`.
- Produces: `npm run check:viewing-room`.

- [ ] **Step 1: Write it**

Model it on `scripts/check-login.mjs` — same shape: serve `out/`, answer the API itself, drive Playwright. Use **PORT 4324** (4322 and 4323 are taken by `check-confirmation` and `check-login`, and all three must be able to run at once).

Cases:

1. **Signed out** (`/me` → 401): modal shows; room is `inert`; no `<video>` has a `src`.
2. **No pass** (`/me` → 200, `has_viewing_room_access: false`): modal shows; the account line names the signed-in address.
3. **Member** (`/me` → 200, true): **no modal at any point**, including the first paint. Assert it never appeared, not merely that it is gone.
4. **Inert removed by hand**: delete the attribute via `page.evaluate`, press play, assert no film plays.
5. **Coming-soon card**: not selectable, announced as coming soon.
6. **Rapid switching**: click four thumbnails fast; assert the player ends on the fourth.
7. **Review Focus #5**: viewport 360×480, modal open, assert the gold button is inside the viewport and fully visible.

Copy the asserted sentences **literally** into the check rather than importing them from `content/viewing-room.ts` — a check that imports its expectations cannot tell the right string from whatever the string has become. `check-login.mjs` says this in its own header and is the precedent.

- [ ] **Step 2: Run the whole suite**

```bash
npm test && npm run lint && npm run build && npm run check:viewing-room
```
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-viewing-room.mjs package.json
git commit -m "test(viewing-room): browser check across every access state"
```

---

## For the client, at handover

Three things she has not seen, all confirmed for this build:

1. **The modal's second screen** — the wallet step behind her gold button. Her controls, our arrangement.
2. **The switch-account line** in the no-pass state, which her panel has no room for and the contract specifically warns is needed.
3. **The nav rename**, LIVING TAROT → VIEWING ROOM, which takes her term out of the masthead while the page title and homepage hero keep it.

Plus two scaffold limits, so nothing in the review is mistaken for a bug: **every card plays the same film**, so switching replays The Star; and three cards are marked coming soon **on purpose**, to show that state.
