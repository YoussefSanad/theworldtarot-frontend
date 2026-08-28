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

  if (!apiBase || process.env.ALLOW_LOCAL_API_BUILD === "1") return;

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
 * The staging test is `hostname.startsWith("staging")` rather than a match on
 * the production hostname, which we have not stood up yet — an unrecognised
 * host is therefore treated as production and demands a live key. That is the
 * safe direction to be wrong in: it fails a build rather than passing one.
 *
 * `ALLOW_LOCAL_API_BUILD=1` exempts this too. A deliberate local preview build
 * is exempt from every deployability guard, not a subset of them.
 */
function assertStripeKeyMatchesApi(): void {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (process.env.ALLOW_LOCAL_API_BUILD === "1") return;

  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is unset, so no wallet button can mount. " +
        "Unset it fails silently — loadStripe gets undefined and the payment panel simply " +
        "renders nothing where Apple Pay should be. Note the NEXT_PUBLIC_ prefix: only " +
        "prefixed variables are inlined into a static export, so a key set as " +
        "STRIPE_PUBLISHABLE_KEY is configured and inert. Set ALLOW_LOCAL_API_BUILD=1 for a " +
        "local preview build that does not need checkout.",
    );
  }

  if (!apiBase) return;

  const { hostname } = new URL(apiBase);

  if (isLoopback(hostname)) return;

  const staging = hostname.startsWith("staging");

  if (staging && key.startsWith("pk_live_")) {
    throw new Error(
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is a live key, but NEXT_PUBLIC_API_BASE_URL is ${apiBase}. ` +
        "A live key baked into a staging build quotes real money in a wallet sheet against " +
        "orders the staging backend prices with test data. Use the pk_test_ key.",
    );
  }

  if (!staging && key.startsWith("pk_test_")) {
    throw new Error(
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is a test key, but NEXT_PUBLIC_API_BASE_URL is ${apiBase}, ` +
        "which is not a staging host. The wallet button would mount and take an authorization " +
        "that can never be captured. Use the live key, or point the build at staging.",
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
