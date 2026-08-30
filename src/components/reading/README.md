# A reading's own page

Built from one Figma frame, `329:496` (`month-ahead-reading-page`, 1920x3191),
plus a handful of things the frame does not draw at all — see [Beyond the
frame](#beyond-the-frame). Route:
`src/app/(site)/readings/month-ahead/page.tsx`. Copy lives in
[`src/content/reading-pages.ts`](../../content/reading-pages.ts).

Read [`src/app/README.md`](../../app/README.md) first — the token system, the
`.stack` rule and the "no absolute positioning for layout" rule all apply here —
and then [`../readings/README.md`](../readings/README.md), because this page is
built out of that page's panels and shares its hover, its rules and its
ornaments. This file only covers what is specific to a single reading's page.

## Three products, one page

Three Card, Month Ahead and a future In-Depth reading are **the same page**.
Per the client (see `conversation-w-client.txt` in the repo root) they are one
purchase and one fulfilment path: the site takes an optional question and a
payment, she writes the reading offline and emails a PDF. Spread, card count,
price and testimonial are copy — they never reach logic.

So `reading-pages.ts` splits in two. `readingPageChrome` is everything the
three say identically and is written once; a `ReadingPage` is the handful of
things that differ. Adding the other two is a `ReadingPage` and a route that
imports it, and **nothing else** — don't build per-product delivery UI for
them. The hero film is chrome rather than product copy for the same reason: one
loop of the deck serves all three.

Only Month Ahead is wired up, because it is the only one the client has drawn.

## What the frame is, and what it isn't

The same lossy PSD conversion the readings index has, so the same warnings
apply: every text node is a free-floating absolute box, and **things Figma
reports as centred usually aren't.** The two panels sit 255px from the left
edge and 234px from the right; the payment column is 73px from one side of its
section and 55px from the other; the studs on a panel's top edge are 21.3% in
on the left and 18.8% in on the right. None of that is a design decision.
**Everything centres.** Don't restore the offsets.

The overlaps are the same story — a 150px quote glyph whose box runs through
the words under it, a redeem button whose box runs into the rule below it.
Those are text boxes sized with leading, not overlapping elements; the flow
layout resolves them.

## The backdrop is one photograph, not nine layers

Figma stacks nine layers behind this frame. **Seven of them are not worth an
asset and one of them is not a backdrop**, which is worth knowing before anyone
re-exports them:

| Layer | What it actually is |
| --- | --- |
| `bg-texture`, `bg-texture-alt` | the same export twice, a dead flat `#081525` — which is exactly `--color-night` |
| `bg-glow-mid` | that colour again, flat |
| `bg-vignette` | flat `#0f1a27` |
| `bg-floor`, `bg-floor-overlay` | real artwork, and completely covered by `bg-atmosphere` above them |
| `bg-accent-dot` | one pixel |
| `bg-clouds` | the **left panel's fill**, drawn here — see below |
| `bg-atmosphere` | the page |

`bg-atmosphere` is a 1920x3191 photograph of the domed observatory, opaque edge
to edge, so everything under it is invisible. It ships as
`reading-observatory.webp` and it is the whole backdrop.

**`bg-clouds` is the trap in this frame.** It sits in the background group, so
it reads as a ninth page layer, and it is not one: it is 684x2049 of night sky
positioned to the pixel over where the left panel lands — 4px in from its left
edge, 24px above its top border, 20px short of its bottom. It is that panel's
fill, exactly as the flat wash is the right panel's. The client's own name for
the file settles it: `CLOUDS BEHIND CARD.png`. Laid on the page it draws a
hard-edged rectangle down the middle of the room, because that rectangle is the
panel it was cut for; laid on the panel's body it is the weather her PSD shows
behind the reading, clipped to the frame's own curve, with the observatory
still visible through the thin parts of it. See `.reading-panel-sky`.

How `bg-atmosphere` behaves is the readings parlour's rule, verbatim: the
artwork is width-driven rather than `cover`-to-fill so the room is never
cropped down to a vertical slice on a page several times taller than the frame,
it stands on the floor of the page, and it dissolves into the flat colour at
the top. It costs nothing to look at even at 1920, where the artwork fills the
page exactly, because the dome's apex averages `rgb(11, 20, 36)` against the
`rgb(8, 21, 37)` it fades into.

Below `lg` that leaves flat colour above the room, so the page gains a sky from
the top the way the readings index does — the same construction and **the same
asset**, `readings-sky-mobile.webp`. Her clouds are the obvious choice and the
wrong one: they are already on that screen at that width, filling the left
panel, so behind it as well the page would show one photograph twice at two
scales a few hundred pixels apart.

## The two panels

Both are `OrnateFrame variant="column"` — the same rebuilt-from-tokens gold
rectangle every panel on the readings index is, at a corner measured off the
border exports rather than read from Figma (42px on 687 and 41px on 686, so
6.05%). Figma ships each as a 687x2097 bitmap; as everywhere else on this site,
**neither is used.**

What is new is what sits astride the top edge. Both panels wear three marks: a
diamond cluster a fifth of the way in from either end, and something in the
middle. `.panel-marks` is a row with no height of its own laid on the border
line, so every mark centres on the line whatever its own height, and it works
the same on an open frame and a closed one. Three children put the third in the
middle; two leave the middle to the legend.

**The difference between the two panels is whether the border makes room for
the middle mark**, and that is the only difference:

- The **left** panel's moon sits in a gap, so it is the frame's `legend` — and
  the gap is the legend's own grid column, which means it is the moon's width
  that opens the border, with nothing to keep in sync. Figma's gap is 100px and
  the moon's box is 99px, so this is exactly what she drew.
- The **right** panel's trio sits on an unbroken line, so it is just a third
  child of `.panel-marks`. It is `frame-ornament-trio-sm.webp`, the crop the
  readings cards already wear — 26x17 here against 26x16 there, the same art.

`legendMark` is what tells the frame the legend is an ornament. Everything the
open frame does above that prop is about a heading's *first line* — where the
rule crosses the capitals, how far a bracket hangs to meet it — and a mark has
no line to hang from. In a zero-height row `align-self: center` is exact and
needs no measurement.

Two things about the left panel are easy to get wrong.

**Its body's top padding must be `cqw`, and must clear 7.79cqw.** That is the
half of the crescent hanging below the line. The moon scales with the panel; a
`vw` padding does not, so at the widths where the panel is widest relative to
the viewport — around 1023px, just before the two columns split — a `vw` value
lands the crescent on top of the title. `ReadingPanel` deliberately does not
set this: `.ornate-frame--open` sizes it off the legend's *type*, which a mark
does not have, so it has to come from the caller and the caller has to know
why.

**The mobile block in `globals.css` that re-templates `.ornate-frame--open` is
scoped to `.ornate-frame--panel`, and has to stay that way.** Those rules build
the signature panel's phone layout — a four-column grid at 14%/45%/87%, a body
and a copy column dissolved with `display: contents`, a price stepping outside
the border. Unscoped they also caught this panel, which wants the base
three-column template at every width, and folded it in half. `--panel` sits on
the `@container` wrapper and `--open` on the box inside it, so a descendant
selector separates them with nothing to keep in sync.

## The order form is the one piece of state

`ReadingOrder` is the only client component on the page. It holds one boolean
and asks the catalogue what the reading costs.

### The price is the API's, and so is whether there is one

`useProduct(reading.productKey)` reads `GET /api/v1/{locale}/products/{key}` in
the browser — **never at build time**, since prices resolve per visitor from
their country and a baked response would ship one country's currency to
everybody. The answer is a state rather than a number, and one sentence decides
all of them: **where there is no live money there are no payment controls.**

| State | Price line | Controls |
| --- | --- | --- |
| Loading | A resting placeholder, at the line's own height | None, and their height is reserved |
| Live | `formatPrice(money)`, site locale, never the browser's | Buy Now, live — and the only place the price is said |
| Unreachable | The bundled `reading.price`, as plain copy | The frames, none of which can pay |
| Withdrawn (404) | — | — (`ReadingOrder` renders no form at all) |

Three things about that table are decisions rather than mechanics:

- **`reading.price` is copy and can never be money.** It has no currency in it,
  so an order placed from it would be an order at a number this repo typed. It
  exists so an unreachable backend does not leave a blank where the price was
- **A 404 takes the offer off the page**, question field included — the same
  call the homepage makes when it drops a tile the catalogue answered without
  (`HIDE_WITHDRAWN` in `lib/products.ts`). The rest of the page is untouched;
  it just does not sell anything. The `#get-my-reading` anchor moved onto the
  wrapper so the closing call to action still lands in every state
- **The controls block reserves its own height** while loading — `invisible`
  plus `inert`, so it is unreachable by pointer, tab, screen reader and
  `click()` alike, rather than a `min-height` that would be wrong at one of the
  panel's four widths. A customer reaching for a payment button must not have
  it move

`npm run check:panel` drives every state against the real export with the whole
checkout intercepted — the catalogue, `/orders` and `/pay` — which is what lets
it **press** Buy Now rather than only look at it. `-- --live` runs the live case
against the API in `.env.local` instead and presses nothing, from port 3000
because that is the origin staging's CORS list carries. See
`docs/plans/reading-page-live-price.md` and `docs/plans/hosted-checkout.md`.

### Buy Now is a redirect, and the wallet is not

`BuyNow` is ~~the only control on the panel that takes money~~ — from 29 August
2026 the wallet row above it takes money too, and the two do it in different
places, which is the whole of the difference between them. Pressing Buy Now
places an order, starts its payment and sends the browser to Stripe's **hosted
page**: nothing is collected on this page and, on this road, no Stripe.js is
loaded on it. The wallet stays here and confirms in an iframe on our own origin.
See `docs/adr/0002-checkout-happens-on-stripes-page.md`,
`docs/plans/hosted-checkout.md` and the wallet row below.

It is mounted from `offer.money` — which exists on `live` and on no other state
— so an order placed at a price this repo typed will not compile.

Four things about it are worth knowing before changing any of it.

- **Two round trips happen before the browser leaves**, and the button holds a
  pending state across both. Place the order, then pay it: folding them into one
  call buys about 300ms and destroys the shape that makes a retry safe, since a
  second press pays the order rather than placing another one. Placing it
  earlier, on question blur, mints a `pending` order for everyone who types a
  sentence and leaves
- **The checkout is remembered before the navigation**, because afterwards there
  is no code of ours left running to remember anything. `lib/checkout-session.ts`
  holds the pay token, the Money the backend priced, the question — which is what
  a cancelled checkout puts back in the textarea, and only on the page whose
  `productKey` matches — and the id the confirmation is guarded on: a Session id
  on the card road, a **client secret** on the wallet road, from which the intent
  id is derived. Each road's guard refuses the other's record, so neither branch
  of the confirmation has to know the other exists
- **It is inert in gift mode**, and says so — **for the wallet row as well from
  30 August 2026**, which is absent there rather than inert and would otherwise
  go without a word. `POST /orders` has no field for a recipient email or a gift
  message, so one live button there charges somebody for a gift delivered to
  themselves
- **An instruction this build cannot read refuses the press** rather than
  crashing it. `nothing_to_pay` on a fresh order, a `client_secret` this page
  has no element for, or a `type` a later backend invents: the order exists, it
  is `pending`, nothing has been charged, and the panel says exactly that

### The wallet row, above Buy Now

`ExpressCheckout.tsx` **renders again** from 29 August 2026, which is #48.
~~Unrendered rather than removed~~ — it was a dud while `/pay` had no
`stripe_wallet` behind it, and a button that fails after Face ID had no business
sitting beside one that charges. The backend's
`docs/adr/0003-the-wallet-keeps-its-own-payment-intent.md` gave it one: `/pay`
takes a `method`, and answers a `client_secret` the element confirms against.
Both roads now name themselves in that call — the card road sends
`method: "stripe"` — so neither is a default the backend has to assume.

It is drawn on `live` **and** where the API offers the method **and** not while
gifting. The middle one is `lib/payment-methods.ts`, and it rests at `false`: an
environment with no Stripe keys — a laptop — must draw the card button alone
rather than a wallet that would fail on its first call.

**The buttons are the frames' width**, and were not until 29 August 2026. The
row is a flex box, so the div react-stripe-js mounts the element into was sized
by its content — and Stripe's content asks for 300px, which drew a 292px wallet
button in a 498px column of 498px frames. `w-full` on the element is the whole
fix; the iframe reads 8px wider than the column because Stripe insets what it
draws by the 4px it bleeds.

**Height followed on 30 August 2026**, and the frames came to meet it. Three
changes in one, all at the client's request, and none of them stands alone.

`buttonHeight` is a number of pixels while the frames are an `em` off a `clamp`
on the viewport, so no unit passes between them — but `useFrameHeight` measures
a frame with a `ResizeObserver` and hands Stripe the pixel, which is legal after
mount because `buttonHeight` is a member of the element's update options. Before
that it was the constant 55, right at one width of the page and wrong either
side: below about 1330px the wallet button stood **taller than every frame
beneath it**, by 3px at 1280 and 16px at 430.

That alone left the two ends open, because Stripe will not take a height outside
40px to 55px. So `.checkout-option` holds `clamp(40px, 2.6em, 55px)` — the
frames stop where the button stops. **The cost is the client's drawing**: 78px
at 30px type becomes 55px above about 1354px.

And capping the box exposed the marks. `Mark` is a share of the panel in `cqw`,
so once the frame stopped growing the marks did not: at 1920 the two gift frames
stood at 65px and 66.9px beside a 55px Buy Now. `.checkout-option img` caps a
mark at the proportion Figma draws — a 52px mark in a 78px frame — which the
card mark, drawn shorter, never reaches. **The same rule closes the 600px to
1023px unevenness `085774b` left open** as a decision rather than a tidy-up.

Measured against the built export at seventeen widths from 320 to 1920: the
three frames are the same height at every one of them, and the wallet button is
never taller than the frame it stands in — level at eleven widths and at most
0.7px short at the rest, where the frame is fractional and `buttonHeight` is an
integer.

**The row collapses to nothing where the browser has no wallet**, which is every
browser this repo's checks run in. Two facts, not one: zero height, and no gap.
The row is a child of a flex column with `gap-[0.4em]` and **a gap applies to a
zero-height child like any other**, so the collapsed row carries `-mb-[0.4em]`
to cancel the one gap it is responsible for. That number belongs to
`GetMyReading`'s column and has to move if the `gap` does. `check:panel` proves
it the only way it can be seen from outside: the panel's settled height equals
its loading height, so the row costs the column nothing.

`check:panel` asserts everything around the button, because no headless browser
will ever see the button itself — Stripe draws one only in Safari with a card in
Wallet, or Chrome signed into Google Pay, on a registered payment method domain.
So: that the element **mounts** on `live`, that the row quotes the API's money,
that it collapses, and that **no other state mounts one** — gifting having
mounted one first, at which point the toggle has to take it away again.

**Where no row is drawn at all, `js.stripe.com` is not fetched either.** That
assertion earns its place: it failed on 29 August 2026 in three states at once
and what it had caught was real. `@stripe/stripe-js`'s main entry point injects
the script from its own top level, so importing it anywhere fetched it
everywhere, however carefully `lib/stripe.ts` deferred its own `loadStripe`.
`lib/stripe.ts` imports `@stripe/stripe-js/pure` for that reason and must keep
doing so. Nothing visible was wrong, which is why nothing else would have found
it.

That a real device draws a real button and the sheet takes a real payment is
proved by hand on `staging.theworldtarot.com`, in Safari and in Chrome — and it
needs `staging.theworldtarot.com` registered as a Stripe **payment method
domain** in test mode. Stripe registers exact hostnames, so the apex does not
cover it, and an unregistered one fails by the button silently not appearing,
which is indistinguishable from a device with no wallet. That the hosted card
page opens, quotes the order total and takes a test card is #47.

### Gift is a mode, not a page

Clicking "Gift a Reading" turns the order into a gift order **in place**: the
question section becomes recipient details, the payment stays where it was, and
the price, the product and everything else the visitor was looking at holds
still. A separate `/readings/gift` page would have to restate all of it and
would lose the reading they had already chosen.

**The purchaser never gets a question field**, which is the hard constraint and
the reason this is a swap rather than a disclosure. The two sections are
mutually exclusive in the DOM, so there is no hidden `question` input left in
the form to submit with a gift — hiding one with CSS would have satisfied the
design and not the requirement. The recipient asks their own question after
they redeem.

Two departures from the frame come with it, and both answer the same problem.
The client puts "Gift a Reading" at the foot of the payment column, and what it
changes is a section most of a panel above it — an action whose effect is off
screen. Rather than move her button:

- entering gift mode **moves focus into the recipient's email field**
  (`CountedField`'s `autoFocusOnMount`), which brings the visitor to the part
  of the page that just became different;
- the button **says what it is** — `aria-pressed`, a gold
  `.checkout-option[aria-pressed="true"]` state that does not depend on a
  pointer being near it, and a label that becomes the way back out, so gift
  mode is never somewhere a visitor is stuck.

The recipient's side of the flow — redeem, then ask — is not built. `redeem
gift code` is a dud. **Both payment controls take money in gift mode**, from 30
August 2026 and at the client's request.

They did not until then, and the reason they did not was sound as far as it
went: `POST /orders` has no field for a recipient, so an order placed in gift
mode arrived carrying no evidence that it was one. Why that stopped being a
reason to refuse the money is argued in `GetMyReading`, beside the gate it
removed.

So the recipient rides to the backend on the order line instead. `orderNoteIn`
reads whichever of the two sections is mounted and composes the gift's two
fields into the line's `question`, which is the field the admin orders table
already prints; see `lib/order-note.ts`. Two things fall out of that and are
worth knowing before reading either file:

- **A gift order is never indistinguishable from a self-purchase**, however
  little the buyer typed — which is also why `orderFormAccepts` exists. Nothing
  submits this form, so the `required` on the recipient's address was decoration
  until the panel could take money; both controls now ask for it before they
  place anything.
- **The record is flagged and the restore refuses it.** A cancelled gift
  checkout must not refill the question textarea with a note this code composed,
  so `CheckoutRecord.gift` marks it and `questionFor` turns it down.

**What the wallet row taught, and why it came back first.** The row was
unmounted rather than made inert, because a wallet takes the money the instant a
face is recognised and there is no inert state worth leaving that in. That made
it the one control here that became unavailable without saying anything, and
only on the devices that had it to lose — which is why it read as a bug rather
than as "not yet", and why it is what the client noticed. `checkout.giftingComing`
still stands under Buy Now and still names neither control and no payment
method, but it no longer refuses the payment: what is unfinished is the delivery
behind it, and the note says a person will arrange that by email. There is no
second note anywhere: two sentences saying one thing is not what this panel
does.

### One of the three controls is a dud, on purpose

There is no redemption flow, so `Redeem A Gift Code` is `type="button"` with
nothing behind it. **Inert rather than submitting**: the form has no action, so
a submit would reload the page with the visitor's question in the query string,
which is a worse nothing than nothing. It is a real button rather than a
disabled one because the client rejected a disabled control elsewhere on the
site — it reads as a bug rather than as "not yet", and that is why the one
state in which Buy Now cannot be pressed — no live price — is `aria-disabled`
rather than `disabled` too.

The form itself stays, with its fields named. That is what makes wiring the
checkout a matter of adding an endpoint rather than restructuring the panel.

### Delivery is a CMS switch

`rushDelivery.enabled` is the client's, not the code's. **Off** — the state
that ships — a reading offers one delivery and states it, as the frame draws
it. **On**, that line becomes two radios with standard still `defaultChecked`,
so throwing the switch never changes what a visitor gets by doing nothing.

The standard option is labelled "Standard Delivery" rather than the product's
own delivery line. "Delivery Time: within 24 hours" is right when it is the
only thing on offer and reads as a contradiction beside an upgrade called
24-Hour Rush. **Worth raising with the client**: as written, the rush buys
nothing this product does not already promise.

### The counter

`CountedField` enforces the limit twice and means to: `maxlength` on the field,
so it cannot be exceeded, and `0/500` under it, so the visitor sees it coming.
A `maxlength` alone stops somebody typing and never says why, which reads as
the keyboard breaking. Both numbers come from `questionLimit`.

It is uncontrolled apart from the count. What is typed is read off the form at
the moment of a press, by `orderNoteIn`, rather than held in React — a
controlled value in `ReadingOrder` would re-render the whole panel on every
keystroke to do it.

## The rest of the furniture

- **Section headings** (`Ask a Question`, `Get My Reading`, `Your Reading`,
  `Beyond the Gate`) are `.flanked` one weight lighter — `.flanked--hairline`.
  Figma ships each as a 626x1 bitmap that is solid `#e4c46a` up to the words
  and transparent behind them, which is a rule with a gap in it. Here the gap
  is the heading's own width.
- **The three inner frames** — the gate photograph, the testimonial, the
  question field — are drawn at 21px, 18px and 20px corners on boxes of 616,
  616 and 607. Within half a percent of each other, so they are one value,
  `.ornate-frame--inset` at 3.2%. The gate and the testimonial are
  `OrnateFrame`s, which clips the photograph to the frame's own curve rather
  than letting a baked radius drift out of register with it; the fields carry
  their own border so the gold can answer focus, which `.field` already knows
  how to do.
- **The checkout controls** are one box, `.checkout-option`, a modifier on
  `.btn-ghost`. Figma draws all five identically (498x78, 2px gold, 25px
  corner) and changes only the mark inside; Buy Now wears the same box, so the
  column still reads as one set of frames while it stands where three of them
  did. Unlike `.readings-cta` they never hug their labels: each fills the width
  it is given, and that is also the only thing keeping a mark and a five-word
  label the same size as each other. **The padding is what makes their heights
  equal**, and both halves of it earn their number: the inline padding is never
  seen on a box that fills its width with centred contents, so it is only the
  width at which a label wraps, and the block padding is what lets a label that
  wraps anyway still stand inside the frame's own minimum rather than growing
  it.
  **Two things moved on 30 August 2026**, both at the client's request. The box
  sets Gill Sans Light rather than inheriting `.btn-ghost`'s serif — which is
  why the labels were re-cased in `reading-pages.ts` in the same change, since
  Cinzel's small capitals had been doing the shouting for two of them and Gill
  Sans draws what the string says. And the two gift frames under the Stripe
  line were pulled in to 84% of the payment frames' width, so the width is now
  set per frame in `GetMyReading` rather than once here. See the comment on
  `.checkout-option`.
- **The testimonial's opening mark states its own height.** A `“` is ink near
  the cap line and nothing else, so at 150px its line box is 150px tall with
  about 40px of that inked — left alone it hangs most of a paragraph of empty
  box over the words. Squeezing `line-height` instead is the trap: a short line
  box shrinks around the *baseline*, so the ink climbs with it and the top of
  the mark ends up above the frame, where the panel clips it off. A declared
  height leaves the glyph where its metrics put it and fixes only what it
  contributes to the flow; the padding inside that height is what moves it down
  the frame. Turn the two together — the box is `border-box`, so raising both
  by the same amount moves the mark without moving the quote.
- **A medallion in Your Reading drops an eighth of a line when its copy runs to
  two.** Centred on the first line, as Figma centres all five, a mark against
  two lines reads as riding high; centred on the whole block — which is what
  `align-items: center` gives for free, and it was tried — it drops half a line
  and reads as sitting low, and so does a quarter. An eighth is the one number
  in that file that is neither Figma's nor arithmetic: it was settled by eye
  against the rendered page over three passes, so move it by eye too. The line
  count is the copy's own shape: `included` is a list of phrases per line, so
  its length *is* how many lines the entry sets at the width she drew.
- **A feature prop turns on its side below `md`, and the row of three breaks
  much later, at `xl`.** Two different widths on purpose. The compass stands
  beside the words at `md` and up, which is what the frame draws, and over them
  below it at the homepage's own size — a compass beside two lines of 22px type
  has nowhere to go on a phone. Three *across*, though, needs 1384px of the
  1431 the row is given, and it only keeps fitting while the type and the
  column shrink together: `--text-caption` bottoms out at 13px around 1150px
  while the column carries on narrowing, so below there no gap or compass size
  saves the longest line. `xl` is the nearest step above that. Between the two
  a prop is a full-width row of its own, which suits it.
- **The gap between the three is 24px, not the page gutter's 60.** The client's
  own render leaves about 35px and 3px between props; at 60 a third of the row
  came to 293px against the 301px her longest description line measures, and
  that prop ran to three lines. The gaps were the only slack there was to give
  back. It now clears by 5.3% at every width the row is three across — which is
  the number to re-check if that copy ever gets longer.
- **A feature prop has three widths and none of them is the column's.** The
  rule is 277px. The title never wraps — Figma sets it `nowrap` and lets it
  overhang the rule, which is the look: a name on one line over a line. And the
  body has its own 408px, wider than the rule again, which is the measure her
  two phrases were broken to; at the rule's width the first of them wrapped and
  the prop ran to three lines. Each child states its own, the column takes
  whichever is widest, and `min-w-0` on the row keeps a long title overhanging
  its third of the page rather than growing the track.
- **The question's standfirst is capped at 480px.** Her two phrases come to
  about 632px against a 626px column, so they very nearly ride one line — and
  our Gill Sans renders a shade wider than the PSD's, which is not a thing to
  leave to the rendering. The cap is comfortably over the longer phrase and
  comfortably under the pair. Same trap as the reading cards' seven-pixel
  window on the index.
- **The closing saying** is the readings index's `ClosingSaying`, given props.
  Both frames end with the same two rules, the same 50px display line and the
  same gold button; only the words, their colour and the button's destination
  change.

## Beyond the frame

Four things on this page the client's frame does not draw.

### The hero is film

Figma names that box `hero-video-placeholder` and it was one. The client's
`CARDS.mov` (1920x1080, 27.8s) now fills it — **cropped at encode time** to the
606x406 she draws rather than fitted in CSS, so nothing is downloaded to be
thrown away, and encoded at twice that for a retina screen. H.264 CRF 26, audio
stripped, `+faststart`, 4.9MB.

The still beneath it is that film's own first frame doing two jobs: the
`poster`, so the box is never empty while the video buffers, and what stays on
screen for a visitor who has asked their system for less motion — the video is
`motion-reduce:hidden` and the frame beneath simply shows through. The pair
share a `.stack` cell rather than being swapped, so neither state moves the
panel.

`muted` is not a preference, it is the price of `autoPlay`: a browser will not
start a film with sound without a gesture, and there is no gesture to give it.

This one lives in `public/videos` like the card-back placeholder. The Living
Tarot films are to come from a backend endpoint (see
[`src/content/README.md`](../../content/README.md)); this is page furniture
rather than a card, so it does not go through that seam.

### The braziers are lit

The gate photograph never moves. What moves is a pair of overlays laid exactly
over the fires already in it, plus a wider, fainter layer under each for the
light they throw on the stone. The anchors were found by scanning the artwork
for its two red-dominant hot spots rather than placed by eye, which is why they
are not the round numbers they look like they should be: 32.4% and 64.9%
across, both standing on the bowls' rims at 58.8% down. The `.stack` states the
artwork's own 609x453 so those percentages resolve against the picture and not
against whatever the row works out to.

Both layers are `mix-blend-mode: screen`, so they add light rather than
painting over — a flame in flat colour sits on a photograph like a sticker.

**Nothing is allowed to read as a loop**, which is a constraint on the timings
rather than the shapes. The four animations run at 3.1s, 4.3s, 6.7s and 5.3s —
no two share a factor, so the composition they make together only repeats after
several minutes — and two of them start part-way in on a negative delay so the
sides are never in step even on the first pass. Within a cycle the keyframes
are deliberately uneven (13%, 27%, 41%, 58%, 73%, 89%) so a flame does not
breathe on a metre.

`prefers-reduced-motion` needs no rule of its own: the global block at the foot
of `globals.css` ends every animation after one iteration, which leaves both
layers resting on their 100% keyframe — a still fire, lit.

### Where GET MY READING goes

The frame draws the button at the foot of the page and gives it no destination.
The rule, written down in [`src/content/site.ts`](../../content/site.ts) beside
the masthead's copy of it:

- a page that sells one reading sends it to **that reading's checkout** — which
  on a reading page is on the page, so it is an anchor to `#get-my-reading`;
- every other page — the homepage, World Tarot, Living Tarot, the Library, the
  Collection — sends it to the **readings index**, because there is nothing to
  check out.

Both already held before this page existed (`headerActions.cta` and
`closingCta` both point at the readings index); the rule is now stated rather
than incidental. **They no longer spell it identically**: `headerActions.cta`
became `/readings/` on 29 August 2026, because the export is a directory of
`index.html` files and the unslashed form costs a 308. `closingCta` in
`content/home.ts` has not been moved yet. Same destination, one redirect apart.

### The gift flow

See [The order form](#the-order-form-is-the-one-piece-of-state). All of that
copy is ours, not the client's — her frame has no gift mode to draw — and it is
the first thing to hand her when she reviews this.

## There is no mobile mockup

The client drew this frame at 1920 and nothing else, so unlike the readings
index there is no second design to switch to and `lg` is not a seam here — it
is only where the two columns become one, and where the page gains its sky.

Stacked, each panel takes `--measure-reading`, which below `lg` is the same
81.33% every other panel on the site is inset to on a phone. That is
load-bearing for the same reason it is on the index: a panel's horizontal
measurements are `cqw` off its own box, so a panel 10% too wide renders
everything in it 10% too large.

They stack in source order — the reading and its payment first, then what
arrives and who says so — which is the order the desktop frame reads in as
well. If the client would rather a phone read what it buys before it is asked
to pay, that is a `flex-col` and an `order` on two children, and it is the one
thing on this page worth asking her about.

## What is reused, and what is new

Reused, after checking the pixels:

- **Every 448x55 rule on this page is `divider-hero.webp`**, already in the
  repo. Figma exports it four more times here and all four are the same art.
- **The compass under each of the three props is `compass-icon.webp`** — the
  same artwork the homepage's value props breathe with, at 132x149 against
  190x215, compared pixel for pixel rather than by name. It keeps the halo too.
- **The trio astride the right panel is `frame-ornament-trio-sm.webp`**, the
  readings cards' own crop.
- **The phone-only sky is `readings-sky-mobile.webp`**, the index's.
- **The panel borders, the button boxes, the inner frames and the gold CTA**
  are all tokens, as everywhere else. Figma's bitmaps of them go unused.
- **The right panel's wash** is a flat `#0a1421` at 51%, which is exactly
  `--color-ink`, so it ships as a colour rather than a 682x1987 export. The
  fields' fill is the same colour at 30%. The left panel's fill is the one that
  is a picture — see `bg-clouds` above.
- **Every other colour** already had a token. Figma sets the four section
  headings at `#dcd9d9`, `#dcd9d9`, `#f5f7fc` and `#d0d1d4` — one role, four
  values, which is the PSD; all four are `--color-mist`, which is the last of
  them exactly. The two with no near neighbour, the feature descriptions'
  `#a0aac4` and the testimonial's `#f4f8cf`, map to `--color-mist-dim` and
  `--color-cream`.
- **`ClosingSaying`, `StarRating`, `Divider`, `OrnateFrame`, `Phrase`,
  `Button`, `Section`/`Container`, `PageAtmosphere`, `.field`, `.btn-ghost`,
  `.panel-hover`, `.stack`** — all of it.

New: one measure (`--container-reading`, 1431px), two frame radii, one flanked
rule weight, one checkout-option box, the brazier overlays, the observatory
backdrop, the left panel's sky, the hero film and its poster, one photograph,
and six small marks (the moon, the medallion, the stud, and the four checkout
icons). The stud is the only ornament cropped out of a border export the way
the readings ones were, and it is cropped **with its own 2px of the line**: the
cluster's small diamond parts from the pair, and without the line segment
between them the crop leaves a slit wherever it lands a pixel off the border it
is laid over.

Two things the frame draws that are not shipped. Its gold beetle over Beyond
the Gate is replaced by the client's own silver drawing of the same 74x83 mark
(`asset dump/readings page/BUG.png`), which is the silver the headings around
it are set in. And the testimonial's 178x31 star bitmap is `StarRating`, as on
the homepage's two testimonials — a rating is a value, so it carries "rated 5
out of 5" to a screen reader and stays sharp at any size.

`HouseName` is new and general: it sets "World Tarot" in Cinzel wherever it
turns up in a line of copy, which is how Figma writes it inside an otherwise
Gill Sans sentence — Cinzel renders lowercase as small capitals, and that is
what makes it read as WORLD TAROT without the copy shouting in
`reading-pages.ts`.
