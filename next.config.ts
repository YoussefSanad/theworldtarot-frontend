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

/**
 * Refuses to bake a local API address into a production build.
 *
 * `NEXT_PUBLIC_API_BASE_URL` is inlined at build time and this app is a static
 * export, so whatever `.env.local` holds when `next build` runs is what every
 * visitor's browser will fetch — there is no server later to correct it. Local
 * development legitimately points at `127.0.0.1` (a backend, or the CORS shim
 * that forwards to staging, since staging's allow list has no `localhost`), so
 * the wrong value is the *normal* value on a developer's machine and the
 * failure is silent: the build succeeds, the homepage renders its bundled
 * fallback copy, and only the network tab says the shop never loaded.
 *
 * Set `ALLOW_LOCAL_API_BUILD=1` to build against a local API deliberately,
 * which is what previewing the products section against the shim wants.
 */
function assertDeployableApiBase(): void {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBase || process.env.ALLOW_LOCAL_API_BUILD === "1") return;

  const { hostname } = new URL(apiBase);

  // `.localhost` too: the whole TLD resolves to loopback and is reserved for it.
  const isLoopback =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    /^127\./.test(hostname) ||
    /^0\.0\.0\.0$/.test(hostname);

  if (!isLoopback) return;

  throw new Error(
    `NEXT_PUBLIC_API_BASE_URL is ${apiBase}, which is only reachable from this machine. ` +
      "It would be inlined into the export and every visitor would fail to reach the API. " +
      "Point it at a deployed backend, or set ALLOW_LOCAL_API_BUILD=1 for a local preview build.",
  );
}

export default (phase: string): NextConfig => {
  // The literal rather than `PHASE_PRODUCTION_BUILD` from `next/constants`,
  // which does not resolve as an ESM import from a `.mjs` config.
  if (phase === "phase-production-build") assertDeployableApiBase();

  return nextConfig;
};
