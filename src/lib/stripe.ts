import { loadStripe } from "@stripe/stripe-js/pure";
import type { Appearance, Stripe } from "@stripe/stripe-js";

/**
 * Stripe.js, loaded once and only when something is about to mount an element.
 *
 * See `docs/plans/apple-pay-sheet.md`.
 *
 * **Two reasons to change, noted rather than split.** Script loading — the
 * singleton, the SDK's failure modes — moves on a Stripe upgrade;
 * `walletAppearance` moves on a design token. They are unrelated, and this file
 * is small enough that one file is still the cheaper arrangement. Split it when
 * the appearance map next grows, which is #38 mounting the Payment Element.
 */

/**
 * The publishable key, inlined at build time.
 *
 * Read through a named constant rather than inline at the call site because the
 * literal `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is what the bundler
 * substitutes — a computed lookup would compile to `undefined`, which is also
 * the failure a missing key produces, and the two would be indistinguishable.
 * `assertStripeKeyMatchesApi` in both config files refuses a build without it,
 * so by the time this runs in a deployed bundle it is a real key.
 */
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

let pending: Promise<Stripe | null> | undefined;

/**
 * Stripe.js, fetched on first call and shared by every caller after.
 *
 * **Never called at module scope**, which is the point of the function. This is
 * a static export and every page shares one bundle, so a top-level
 * `loadStripe()` would put a request to `js.stripe.com` on the homepage, the
 * readings index and the reveal — pages with nothing to pay for. Stripe's own
 * fraud signals want the script on pages that lead to checkout, not on every
 * page a visitor has ever seen.
 *
 * **`@stripe/stripe-js/pure` is load-bearing, and the plain entry point is the
 * bug it fixes.** `@stripe/stripe-js`'s main module injects the script tag from
 * its own top level — `Promise.resolve().then(() => getStripePromise())` in
 * `src/index.ts`, one tick after the module is evaluated — so importing it at
 * all defeats every word above, whatever this function does. `check:panel`
 * caught it on 29 August 2026: `js.stripe.com` was fetched in the 404 state,
 * the 500 state and the state where the API offers no wallet, none of which
 * mounts anything. `/pure` is the same `loadStripe` with that side effect
 * removed. Pinned against `@stripe/stripe-js@9.14.0`; the types come from the
 * package root, which is types-only and erases.
 *
 * Resolves to `null` when the script cannot load, which `Elements` handles by
 * rendering nothing. That is the same visual outcome as a device with no
 * wallet, and `ExpressCheckout` collapses for both.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!PUBLISHABLE_KEY) return Promise.resolve(null);

  pending ??= loadStripe(PUBLISHABLE_KEY);

  return pending;
}

/**
 * How much of this site can reach a wallet button: less than it looks.
 *
 * **The gold does not go here, and cannot go anywhere.** An Apple Pay button is
 * drawn by Apple, and `ApplePayButtonTheme` is exactly `'black' | 'white' |
 * 'white-outline'`. There is no border colour, no fill and no typeface to set —
 * the same rule that stops the client's own artwork from shipping stops us
 * styling Stripe's. What `appearance` still reaches is the corner radius, and
 * the variables below matter to the Payment Element that #38 mounts beside this
 * one rather than to the wallet button itself.
 *
 * `theme: 'night'` is the base because everything here sits on `--color-night`;
 * starting from `'stripe'` would mean overriding a light palette token by token
 * and missing the ones no element on this page happens to use yet.
 */
export const walletAppearance: Appearance = {
  theme: "night",
  variables: {
    // 25px, the resting radius of every bordered control on the site. The
    // ghost buttons state it as a clamp against the container query; a wallet
    // button cannot be told a clamp, so this is the clamp's own maximum — the
    // value the panel holds at every width but the narrowest.
    borderRadius: "25px",
    colorBackground: "#0b1626", // --color-ghost
    colorText: "#fffcf6", // --color-snow
    colorPrimary: "#e4c46a", // --color-gold
    colorDanger: "#d4af37", // --color-gold-deep; this site has no red
    fontFamily: '"Gill Sans", ui-sans-serif, system-ui, sans-serif',
  },
};
