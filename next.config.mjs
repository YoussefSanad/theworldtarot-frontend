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

  if (!apiBase || process.env.ALLOW_LOCAL_API_BUILD === '1') return;

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

  if (process.env.ALLOW_LOCAL_API_BUILD === '1') return;

  if (!key) {
    throw new Error(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is unset, so no wallet button can mount. ' +
        'Unset it fails silently — loadStripe gets undefined and the payment panel simply ' +
        'renders nothing where Apple Pay should be. Note the NEXT_PUBLIC_ prefix: only ' +
        'prefixed variables are inlined into a static export, so a key set as ' +
        'STRIPE_PUBLISHABLE_KEY is configured and inert. Set ALLOW_LOCAL_API_BUILD=1 for a ' +
        'local preview build that does not need checkout.',
    );
  }

  if (!apiBase) return;

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
        'A live key baked into a staging build quotes real money in a wallet sheet against ' +
        'orders the staging backend prices with test data. Use the pk_test_ key.',
    );
  }

  if (!staging && key.startsWith('pk_test_')) {
    throw new Error(
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is a test key, but NEXT_PUBLIC_API_BASE_URL is ${apiBase}, ` +
        'which is not a staging host. The wallet button would mount and take an authorization ' +
        'that can never be captured. Use the live key, or point the build at staging.',
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
