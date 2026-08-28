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
function assertDeployableApiBase() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBase || process.env.ALLOW_LOCAL_API_BUILD === '1') return;

  const { hostname } = new URL(apiBase);

  const isLoopback =
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    /^127\./.test(hostname) ||
    /^0\.0\.0\.0$/.test(hostname);

  if (!isLoopback) return;

  throw new Error(
    `NEXT_PUBLIC_API_BASE_URL is ${apiBase}, which is only reachable from this machine. ` +
      'It would be inlined into the export and every visitor would fail to reach the API. ' +
      'Point it at a deployed backend, or set ALLOW_LOCAL_API_BUILD=1 for a local preview build.',
  );
}

export default (phase) => {
  // The literal rather than `PHASE_PRODUCTION_BUILD` from `next/constants`,
  // which does not resolve as an ESM import from a `.mjs` config.
  if (phase === 'phase-production-build') assertDeployableApiBase();

  return nextConfig;
};
