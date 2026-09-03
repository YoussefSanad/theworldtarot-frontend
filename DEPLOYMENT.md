# Deployment

This is a fully static export deployed to Cloudflare, not a Next.js server.

## Build

`next.config.ts` sets `output: "export"` with `images: { unoptimized: true }`
and `trailingSlash: true`. `npm run build` (same as `npm run export`) writes
static HTML/JS/CSS to `./out`. There is no Node server anywhere in this
deployment — every route is pre-rendered at build time, and `next/image` does
no runtime optimization (`unoptimized: true`), which is why
[`src/lib/assets.ts`](src/lib/assets.ts) carries explicit width/height for
every image rather than relying on Next to derive them.

Both `next.config.ts` and `next.config.mjs` exist side by side with
equivalent settings, and Next loads only one: it resolves `next.config.mjs`
ahead of `next.config.ts`, so the `.mjs` is the copy that actually runs.
Change both — a fix applied only to the `.ts` silently does nothing.

## The API base URL

`NEXT_PUBLIC_API_BASE_URL` is inlined at build time, so each environment is a
separate build. Staging builds against `https://staging-api.theworldtarot.com`.

It must be a subdomain of `theworldtarot.com` — not the Laravel Cloud platform
URL, not a `pages.dev` or `workers.dev`. Cookies are issued for
`.theworldtarot.com`, so from any other registrable domain the browser treats
them as third party, Safari discards them, and every write is refused while
unauthenticated reads keep working. See
[`docs/adr/0001-one-registrable-domain.md`](docs/adr/0001-one-registrable-domain.md).

The build refuses a loopback address outright (see `assertDeployableApiBase`
in both config files); `ALLOW_LOCAL_API_BUILD=1` overrides it for a deliberate
local preview build.

## The Stripe publishable key

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is what the wallet button mounts from. It
is inlined at build time like the API base, so staging and production carry
different keys for the same reason they carry different API bases.

**The `NEXT_PUBLIC_` prefix is the whole point of this section.** Only prefixed
variables reach the bundle. Set as `STRIPE_PUBLISHABLE_KEY` — which is where it
originally lived, on the *backend* environment, where nothing read it — the key
reads as configured in every dashboard and is inert in every browser:
`loadStripe` gets `undefined`, no element mounts, and the payment panel renders
a gap behind a green build. Check the name, not just the presence.

The build refuses three things (`assertStripeKeyMatchesApi`, in **both** config
files):

| build | key | result |
|---|---|---|
| `staging-api.theworldtarot.com` | `pk_test_` | builds |
| `staging-api.theworldtarot.com` | `pk_live_` | **refused** — quotes real money against test-priced orders |
| any non-staging host | `pk_test_` | **refused** — takes an authorization that can never be captured |
| any | unset | **refused** — the silent gap above |

Any host that does not begin with `staging` is treated as production and
demands a live key. That is deliberate: production is not stood up yet, and an
unrecognised host failing a build is safer than one passing it.

`ALLOW_LOCAL_API_BUILD=1` exempts this guard as well as the API base one — a
deliberate local preview build is exempt from every deployability guard rather
than a subset.

The key is publishable, not secret: it ships in the bundle by design and
identifies the account rather than authorising anything. The secret key is the
backend's and never appears in this repository.

## The checkout probe

`/checkout-probe/` places a real pending order against the API the build points
at and shows what came back. It is the proof that a browser on our own origin
can complete the Sanctum cookie handshake — something no test can establish,
because the tests around [`src/lib/api-write.ts`](src/lib/api-write.ts) stub
`fetch` and so verify the request we build rather than what the browser does
with it.

It is behind no flag, deliberately: this branch is not one production is cut
from, and the route is deleted at #38 when a real payment panel does the same
thing. Deleting the file is a stronger guarantee than an environment variable
somebody can set by accident.

**So do not cut a production build from a branch that still has this route.**
Anybody who loads it places a real pending order against whatever
`NEXT_PUBLIC_API_BASE_URL` names.

It proves nothing anywhere but `staging.theworldtarot.com`: cookies are issued
for `.theworldtarot.com`, so on a `pages.dev` preview URL the handshake fails
for reasons that say nothing about the code.

## The presentation probe

`/presentation-probe/` is a reading page with its commerce slot empty — the
proof that `ReadingPresentation` mounts without `ReadingOrder`, which is what
`/redeem/` will do. It writes nothing, takes no input and places no order, so
unlike the checkout probe above it is safe on any build; what it does do is
serve `month-ahead`'s copy at a second address, which is why it carries
`robots: noindex, nofollow`.

It is deleted when `/redeem/` lands — [#79](https://github.com/YoussefSanad/theworldtarot-frontend/issues/79),
blocked on [#74](https://github.com/YoussefSanad/theworldtarot-frontend/issues/74).
Both probes go the same way: a file deleted at a named ticket rather than a
flag somebody has to remember to set.

## Cloudflare: static assets, not a Worker

`wrangler.toml` reads in full:

```toml
name = "theworldtarot-frontend"
compatibility_date = "2026-08-01"

[assets]
directory = "./out"
not_found_handling = "404-page"
```

There is no `main` key and no Worker script in this repo. Cloudflare serves
`./out` directly as static assets, and that is the whole deployment.

If you need Worker-level logic (redirects, headers, edge auth, custom 404
handling beyond `not_found_handling`), add a `main` **and** write a handler
whose fallthrough serves from the assets binding — `env.ASSETS.fetch(request)`.
A handler that answers requests itself without that binding intercepts every
request and serves nothing.
