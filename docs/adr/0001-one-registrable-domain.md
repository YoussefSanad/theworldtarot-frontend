# The site and the API stay on one registrable domain, and the platform URL is never the API base

Staging runs as `staging.theworldtarot.com` against `staging-api.theworldtarot.com`,
and production mirrors it. That pairing is load-bearing rather than tidy. The
session and `XSRF-TOKEN` cookies are issued for `.theworldtarot.com`, so both
hosts are same-site and the browser sends them on our own fetches; Sanctum treats
the origin as stateful, so `POST /api/v1/orders` answers 419 without a CSRF
header, guest or not; and Stripe registers exact hostnames as payment method
domains, so the wallet buttons are tied to this name too.

**`.env.example` and `.env.local` both pointed at
`https://theworldtarot-staging-9naya2.laravel.cloud`, which is wrong for
anything past reading content** — corrected in #32. It is the Laravel Cloud
platform URL. It is not under `theworldtarot.com`, so a browser on our site
treats its cookies as third party, Safari discards them, and checkout fails in
the one browser Apple Pay lives in — while the reveal and the product tiles keep
working, because they are unauthenticated reads. That is the trap: the wrong
base URL looks fine until the first write.

**Consequence:** a new frontend environment is a new subdomain of
`theworldtarot.com`, never a `pages.dev`, `workers.dev` or platform URL. It costs
a DNS record, an entry in the backend's CORS and stateful-domain lists, and a
Stripe payment method domain registration — all three, or checkout is broken in a
way that unauthenticated pages will not reveal.
