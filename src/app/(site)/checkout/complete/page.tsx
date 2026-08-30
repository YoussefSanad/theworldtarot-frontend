import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckoutComplete } from "@/components/checkout/CheckoutComplete";
import { checkoutCompleteCopy } from "@/content/checkout";
import { siteName } from "@/content/site";

/**
 * `/checkout/complete/` — where a paid-for checkout lands, and the address a
 * card's 3D Secure challenge is given to return to.
 *
 * One surface for every payment path: the wallet sheet that never leaves the
 * page, and the redirect that does. `trailingSlash` in next.config.mjs makes
 * the export `/checkout/complete/`, so **that** is the `return_url` to give
 * Stripe — without the slash the browser takes a redirect hop on the way back
 * from the bank, carrying the query string through a 308 for no reason.
 *
 * The route existing is what makes the return address real. It has to be
 * deployed before the first payment that can be challenged, which is why it
 * lands ahead of the payment panel rather than with it.
 */
export const metadata: Metadata = {
  title: `${checkoutCompleteCopy.pageTitle} — ${siteName}`,
  /*
    Reached only from a payment, and the address carries a payment intent's
    client secret when Stripe put one there. Nothing about it belongs in an
    index, and a search result pointing here would show a stranger a page that
    can only tell them it has nothing to show.
  */
  robots: { index: false, follow: false },
};

export default function CheckoutCompletePage() {
  /*
    The screen reads the query string with `useSearchParams`, which is
    client-side only under a static export, so it sits inside a Suspense
    boundary rather than making the route dynamic — the same shape the password
    pages use. The fallback is blank: the component's own "checking" state is
    the first thing there is anything true to say with, and it renders as soon
    as the params resolve.
  */
  return (
    <Suspense fallback={null}>
      <CheckoutComplete />
    </Suspense>
  );
}
