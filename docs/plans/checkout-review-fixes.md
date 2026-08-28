# Fixing what the checkout review found

The Stripe surface built across `b173489..fc0585e` — the write seam, the live
price, the wallet sheet and the confirmation — reviewed against `CONTEXT.md`
and against the plans in this directory. Nine findings, grouped by what they
actually cost, not by which axis found them.

Nothing here changes what the checkout does. Two items change what a customer
sees when something goes wrong, three change names, and the rest delete or move
code that is already dead or already misplaced.

## 1. A blocked `js.stripe.com` strands the customer on "Checking your payment"

The worst of them, and the only one a paying customer can hit today.

`CheckoutComplete.tsx` runs its whole retrieval inside one `void (async () => …)`
with no `try`/`catch`. Two awaits in it reject rather than resolve:

```ts
const stripe = await getStripe();
…
const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
```

`getStripe()` rejects when `js.stripe.com` is blocked — an ad blocker, a
corporate proxy, a dropped connection mid-load. `retrievePaymentIntent` rejects
on a network failure. Neither is the resolved `{ error }` shape, so neither
reaches the `error` branch: the promise rejects unhandled, `setResult` is never
called, and the screen holds `{ state: "checking" }` for as long as the tab is
open. Somebody whose card has just been charged is told, permanently, that we
are checking.

`check:confirmation` cannot see this. It asserts on the *rendered* states, and
"checking" is a legitimate one.

**The fix.** Wrap the async body in `try`/`catch` and land in `error` — which is
the state written for exactly this ("Stripe refused the retrieval. Says nothing
about whether money moved"), and whose copy is already honest about not knowing.
Guard the `setResult` in the `catch` with `live`, like every other one.

Assert it: a test that makes `getStripe` reject and expects the error heading,
not the checking heading. Without that, the next refactor puts the hang back.

## 2. Four screens that took no money are titled "Payment received"

`checkoutCompleteCopy.title` is `"Payment received"`, and
`checkout/complete/page.tsx` uses it as the route's static `<title>` for all
seven states. The `unpaid`, `unfinished`, `unknown` and `error` screens each say
in the body that no payment was taken, above a tab reading "Payment received —
The World Tarot".

The confirmation plan is unambiguous: *"It reports a **payment**. It never
reports a **fulfilment**"*, and of the reached-with-nothing state, *"the honest
message must not read as a confirmation."* A tab title is the part of a page
that gets screenshotted and re-read.

**The fix.** The title cannot vary by outcome — this is a static export and the
outcome is only known client-side, after the metadata has shipped. So it has to
be a title that is true in all seven states. `"Your payment"` or `"Checkout"`;
not `"Payment received"`, and not anything that names a result. Rename the field
from `title` to something that says what it is for (`pageTitle`) while touching
it, since its one caller is the `<title>`.

## 3. The build guard has two escapes the plan doesn't have

The guard's own plan gives a table with `| any | unset | refused |` and says
*"Both failures the guard catches are silent ones."* Two holes:

- `next.config.mjs:49` — `ALLOW_LOCAL_API_BUILD=1` returns early out of
  `assertStripeKeyMatchesApi` entirely, so it disables the live-key-on-staging
  check as well as the missing-key one. That flag exists to allow a local
  preview build against a loopback API. It should not also permit shipping a
  live key to staging.
- `next.config.mjs:62` — `if (!apiBase) return;` lets a `pk_live_` key through
  whenever `NEXT_PUBLIC_API_BASE_URL` is unset. But an unset API base is already
  refused by `assertDeployableApiBase`… only when it is *set and loopback*. Unset
  passes both.

**The fix.** Narrow the bypass to what it is for: let
`ALLOW_LOCAL_API_BUILD=1` skip the *unset-key* throw only, and keep the
key/environment mismatch checks running whenever a key is present. Then make an
unset `apiBase` refuse rather than return, so the two functions stop each
assuming the other covers it. Keep the error messages — they are the good part
of this code.

## 4. `orders.ts` splits Money back into loose primitives

`CONTEXT.md`, *Money*: *"a currency and an integer count of its minor units,
**always together** … Avoid: amount on its own."*

```ts
export type OrderLine = { product: string; unitAmount: number; … };
export type Order = { …; currency: string; totalAmount: number; lines: OrderLine[] };
```

`OrderLine.unitAmount` is an amount with no currency anywhere on the type.
`Order` has the pair, as two fields that nothing keeps together. `product.ts` and
`checkout-session.ts` both use `Money` properly — this file and `CheckoutProbe`'s
`Report` are the two outliers, and they are the two nearest the payment.

**The fix.** `Order.total: Money`, `OrderLine.unitPrice: Money`, built in
`placeOrder`'s mapping from the one `order.currency` the API sends (the wire
shape stays exactly as it is — this is a mapping change, not an API change).
`orders.test.ts` asserts on `totalAmount` and `unitAmount` and moves with it.
`CheckoutProbe`'s `Report` follows.

