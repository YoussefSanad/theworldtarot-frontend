import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // The floating dev badge sits over the hero artwork while the layout is being
  // matched against Figma.
  devIndicators: false,
};

/** `.localhost` too: the whole TLD resolves to loopback and is reserved for it. */
function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    /^127\./.test(hostname) ||
    /^0\.0\.0\.0$/.test(hostname)
  );
}

/**
 * Refuses to bake a local API address into a production build.
 *
 * `NEXT_PUBLIC_API_BASE_URL` is inlined at build time and this app is a static
 * export, so whatever `.env.local` holds when `next build` runs is what every
 * visitor's browser will fetch — there is no server later to correct it. A
 * developer running a backend on `127.0.0.1` legitimately points at it, so the
 * wrong value is the *normal* value on that machine and the failure is silent:
 * the build succeeds, the homepage renders its bundled fallback copy, and only
 * the network tab says the shop never loaded.
 *
 * Set `ALLOW_LOCAL_API_BUILD=1` to build against a local API deliberately,
 * which is what previewing the products section against one wants.
 *
 * This catches loopback only. It cannot catch the other wrong value — an API
 * base outside `theworldtarot.com`, which passes here and then loses the
 * cookies on every write. See `docs/adr/0001-one-registrable-domain.md`.
 */
function assertDeployableApiBase(): void {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (process.env.ALLOW_LOCAL_API_BUILD === "1") return;

  if (!apiBase) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is unset, so the export has no API to talk to and every " +
        "write fails in the browser. It is also what tells the Stripe key guard which " +
        "environment this build is for, so an unset base silently disarms that too. " +
        "Point it at a deployed backend, or set ALLOW_LOCAL_API_BUILD=1 for a local preview build.",
    );
  }

  if (!isLoopback(new URL(apiBase).hostname)) return;

  throw new Error(
    `NEXT_PUBLIC_API_BASE_URL is ${apiBase}, which is only reachable from this machine. ` +
      "It would be inlined into the export and every visitor would fail to reach the API. " +
      "Point it at a deployed backend, or set ALLOW_LOCAL_API_BUILD=1 for a local preview build.",
  );
}

/**
 * Refuses a Stripe publishable key that does not match the API being built
 * against, and refuses a build with no key at all.
 *
 * Both failures this catches are silent ones, which is the only reason a build
 * guard is worth the lines. **A missing key does not error anywhere** — the
 * wallet button is mounted from `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and
 * `loadStripe(undefined)` simply never produces an element, so the payment
 * panel renders a gap and the build is green. The `NEXT_PUBLIC_` prefix is the
 * trap inside the trap: only prefixed variables are inlined into a static
 * export, so a key set as `STRIPE_PUBLISHABLE_KEY` reads as configured
 * everywhere a human looks and is inert everywhere the code looks.
 *
 * **A mismatched key is worse than a missing one**, because it works. A live
 * key in a staging build opens a wallet sheet quoting real money against orders
 * the staging backend priced with test data, and the customer authorises it. A
 * test key in a production build takes an authorisation that can never be
 * captured. Neither says anything at build time.
 *
 * **The card road mounts no element, and the guard stays anyway.** Checkout
 * happens on Stripe's hosted page from 29 August 2026, so nothing on the
 * reading page loads Stripe.js — see
 * `docs/adr/0002-checkout-happens-on-stripes-page.md`. That makes a missing or
 * mismatched key quieter still rather than harmless: it is what pairs a build
 * with a Stripe account, the express checkout element is coming back to the
 * panel on the wallet road, and a guard removed for the length of an interim is
 * a guard nobody puts back.
 *
 * The staging test is `hostname.startsWith("staging")` rather than a match on
 * the production hostname, which we have not stood up yet — an unrecognised
 * host is therefore treated as production and demands a live key. That is the
 * safe direction to be wrong in: it fails a build rather than passing one.
 *
 * `ALLOW_LOCAL_API_BUILD=1` excuses the *missing* key only. That flag exists so
 * a local preview build with no checkout in it can run, and a build with no key
 * has no checkout in it — but a key that is present is checked against the
 * environment either way. Allowing a local build may not double as a way to
 * ship a live key to staging.
 */
function assertStripeKeyMatchesApi(): void {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  // The bypass is for a local preview build with no checkout in it, so it
  // excuses a *missing* key and nothing else. A key that is present is still
  // checked against the environment: allowing a local build must never be a way
  // to ship a live key to staging.
  if (!key && process.env.ALLOW_LOCAL_API_BUILD === "1") return;

  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is unset. The card road does not load Stripe.js at " +
        "all, so unset breaks nothing visible today — which is exactly why it is refused " +
        "here: the key is what pairs this build with a Stripe account, and the wallet road " +
        "mounts an element from it again. Note the NEXT_PUBLIC_ prefix: only prefixed " +
        "variables are inlined into a static export, so a key set as " +
        "STRIPE_PUBLISHABLE_KEY is configured and inert. Set ALLOW_LOCAL_API_BUILD=1 for a " +
        "local preview build that does not need checkout.",
    );
  }

  // Not a `return`. An unset base used to let a live key through here, on the
  // assumption that `assertDeployableApiBase` had already refused it — which it
  // did only for a base that was *set* and loopback. Each function refuses this
  // for its own reason rather than either assuming the other covers it.
  if (!apiBase) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is unset, so there is nothing to check " +
        `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY against. A ${key.slice(0, 8)}… key would be ` +
        "inlined into the export unexamined. Set the API base to the backend this build is for.",
    );
  }

  const { hostname } = new URL(apiBase);

  if (isLoopback(hostname)) return;

  const staging = hostname.startsWith("staging");

  if (staging && key.startsWith("pk_live_")) {
    throw new Error(
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is a live key, but NEXT_PUBLIC_API_BASE_URL is ${apiBase}. ` +
        "A live key baked into a staging build pairs a live Stripe account with a backend " +
        "that prices orders with test data — and on the wallet road it quotes real money in " +
        "a sheet against them. Use the pk_test_ key.",
    );
  }

  if (!staging && key.startsWith("pk_test_")) {
    throw new Error(
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is a test key, but NEXT_PUBLIC_API_BASE_URL is ${apiBase}, ` +
        "which is not a staging host. On the wallet road the button would mount and take an " +
        "authorization that can never be captured. Use the live key, or point the build at staging.",
    );
  }
}

export default (phase: string): NextConfig => {
  // The literal rather than `PHASE_PRODUCTION_BUILD` from `next/constants`,
  // which does not resolve as an ESM import from a `.mjs` config.
  if (phase === "phase-production-build") {
    assertDeployableApiBase();
    assertStripeKeyMatchesApi();
  }

  return nextConfig;
};
