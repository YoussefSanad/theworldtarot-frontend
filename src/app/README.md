# Design tokens & the Figma-matching system

`globals.css` is the single place every colour, type size, spacing value and
content width is declared. There are no hard-coded brand values in
components — if you're tempted to write a magic number in a `className`, it
almost certainly already exists as a token here, or belongs in one.

The whole system exists to satisfy one constraint: **the page must be
numerically identical to the Figma frame at 1920px**, and scale down smoothly
below that, rather than just "looking close." `npm run check:measure`
verifies this by comparing rendered bounding boxes against Figma's — see
[`../../scripts/README.md`](../../scripts/README.md).

## Fluid type and spacing

Every `--text-*` and `--spacing-*` token is a `clamp()` whose **maximum is
the exact Figma pixel value at 1920px**, converted to `vw` by dividing the
Figma px by 19.2 (`1920 / 100`). So `--text-h1: clamp(1.875rem, 3.125vw,
3.75rem)` tops out at exactly 60px because Figma drew that heading at 60px.
If a new component needs a size Figma didn't already give a token for, do the
same conversion rather than eyeballing a `clamp()` — the value should be
derivable from a specific Figma measurement, not "reads about right."

## Measures (content widths)

`--container-*` tokens are the pixel width Figma drew a given content column
at (e.g. `--container-page: 1568px` is the product row). `.shell--*` classes
turn that into a responsive width via the `--measure-*` custom properties,
which are `100%` below `lg` (1024px) and a `min(pixelWidth, vw-share)` above
it — see the `@media (width >= 64rem)` block. This is why content sits at the
same x-position as Figma at 1920px but simply fills the viewport on mobile:
below `lg` the design stops scaling and the gutter (`--spacing-gutter`) does
the work instead.

`Container`/`Section` in [`src/components/layout/Section.tsx`](../components/layout/Section.tsx)
are the components that consume these — `Section` owns vertical rhythm and
full-bleed backgrounds, `Container` owns the measure, kept separate so a
section's artwork can run edge-to-edge while its text stays on the grid.

## `.stack` — layering without `position: absolute`

```css
.stack { display: grid; }
.stack > * { grid-area: 1 / 1; }
```

Every child occupies the same grid cell, so the tallest one sets the size and
the rest paint on top of it. This is how the reveal card's video/still/face
crossfade (see [`src/components/reveal/README.md`](../components/reveal/README.md))
and the header/footer scrims are built — no element on the page is
absolutely positioned for layout purposes, which is a deliberate rule, not an
accident. If you need to overlap two elements, reach for `.stack` before
`position: absolute`.

## Page atmosphere — ten Figma layers as one background

Figma stacks up to ten artwork layers behind the page (sun, world, section
backdrops, bridges). `.page-atmosphere` reproduces this as a single element
with a multi-layer `background-image`/`background-size`/`background-position`
triplet — one entry per layer, **listed top layer first**, because CSS paint
order is the reverse of Figma's layer order. Width is a `%` of the viewport
(so the composition scales with the screen) but height is always `auto`, so
each layer keeps the aspect ratio it was exported at; a second percentage
would squash the art whenever the page renders taller or shorter than the
6674px Figma frame. Per-layer opacity is baked into each webp's alpha channel
at export time (there's no way to dim one layer of a multi-layer CSS
background), which is why you won't find opacity values here even though the
design clearly has some.

`.page-atmosphere-concept` is the same idea with the sun/world layers
omitted — the `/concept` route animates those as DOM elements instead. See
[`src/components/concept/README.md`](../components/concept/README.md).

### The "sky freeze" hack

Past 1920px the shine/globe backgrounds in `.page-atmosphere` keep scaling
with the viewport while the content measures stop growing (they're capped at
their `--container-*` pixel value), so on an ultra-wide monitor the sun would
visibly sink relative to the hero copy. `--sky-lift-shine` / `--sky-lift-globe`
compensate by nudging each layer's vertical position upward past 1920px, then
`--sky-shine-width` / `--sky-globe-width` cap the layers' own growth at
2000px so the composition just holds still beyond that rather than climbing
indefinitely. If you touch hero-artwork sizing, re-check this range
specifically (1920–2000px and beyond) — it's the one place the layout
intentionally stops being a straight scale-down.

## Container queries on the product tiles

`ProductCard` (`components/home/ProductCard.tsx`) is a `@container` sized in
`cqw` rather than the page's fluid `clamp()` tokens, because the tile's
internal type/insets need to hold the proportions Figma drew **at the tile's
own 392px width**, whatever column count the surrounding grid is currently
showing (1–4 columns depending on breakpoint). If you add another component
whose internal proportions are driven by its own box rather than the
viewport, this is the pattern to copy — not another `clamp()`.

## Fonts

Local: Magically (display headings) and Gill Sans (body — light/regular ×
normal/italic only; there is no bold cut, so don't reach for `font-bold` on
Gill Sans text). Cinzel loads from Google Fonts (`next/font/google`) and
backs `--font-serif`, used for taglines, buttons and quotes. All three are
registered as CSS variables in `layout.tsx` and consumed via the
`--font-display` / `--font-serif` / `--font-sans` theme tokens — never
reference a font file or Google Fonts import from inside a component.
