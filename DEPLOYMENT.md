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
