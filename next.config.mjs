/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  devIndicators: false,
};

/**
 * Kept identical to the copy in `next.config.ts`, and this is the one that
 * actually runs: Next resolves `next.config.mjs` ahead of `next.config.ts`, so
 * a guard added only to the `.ts` would never fire. Verified by this file
 * failing to load on 21 August 2026 while the `.ts` copy sat unread beside it.
 * Change both.
 */

/** `.localhost` too: the whole TLD resolves to loopback and is reserved for it. */
function isLoopback(hostname) {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    /^127\./.test(hostname) ||
    /^0\.0\.0\.0$/.test(hostname)
  );
}

function assertDeployableApiBase() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (process.env.ALLOW_LOCAL_API_BUILD === '1') return;

  if (!apiBase) {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL is unset, so the export has no API to talk to and every ' +
        'write fails in the browser. It is also what tells the Stripe key guard which ' +
        'environment this build is for, so an unset base silently disarms that too. ' +
        'Point it at a deployed backend, or set ALLOW_LOCAL_API_BUILD=1 for a local preview build.',
    );
  }

  if (!isLoopback(new URL(apiBase).hostname)) return;

  throw new Error(
    `NEXT_PUBLIC_API_BASE_URL is ${apiBase}, which is only reachable from this machine. ` +
      'It would be inlined into the export and every visitor would fail to reach the API. ' +
      'Point it at a deployed backend, or set ALLOW_LOCAL_API_BUILD=1 for a local preview build.',
  );
}

function assertStripeKeyMatchesApi() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  // The bypass is for a local preview build with no checkout in it, so it
  // excuses a *missing* key and nothing else. A key that is present is still
  // checked against the environment: allowing a local build must never be a way
  // to ship a live key to staging.
  if (!key && process.env.ALLOW_LOCAL_API_BUILD === '1') return;

  if (!key) {
    throw new Error(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is unset. The card road does not load Stripe.js at ' +
        'all, so unset breaks nothing visible today — which is exactly why it is refused ' +
        'here: the key is what pairs this build with a Stripe account, and the wallet road ' +
        'mounts an element from it again. Note the NEXT_PUBLIC_ prefix: only prefixed ' +
        'variables are inlined into a static export, so a key set as ' +
        'STRIPE_PUBLISHABLE_KEY is configured and inert. Set ALLOW_LOCAL_API_BUILD=1 for a ' +
        'local preview build that does not need checkout.',
    );
  }

  // Not a `return`. An unset base used to let a live key through here, on the
  // assumption that `assertDeployableApiBase` had already refused it — which it
  // did only for a base that was *set* and loopback. Each function refuses this
  // for its own reason rather than either assuming the other covers it.
  if (!apiBase) {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL is unset, so there is nothing to check ' +
        `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY against. A ${key.slice(0, 8)}… key would be ` +
        'inlined into the export unexamined. Set the API base to the backend this build is for.',
    );
  }

  const { hostname } = new URL(apiBase);

  if (isLoopback(hostname)) return;

  // Every non-production API this project has is a `staging-` host under
  // theworldtarot.com. Matching on that rather than on the production hostname
  // means a production host we have not stood up yet cannot make this pass by
  // accident: an unrecognised host is treated as production and demands a live
  // key, which is the safe direction to be wrong in.
  const staging = hostname.startsWith('staging');

  if (staging && key.startsWith('pk_live_')) {
    throw new Error(
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is a live key, but NEXT_PUBLIC_API_BASE_URL is ${apiBase}. ` +
        'A live key baked into a staging build pairs a live Stripe account with a backend ' +
        'that prices orders with test data — and on the wallet road it quotes real money in ' +
        'a sheet against them. Use the pk_test_ key.',
    );
  }

  if (!staging && key.startsWith('pk_test_')) {
    throw new Error(
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is a test key, but NEXT_PUBLIC_API_BASE_URL is ${apiBase}, ` +
        'which is not a staging host. On the wallet road the button would mount and take an ' +
        'authorization that can never be captured. Use the live key, or point the build at staging.',
    );
  }
}

export default (phase) => {
  // The literal rather than `PHASE_PRODUCTION_BUILD` from `next/constants`,
  // which does not resolve as an ESM import from a `.mjs` config.
  if (phase === 'phase-production-build') {
    assertDeployableApiBase();
    assertStripeKeyMatchesApi();
  }

  return nextConfig;
};
