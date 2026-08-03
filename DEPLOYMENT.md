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
equivalent settings. Next only loads one config file; treat `next.config.ts`
as the authoritative copy and update both (or delete the `.mjs`) if you
change build settings — a fix applied to only one will silently not take
effect depending on which Next actually resolves.

## Cloudflare: static assets, not a Worker

`wrangler.toml` currently reads:

```toml
name = "theworldtarot-frontend"
compatibility_date = "2026-08-01"

[assets]
directory = "./out"
not_found_handling = "404-page"
```

Cloudflare serves `./out` directly as static assets. **`workers/index.js` is
not wired up** — an earlier version of `wrangler.toml` had
`main = "workers/index.js"` and used the legacy `[site]`/bucket config; the
migration to `[assets]` dropped the `main` key without removing the worker
file. With no `main`, Cloudflare never invokes that script, so its `fetch`
handler (which — notably — returns an *empty* 200 body for `/` and a plain
404 for everything else, i.e. it doesn't even proxy to the built assets) is
dead code as written.

If you need Worker-level logic again (redirects, headers, edge auth, custom
404 handling beyond `not_found_handling`), re-add `main = "workers/index.js"`
**and** rewrite the handler to serve from the assets binding
(`env.ASSETS.fetch(request)`) rather than the stub above — don't assume
restoring `main` alone makes the site work, since the current handler would
start intercepting every request and serving blank/404 responses instead of
the site.
