# The reveal draws from the API

> **Shipped 5 August 2026.** Written 3 August. The close-out is immediately below.
> Everything after it is the plan as approved, kept as written so the deviations mean something.

---

## Close-out, 5 August 2026

**All seven steps shipped.** The homepage reveal draws a real card and plays its Living Tarot film, verified in Chrome against the deployed staging backend.

```
card face   : playlist.m3u8, playing, unmuted, 75.24s
card drawn  : 0 · The Fool          (from GET en/cards/draw)
restored    : GET en/cards/1, poster still, film re-requested 0 times
```

`npm run check:reveal` passes in full, including the timing and typography assertions that were tuned to the old bundled MP4.

### What deviated, and why

| Deviation | Why |
|---|---|
| **`hls.js` added as a dependency** | The plan expected this. The prior README did not: it promised a remote URL would drop in with no component change, which is true of MP4 and false of HLS. `attachVideoSource` now picks the path and imports the library only where it is needed |
| **`TarotCard.video` became optional** | A restored visit has no film and cannot have one: the URL expires in two hours and must not be stored. Making it optional was more honest than inventing an empty string |
| **`ready` gained a second condition** | Only for a visitor with a stored card. The restore used to resolve synchronously against the bundled deck and now takes a request, so without this the idle button flashes and swaps, which is the exact thing that gate exists to prevent. First-time visitors wait for nothing |
| **`check:reveal` made card-agnostic** | It asserted on "XVII · The Star" and a bundled MP4 filename. The card is now whatever the backend drew, so it is found by the "numeral · name" shape and the film check watches for any media rather than one file |
| **`npm install` was needed first** | Unrelated and pre-existing: `embla-carousel` is imported directly by two components, declared only transitively through `embla-carousel-react`, and neither was installed. The homepage was returning **500** on a clean `npm run dev` before any of this work |

### Open questions, answered

1. **Which still a restored visit shows.** The API's `poster`, accepted as not being the film's closing frame. A second per-card upload is a lot of the client's time for one state
2. **Whether the reveal takes its copy from the API.** Yes for `name` and `number`, which describe the card the backend actually chose. The prompt question stays bundled, since it is not per-card
3. **How loud the fallback is.** `console.error` for an unreachable API, `console.info` for a 404, because "no films uploaded yet" and "the API is broken" want very different responses and should not look the same

### Risks that turned out not to exist

- **IPv4 versus IPv6**, called the nastiest item in the plan. Both the API and the CDN are IPv4-only, no AAAA records, so the browser uses the same family for each and the addresses match. **It returns the moment either host gains an AAAA record**
- **Referrer stripping.** Nothing in the app sets a `Referrer-Policy`, and the browser sends one to the CDN, verified by capturing the request headers
- **CORS on the media.** `hls.js` fetches by XHR and the segments load, so the CDN's headers are sufficient

### Still owed

- **Safari has not been tested.** Everything above is Chrome, which takes the `hls.js` path. Safari takes the native path, which is a different branch of `attachVideoSource` and the one no test has exercised
- **Nothing is deployed.** All of this is local, against staging's API
- **Cloudflare Pages needs `NEXT_PUBLIC_API_BASE_URL`** in both environments, and it is baked at build time, so staging and production are separate builds
- **`embla-carousel` should be declared directly** rather than relied on transitively

---

---

## Current state, read from the code as it is

- **`output: 'export'`** in `next.config.mjs`. This is a static export on Cloudflare Pages, so there is no server at runtime and no route handlers. Next 16.2.12, React 19.2.4
- **The reveal is already designed for this.** `src/content/cards.ts` and `src/components/reveal/README.md` both name the seam: `RevealProvider` chooses the card, and that is what will fetch instead. `findCard(id)` exists for turning a stored session id back into a card
- **Only The Star is wired up.** `livingTarot` has one entry, so "a random video plays" is a no-op today
- **The face is a `<video>` on a fresh reveal and an `<img>` on a restored visit.** The still is the video's closing frame, which avoids re-downloading the MP4 on every page view in a session
- **One reveal per visit** is `sessionStorage` under `wt.reveal.card`, holding the card id. That stays frontend, per the standing decision
- **`npm run check:reveal`** drives the whole interaction in Playwright and is tuned to `REVEAL_CROSSFADE_SECONDS` and `STILL_HANDOFF_SECONDS`
- **A second, parallel copy** lives at `src/components/concept/reveal` for the `/concept` route. Its README says explicitly it is not a re-export and must not be merged. **Out of scope here**
- No test runner. Verification is the `check:` scripts plus the eye