This is worth doing before anything else consumes `Order`. Right now the only
reader is the probe.

## 5. The component named for the term the glossary forbids

`CONTEXT.md` defines the thing we mount as the **express checkout element**, and
lists *wallet button* under _Avoid_ for it. Our file is `WalletButton.tsx`,
exporting `WalletButton`, marked `data-wallet-row`, documented under a README
heading "### The wallet button".

The distinction the glossary is drawing is real, not pedantry: the element is
one control that *draws* wallet buttons, plural, and which ones it draws is
Stripe's decision at runtime — which is the entire reason `c27d69f` had to stop
listening to Apple and start listening to `availablepaymentmethodschange`. A name
that says "the Apple Pay button" is the name that produced that bug.

**The fix.** `ExpressCheckout` in `src/components/reading/ExpressCheckout.tsx`,
`data-express-checkout`, and the same rename through `GetMyReading.tsx`,
`lib/stripe.ts`'s prose, and the README heading. Note that CONTEXT.md's own prose
uses "wallet button" correctly elsewhere — for the individual button inside the
sheet's origin story — so this is not a find-and-replace over the docs. Only the
places naming *our element* change.

`apple-pay-sheet.md` names `WalletButton` too; update the plan or leave a line
saying what it was renamed to.

## 6. `CheckoutComplete` knows too much about the record

```ts
const intentId = urlIntent ?? (record ? paymentIntentId(record.clientSecret) : null);
const clientSecret = urlSecret ?? record?.clientSecret ?? null;
const recordApplies = record !== null && paymentIntentId(record.clientSecret) === intentId;
```

Three walks into `CheckoutRecord` to answer one question: *is there a record for
the payment I am displaying?* The stale-result guard is the sharpest rule in the
confirmation plan, and it currently lives in a component, spelled out in a
screen's effect.

**The fix.** One function in `checkout-session.ts` — `checkoutFor(intentId)`,
returning the record only when its derived intent id matches — and the component
asks for it. The guard then sits beside `paymentIntentId`, the function it
depends on, and can be tested without a React render.

Do this after #1: the `try`/`catch` touches the same block.

## 7. Dead code in `checkout-session.ts`

`rememberCheckout` and `forgetCheckout` have no non-test callers.
`forgetCheckout` says so itself: *"Nothing on the confirmation path calls this."*
Nothing in the tree writes the record `recallCheckout` reads, so the entire
session-only arrival path — a documented half of the confirmation plan — is
unreachable until the payment panel lands.

`payOrder(payToken, { method })` is the same shape: no caller passes `method`,
and the docblock justifies it by a gifting feature that does not exist.

**The decision, not a fix.** `rememberCheckout` is about to acquire its caller
(#38, the payment panel). `forgetCheckout` and `method` are not. Delete those
two; keep `rememberCheckout` and note in its docblock which ticket calls it, so
the next reader knows it is early rather than orphaned.

## 8. `stripe.ts` changes for two reasons

Script loading (`getStripe`, the singleton, the SDK's failure modes) and the
`walletAppearance` token map are in one file and change for unrelated reasons —
a Stripe SDK upgrade versus a design token. Small, and only worth splitting when
the appearance map next grows. Note it; don't act yet.

## 9. `/checkout-probe/` is unspecced and unguarded, and places real orders

No plan in `docs/plans/` covers `orders.ts`, `api-write.ts`, `CheckoutProbe.tsx`
or the route. The page's own docblock argues for shipping it unguarded, and that
argument is sound while the write seam is being proved from a browser. What is
missing is anything that removes it: its delete condition (#38 ships) is a
sentence in a comment, and anyone who finds the URL in the meantime places a real
pending order against staging.

**The fix.** Not a guard — a ticket. Open one that deletes the route, blocked on
#38, so the condition lives somewhere that gets closed rather than somewhere that
gets read.

## Order to do them in

1. #1 — the hang. On its own, with its test.
2. #2, #3 — the two honesty fixes, small and independent.
3. #4 — `Money` through `orders.ts`, while the probe is still its only reader.
4. #5 — the rename, mechanical, best alone in a commit.
5. #6, #7 — the confirmation tidy-up, after #1 has settled.
6. #9 — a ticket, not a commit. #8 is a note.

`check:confirmation` must pass throughout, and #1 adds the assertion it is
missing.
