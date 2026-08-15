# The World Tarot — homepage & reveal

A Next.js implementation of the World Tarot homepage built from the Figma design
(`node 102:3`), together with the reusable card **Reveal** that the rest of the
site will be built around.

```bash
npm install
npm run dev     # http://localhost:3000
```

## Stack

| Concern     | Choice                                            |
| ----------- | ------------------------------------------------- |
| Framework   | Next.js 16 (App Router), React 19, TypeScript     |
| Styling     | Tailwind CSS v4 with a design-token layer         |
| Motion      | Motion (`motion/react`) for the reveal crossfade  |
| Carousel    | Embla (`embla-carousel-react`) for the mobile product row |
| Type        | Magically + Gill Sans (local), Cinzel via Google |

## How the styling works

Everything visual resolves to a token declared in `src/app/globals.css`. There
are no hard-coded brand colours or font sizes in components.

- **Colour** comes from `@theme` (`--color-gold`, `--color-champagne`, …),
  sampled from the client style sheet and confirmed against the Figma exports.
- **Type is fluid.** Each step is a `clamp()` whose maximum is the Figma value at
  a 1920px viewport, so the page is 1:1 with the design on a full-width desktop
  and scales proportionally below that — `--text-h1` tops out at exactly 60px.
- **Measure** is handled by `.shell--*` classes: the token is the content width
  Figma drew, and the page gutter is added on top so content lands on the same x
  positions as the design.
- **Brand chrome** (gold gradient buttons, bordered secondaries, input glow) is
  rebuilt from tokens rather than shipped as bitmaps, so it stays crisp at any
  size. The gradient stops were sampled from the Figma PNGs.

### Layout rules

No element is positioned absolutely for layout. Where the design overlaps
artwork, `.stack` puts children in a single CSS grid cell instead — used for the
card videos, the hero glow and the header/footer scrims.

The product tiles are container queries: the tile is a `@container` and its type
and insets are sized in `cqw`, so a tile keeps the proportions Figma drew at
392px wide whether the grid is showing one column or four.

Below `sm` that row becomes a swipeable strip instead of a fourth grid row —
`components/home/ProductCarousel.tsx` hands Embla `active: false` with a
breakpoint that switches it on under 640px, so there is one row of markup, not
a duplicated mobile copy: Embla takes the grid over on phones and lets go of it
everywhere else. `components/ui/Carousel.tsx` is the reusable half (viewport
ref, track, slides, dots); see its doc comment before wiring up the next one.

The page atmosphere — ten stacked artwork layers in Figma — is reproduced as
background layers on a single element, with percentage sizes and positions so
each layer holds its relative place however tall the page renders.


## The Reveal

`src/components/reveal` is a compound component rather than a single widget,
because the trigger and the card sit in different columns of the hero and the
One-Card Experience will arrange them differently again.

```tsx
<RevealProvider oncePerVisit>
  <RevealTrigger revealedTarget="#choose-your-journey" />
  <RevealStage className="w-[66.7%]" />
</RevealProvider>
```

- A looping, muted card back crossfades into the revealed card in the same
  frame, so nothing on the page moves.
- The fade waits for the card video to have pixels, otherwise it lands on a
  black frame while the file buffers.
- The card plays once with sound — the click is the gesture that permits it —
  and holds on its closing frame.
- One card per visit, tracked in `sessionStorage`. On a later view the card is
  restored on its closing frame instead of replaying.
- Once revealed, the trigger becomes **Visit The Viewing Room** and scrolls down
  to the products rather than leaving a dead button behind.

Only The Star is wired up, so every reveal shows it. When the remaining card
videos arrive they are added to `livingTarot` in `src/content/cards.ts` and the
provider takes a `card` prop.

## Checking the work

The layout was matched to Figma numerically rather than by eye.

```bash
npm run check:measure   # rendered boxes vs the Figma frame, section by section
npm run check:shoot     # section screenshots into .screens (add a width and label)
npm run check:reveal    # walks the whole reveal interaction
npm run check:images    # flags images that failed or rendered at zero size
```

At 1920px the hero grid, card, buttons and product row land on the Figma
geometry exactly. The page runs about 7% taller than the 6674px frame, which is
the flow layout resolving overlaps that the design draws as stacked boxes.

## Scope

Homepage and reveal only. Navigation links point at routes from the navigation
document that do not exist yet; the footer's newsletter form has markup and
validation but no endpoint.

### The invitation list

The coming-soon page's form does submit — `requestInvitation()` in
[`src/lib/api.ts`](src/lib/api.ts) posts `{ email, consent }` to
`POST /api/v1/{locale}/subscribe`. **That route does not exist yet**, so on any
deployed build every submission lands in the form's error state. This is
deliberate: the alternative is telling a visitor their request was received when
nothing received it.

In `next dev` the post is replaced by
[`invitation-sim.ts`](src/lib/invitation-sim.ts), so the success state can be
looked at: the first attempt in a tab succeeds and every one after it fails
(reload to submit again, new tab to get another success). It sits behind a
`NODE_ENV` guard and a dynamic import, so no deployed build can reach it —
`npm run build` leaves it out of the bundle entirely. Delete that file and the
guard in `api.ts` once the route is live.

The list is a Mailchimp list, and Mailchimp belongs **behind** that route. The
browser must never call it directly — the API key would ship in the bundle, and
Mailchimp's classic endpoint sends no CORS headers, leaving only their JSONP
form, which reports success no matter what happened. Sending to Mailchimp is a
backend deliverable, and is already scoped as one.