## The assumption that does not survive

`src/content/cards.ts` says `video` is "deliberately a plain URL string, a remote URL drops straight in with no component change."

**That was true for MP4 and is false for HLS.** The backend returns `playlist.m3u8`. Safari plays that natively in a `<video src>`, and Chrome and Firefox do not: they need Media Source Extensions driven by a library, in practice `hls.js`. So `RevealStage` does need a component change, and the seam is slightly wider than the README promised.

Worth knowing rather than discovering during the build, because it is the difference between a one-file change and a three-file one.

## Two other mismatches

**Shape.** `TarotCard` and the API disagree on almost every field:

| `TarotCard` | API `/cards/draw` |
|---|---|
| `id: "17-the-star"` | `id: 1` (integer) |
| `number: "XVII"` (Roman) | `number: 0` (integer, 0 to 21) |
| `image: ImageAsset` with width and height | `image: "https://…"` string |
| `video: string` (bundled MP4) | `video.url` (HLS, expires in two hours) |
| absent | `short_description`, `long_description`, `poster`, `in_viewing_room` |

**The restored visit has no video to restore.** The stored id is all we keep, and the URL must never be stored, per the API contract, because it is a credential with a timer. That is fine, because a restored visit shows the still rather than the video anyway. But it means the restore path needs a second call, `GET /cards/{id}`, which returns the card without a video. That endpoint already exists.

## What works out beautifully

**The static export forces the fetch client-side, which is exactly what the token needs.** Bunny playback URLs are now bound to the viewer's IP. If this were server-rendered or fetched at build time, the backend would sign against the server's IP and every visitor would get a 403. Because there is no server, the browser calls `/draw` itself, the backend sees the real visitor, and the token matches. Right answer for an accidental reason, but worth writing down so nobody "optimises" it into a server component later.

## Goal

The homepage reveal draws a real card from the backend and plays its Living Tarot film, keeping the interaction exactly as it is now: one card per visit, the same crossfade, the same restored-visit behaviour, and no visible regression if the backend is unreachable or has no films yet.

## Explicitly out of scope

| Not here | Owned by |
|---|---|
| `src/components/concept/reveal` | The `/concept` experiment. Separate copy by design |
| The Viewing Room, its player and rail | A later piece |
| Card copy elsewhere on the site | Still bundled. Only the reveal migrates |
| Locale switching | English only today. The path segment is hardcoded to `en` and the seam noted |
| The backend's signing fix | Backend repo, and it blocks this |

## Steps

### Step 0, read the framework docs. No code

`AGENTS.md` is explicit: this is Next 16 and the APIs may differ from what I know. Before writing anything I read the relevant guides under `node_modules/next/dist/docs/`, specifically static export, environment variables, and client-side data fetching. Anything I find that contradicts this plan gets reported before I build.

### Step 1, the API client and the shape mapping

- `src/lib/api.ts`: a typed `drawCard()` hitting `${NEXT_PUBLIC_API_BASE_URL}/api/v1/en/cards/draw`
- Maps the API card onto `TarotCard`, including integer to Roman numeral for `number`
- `NEXT_PUBLIC_API_BASE_URL` added to `.env.example` with a comment matching the existing style
- **No component touched.** This step is pure plumbing and can be exercised from the console
- **Verify:** call it against local `php artisan serve` with the seeded card, confirm the mapped object satisfies `TarotCard`
- **Risk:** low. The only judgement is the Roman numeral table, which is 22 fixed values

### Step 2, teach the stage to play HLS

- `RevealStage` gains HLS support: native where the browser has it, `hls.js` otherwise
- **Keeps plain MP4 working**, because the bundled placeholder is the fallback in step 5 and the `/concept` copy still uses it
- `hls.js` added as a dependency, lazily imported so Safari never downloads it
- **Verify:** `npm run check:reveal` in Chrome and in Safari. The existing script already warns that Chromium has no H.264 decoder and prefers installed Chrome, and Bunny's renditions are H.264, so that warning now matters more, not less
- **Risk:** the real one in this plan. Autoplay with sound on a user-initiated reveal is currently `video.muted = false` then `play()`. That has to keep working through hls.js, and the crossfade timing is tuned to when the face has decodable pixels, which arrives differently for HLS than for a progressive MP4

