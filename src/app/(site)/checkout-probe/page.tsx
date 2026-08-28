import { CheckoutProbe } from "@/components/probe/CheckoutProbe";

/**
 * The throwaway proof that a browser on our own origin can place an order and
 * start a payment. Delete this route once a real payment panel does the same
 * thing (#38) — it exists to prove the write seam in isolation, before Stripe,
 * a wallet sheet and a confirm handler are in the frame to be blamed instead.
 *
 * Everything the tests around `api-write.ts` cannot reach lives here: whether
 * the browser actually carries the session and `XSRF-TOKEN` cookies to
 * `staging-api`, and whether CORS answers a credentialed request. Those tests
 * stub `fetch`, so they verify the request we build and nothing about what the
 * browser does with it. The failure they cannot catch is the one that matters:
 * reads keep working, so the site looks healthy right up to checkout.
 *
 * **Unconditional, and behind no flag.** This branch never reaches production:
 * the route is deleted when a real payment panel places an order (#38), which
 * is the only thing that ends the probe's usefulness. A flag would be a second
 * mechanism guarding the same fact, and the weaker of the two — deleting the
 * file cannot be got wrong by an unset environment variable.
 *
 * What that trades away is worth naming: any build cut from this branch serves
 * `/checkout-probe/`, and anybody who loads it places a real pending order
 * against whichever API the build points at. That is acceptable while the only
 * such build is staging. It stops being acceptable the moment it is not.
 */
export default function CheckoutProbePage() {
  return <CheckoutProbe />;
}
