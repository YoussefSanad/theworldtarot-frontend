# `/concept` — the sunrise-hero experiment

A second, parallel homepage hero at the `/concept` route (`primaryNav` in
[`src/content/site.ts`](../../content/site.ts) links to it as "CONCEPT"). It
exists to demo an alternate treatment — a rising sun/world behind the hero
that animates in on load and again on reveal, plus a full-bleed landing
viewport with a retractable burger menu instead of the always-visible header —
without touching the production homepage while it's under review.

**This is not dead code and not a stray duplicate.** If the direction is
approved it likely replaces `(site)`'s Hero; until then, treat it as a
sibling implementation that must be edited on its own terms.

## What's different from production

| | Production (`components/home/Hero.tsx`) | Concept (`ConceptHero.tsx`) |
|---|---|---|
| Header | `SiteHeader` — always visible, transparent over the atmosphere | `ConceptHeader` — hidden until scroll, burger opens a right-side panel |
| Atmosphere | Baked into `.page-atmosphere` background layers (CSS) | `SunriseAtmosphere` — animated DOM layers portaled into `#concept-sky`, driven by reveal status |
| Session key | `wt.reveal.card` | `wt.concept.reveal.card` (separate, so visiting one demo doesn't consume the other's one-per-visit allowance) |
| Restored-visit flag | `restored` derived inline each render from `interaction === "idle" && seenThisVisit` | `restoreSession`, latched via a state update the first time `seenThisVisit` is seen — needed because `SunriseAtmosphere` has to know "already revealed" *before* paint to skip the dawn animation, not just gate the button |
| Hydration gating | `ready` flag blocks the idle button until the client has confirmed there's no stored card (see [`src/components/reveal/README.md`](../reveal/README.md)) | No `ready` flag — `RevealTrigger` here fades the button in with `animate={{opacity}}` rather than mounting/unmounting it, so there's no pre-hydration flash to guard against |
| Extra API | — | `onDawnSettled()` — `SunriseAtmosphere` calls this once the dawn animation finishes, which is what lets the trigger's button fade in only after the sky has visibly settled |

`RevealStage` is copied byte-for-byte between the two (same crossfade
mechanics) except the concept version doesn't special-case `restored` in its
`onAnimationComplete` handler — the concept flow doesn't need to suppress
`onRevealComplete` on a restored visit the way production does, because
`restoreSession` is derived differently.

## Why not share the code?

The two reveals answer different questions ("has this visit's card already
been decided" vs. "should the sky already be lit when this paints") from the
same session-storage pattern, and they're read by an animation
(`SunriseAtmosphere`) that only one of them has. Past experience on this repo
is that once one demo diverges from the other, chasing a shared abstraction
between an in-flight design experiment and the production path costs more
than it saves. If you're changing behavior here, change it here — don't fold
it into `components/reveal` and reroute production through a flag.

## Layout host

`app/concept/layout.tsx` renders `#concept-sky`, an absolutely-positioned
empty div that `SunriseAtmosphere` portals its animated globe/shine layers
into (`createPortal`, not a normal child) so they paint above the CSS
atmosphere (`.page-atmosphere-concept`, which — unlike production's
`.page-atmosphere` — omits the shine/globe background layers on purpose,
since `SunriseAtmosphere` owns those).
