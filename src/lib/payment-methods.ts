"use client";

import { useEffect, useState } from "react";

import { fetchPaymentMethods } from "./api.ts";
import type { PaymentMethodName } from "./orders.ts";

/**
 * Which ways of paying this environment offers, as a question the panel can ask.
 *
 * Separate from `product.ts`, which decides whether there is a price at all.
 * These are two independent reasons a button may not be drawn and they fail in
 * opposite directions: a product with no live money means *nothing* can take a
 * payment, while a method this environment does not offer means *that one
 * button* cannot. Folding them into one state would make the panel's rule —
 * "where there is no live money there is nothing that can take a payment" —
 * carry a second, unrelated sentence.
 *
 * See `API_CONTRACT.md` section 8 and the backend's `PaymentMethods`.
 */

/**
 * Whether a named method is one this environment offers.
 *
 * Pure, and exported apart from the hook so the panel's rule can be exercised
 * without mounting anything. Takes the list as strings and the name as a value
 * this build can actually draw, which is the direction that keeps a method the
 * backend grew later from being answered `true` for a button that does not
 * exist here.
 */
export function offers(methods: readonly string[], method: PaymentMethodName): boolean {
  return methods.includes(method);
}

/**
 * Whether the wallet button may be drawn, answered `false` until the backend
 * has said otherwise.
 *
 * **The resting answer is `false`, and it is not a placeholder.** Every other
 * loading state on this panel reserves space for the control it is waiting for;
 * this one must not. The wallet row's whole contract is that it **collapses to
 * nothing** where there is no wallet, so a row held open while a request is in
 * flight would put a gap above Buy Now on exactly the devices — every Windows
 * and Android visitor — that are never going to see a button in it.
 *
 * It also means Stripe.js is not fetched on a page that turns out to have no
 * wallet button to draw, which is the rule `getStripe` exists to keep.
 *
 * **A failed request answers `false` too.** An unreachable backend and an
 * environment that configured no Stripe are the same thing to this panel: no
 * wallet button, and the card button — which survives being wrong about this,
 * because it redirects to a page that would say so — still standing beside it.
 */
export function useWalletOffered(): boolean {
  const [offered, setOffered] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchPaymentMethods({ signal: controller.signal })
      .then((methods) => setOffered(offers(methods, "stripe_wallet")))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        /*
          Loud here and invisible on the page, as `useProduct` is about an
          unreachable catalogue. From the outside a wallet row that never
          appeared because nobody could be asked is indistinguishable from one
          that never appeared because the device has no wallet — which is the
          same indistinguishability an unregistered payment method domain
          produces, and the reason both are worth a line.
        */
        console.error("Could not ask the API which ways of paying it offers.", error);
      });

    return () => controller.abort();
  }, []);

  return offered;
}
