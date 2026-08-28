# The checkout write seam

> **Written 28 August 2026.** Closes #33. The frontend can place an order and start a
> payment from a browser on our own origin, over Sanctum's cookie flow. Everything that
> writes to the API from now on goes through one seam, `src/lib/api-write.ts`.
>
> Branch `checkout-write-seam`, cut from `staging` at `df1ad4c`. Commits `76b698f` (seam,
> orders, probe), `0b410d0` (standing lint, unrelated), `89108c8` (method diagnostic).

---

## The live proof, 28 August 2026

From `/checkout-probe/` on `staging.theworldtarot.com`, against `staging-api`:

```
order status  pending
total         1000 EUR (minor units)
pay type      client_secret
client secret pi_3U9Nz2Ky…_secret_…
```

**A pending order is itself the proof of the handshake.** Our staging origin is on the
backend's Sanctum stateful domain list, so a write with no CSRF header answers 419, not
422 and not 201. Getting a 201 means the cookie was fetched, stored, read, decoded and
echoed, and that CORS answered a credentialed request — none of which a test can
establish.

## What exists

**`src/lib/api-write.ts`** — the seam. `apiWrite<T>(path, body)` fetches
`/sanctum/csrf-cookie`, then POSTs with `credentials: "include"`, `cache: "no-store"`,
`Accept`, `Content-Type` and `X-XSRF-TOKEN`. On 419 it takes a fresh cookie and retries
**once**, then surfaces.

It is deliberately not a checkout file. The password pages (#35) are writes from the same
stateful origin and need the identical handshake, which is why it was built as a seam
rather than as part of an order module.

**The token is URL-decoded before it goes in the header.** Laravel URL-encodes the cookie
value. Sent raw it answers 419, which reads as a broken handshake rather than a missing
`decodeURIComponent`, and is the single most likely way to lose an afternoon in this area.

**Errors are typed at the seam**, so callers tell them apart without parsing bodies:

| Class | Status | Carries |
| --- | --- | --- |
| `ApiValidationError` | 422 | `errors`, keyed by field name — for an order, the line: `lines.0.product` |
| `ApiRateLimitError` | 429 | `retryAfterSeconds` from `Retry-After` |
| `ApiError` | everything else | `status` |

**`src/lib/orders.ts`** — `placeOrder` and `payOrder` on top of the seam. Neither endpoint
takes a locale segment: an order is the same order whatever language it was placed in.

`payOrder` returns a union read by its `type` field, never inferred from shape:

```ts
| { type: "client_secret"; clientSecret: string }
| { type: "nothing_to_pay" }
| { type: "unrecognised"; reportedType: string }
```

The third arm is **returned, never thrown** — a new payment method can add a type, and a
checkout that crashes on one fails a customer whose order is fine. The withdrawn
`redirect` shape gets no branch and arrives here like anything else.

**`src/app/(site)/checkout-probe/`** — throwaway. See "Delete this" below.

## Tests

`npm test` → `node --test`, 11 tests. No new dependency: Node 24 strips types natively.
Two consequences worth knowing before adding tests.

- Its resolver needs the extension in the specifier, hence
  `allowImportingTsExtensions` in `tsconfig.json`. Nothing is emitted under `noEmit`, and
  the bundler resolves the same specifiers — verified by building with one.
- Strip-only mode **rejects TypeScript parameter properties** (`constructor(readonly x: number)`).
  Declare the field and assign it. `ApiError` is written that way for this reason.

**They stub `globalThis.fetch`.** That verifies the request the seam builds and nothing
about what a browser does with it. Only the cookie handshake has been proven live; the
419, 422 and 429 branches have not. Do not read a green suite as proof the write path
works in a browser — that is what the probe was for.

## Backend configuration this depends on

Both discovered the hard way; neither is a frontend concern, and both will look like
frontend bugs.

**`PAYMENT_METHOD` must be `stripe` anywhere money is meant to arrive.** The first live run
returned `nothing_to_pay` on an order created `pending` seconds earlier. Not a
contradiction: with no method named, `PayOrderController` asks
`config('payments.default')`, which is `env('PAYMENT_METHOD', 'manual')` and resolves to
`ManualSettlement`, whose `begin()` returns `nothingToPay()` by design. `manual` is the
right default locally, where nobody has keys. It is wrong on staging and production —
where it makes `/pay` answer "nothing to collect" for an unpaid order, which the contract
says means go straight to confirmation. Set on staging 28 August 2026. **Production still
needs it.**

**Stripe is dropped from the registry unless both secrets are non-blank.**
`config/payments.php` requires `STRIPE_SECRET` **and** `STRIPE_WEBHOOK_SECRET`, using
`blank()` rather than a null check, because `.env.example` ships both present and empty.
An unregistered method is a 422; a registered-but-not-default one answers
`nothing_to_pay`. The probe's two buttons distinguish them.

The config is cached, so an env edit needs a redeploy.

**`STRIPE_PUBLISHABLE_KEY` is on the backend, where nothing reads it.** It appears nowhere
in the backend's `app/`, `config/` or `.env.example`. #36 and #37 both need it in the
frontend build as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. It currently reads as configured
and is inert, which is the expensive version of missing.

## Delete this

`/checkout-probe/` and `src/components/probe/` go when #38 lands a real payment panel.

It is **behind no flag**, deliberately: this branch is not one production is cut from, and
deleting a file is a stronger guarantee than an environment variable somebody can set by
accident. **So do not cut a production build from a branch that still has this route** —
anybody who loads it places a real pending order against whatever
`NEXT_PUBLIC_API_BASE_URL` names.

A flag was built first and removed. Recorded because the failure is not obvious: **an unset
`NEXT_PUBLIC_*` is not inlined by Next**, so it stays a live `process.env` lookup, the
comparison never constant-folds, and the guarded code ships in the bundle behind a page
that renders nothing. It only stripped once the flag was explicitly `0`. If you gate
anything this way, give it a default value in the config and verify by grepping `out/`.

## For the next ticket

**#35, password pages.** Both pages sit on `apiWrite`. Do not add a `fetch`. The
field-keyed `ApiValidationError` is what surfaces a password rule failure against the
field it names. One caution: `ApiError.message` is the backend's own message, which is
right for a validation failure and **wrong for an invalid token** — that ticket requires a
used token and an expired one read identically, so map that case to your own copy.

**#38, Apple Pay end to end.** The unawaited handshake that ticket describes is safe; the
seam re-runs it per write and caches no token, which also covers logout rotating it. Use
the typed errors for the panel copy — every path out of the confirm handler must fail the
sheet explicitly or it hangs. And do not treat `nothing_to_pay` as success: reconciling the
total against the sheet, which that ticket already requires, does not catch it, because
there is no total in that response to reconcile.

## Also in this branch

`0b410d0` clears the six standing `react-hooks` lint errors in `Carousel.tsx` and both
`SunriseAtmosphere.tsx` files. Unrelated to checkout, kept as its own commit. Embla is now
read through `useSyncExternalStore` rather than mirrored into state, and the sunrise
`phase` is derived at render rather than pushed from an effect. Verified with
`npm run check:reveal`, which walks the whole reveal against a dev server.

`eslint src` is now clean. A new lint error in this repo is yours.