### Step 3, the provider fetches

- `RevealProvider` calls `drawCard()` instead of always using `defaultRevealCard`
- Fetch on mount, not on click, so the film is ready when the visitor presses the trigger rather than after it
- `oncePerVisit` and the sessionStorage write are unchanged
- **Verify:** the reveal plays a card served by the local backend, and the button still paints without a flash for a returning visitor
- **Risk:** the `ready` hydration gate exists to stop a flash of the idle button. Adding a network round trip gives it a second reason to be not-ready, and conflating the two would reintroduce the flash the gate was built to prevent

### Step 4, the restored visit

- On restore, `GET /cards/{id}` for the stored id, for the name, number and still
- No video is fetched, matching today's behaviour and the reason for it
- **Open question below:** which image the still should be
- **Verify:** reveal, reload, confirm the same card returns with no button and no second film download

### Step 5, never break the homepage

- If `/draw` 404s, or the API is unreachable, fall back to the bundled card exactly as it behaves today
- **This is not optional.** The backend has no fallback by decision, and production currently has zero films, so without this the hero of the site is an error state until Jennifer delivers
- **Verify:** stop the backend, load the homepage, confirm the reveal still works on the placeholder
- **Risk:** none technically. The risk is social, in that a silent fallback can hide a broken API for weeks. It should be loud in the console and invisible to the visitor

### Step 6, the cross-origin details that will bite

Three things stand between a signed URL and a playing video, and none is visible in local development:

- **Referrer.** The zone has `BlockNoneReferrer` on, so requests with no referrer are refused. A browser sends one from a page, but a `Referrer-Policy: no-referrer` anywhere, including Cloudflare's security headers, breaks playback and looks exactly like a token bug
- **CORS.** `hls.js` fetches by XHR and needs the CDN's CORS headers. Bunny appears to send `access-control-allow-origin: *`, confirmed on a 403 and to be reconfirmed on a 200
- **IP family.** The token binds the IP the backend saw. If the browser reaches our API over IPv6 and Bunny over IPv4, those differ and every request 403s. This is the nastiest failure in the plan because it will affect some visitors and not others
- **Verify:** on staging, from a real browser, on both IPv4 and IPv6

### Step 7, the record

- `src/content/cards.ts` and `src/components/reveal/README.md` corrected, particularly the line promising a remote URL drops in without a component change
- `check:reveal` updated for whatever step 2 changed about timing
- `.env.example`, and the Cloudflare Pages environment variable for both environments

## Open questions

1. **Which still does a restored visit show?** The README wants the video's *closing frame*, which is why `TarotCard` carries both `video` and `image`. The API offers `poster`, which M4 defines as the frame the player *rests on* before playing. Those may be different frames, and only Jennifer's uploads will tell. Recommending we use `poster` and accept it, since a second per-card asset for one restored-visit state is a lot of upload for a small gain

2. **Does the reveal take its copy from the API too?** The draw returns `name`, `short_description` and `long_description`. The trigger currently shows a bundled name and prompt question. Recommending we take `name` and `number` from the API, since they now describe the card the backend actually chose, and leave the prompt question bundled since it is not per-card

3. **How loud is the fallback?** A console error is invisible in production. Options are silent, console-only, or reporting to something. Recommending console plus a one-line note in the README, and revisiting when there is any error reporting at all

## Dependencies

- **The backend signing fix must land first.** `/draw` currently returns a URL that 403s everywhere. This plan cannot be verified until it does not
- **A decision on `BlockNoneReferrer`**, which is still open in the backend plan
- **Jennifer's films.** Nothing blocks the build, and step 5 exists so nothing blocks the homepage either
- **Cloudflare Pages environment variables** for both environments

## Verification

- The reveal plays a real film from the API, in Chrome and in Safari
- A reload restores the same card, with no button, no flash, and no second film download
- With the backend stopped, the homepage reveal still works
- `npm run check:reveal` green
- On staging, over both IPv4 and IPv6, from a real browser rather than curl
