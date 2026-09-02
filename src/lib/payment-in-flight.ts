"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a payment is **in flight** — a write has been sent and its answer has
 * not come back — so the currency control can stop taking presses while it is.
 *
 * ## What it is actually protecting
 *
 * An order's currency is fixed at placement, and the **confirmation** renders
 * from the payment rather than from the catalogue, so nothing here can reach a
 * payment that has already been made. The window it closes is the one before
 * that: a customer looking at a **wallet sheet** quoting one **Money** while the
 * offer underneath it is re-priced into another. Re-pricing an offer somebody is
 * in the middle of authorising is the exact failure the Money discipline exists
 * to prevent, and it is the only moment on the site where the currency control
 * and a live write are on screen together.
 *
 * ## Raised in `buy.ts`, not in the two panels
 *
 * There are two roads to a payment — `startCheckout` for the **hosted page** and
 * `startWalletPayment` for the sheet — and the flag is raised inside both rather
 * than in the components that call them.
 *
 * **The same argument that moved `BUILT_LOCALES` into `lib/locale.ts`.** A rule
 * that lives in a `.tsx` with `@stripe/react-stripe-js` at the top of it cannot
 * be reached by `node --test`; both write functions are plain modules, so here
 * the rule is exercised rather than assumed. It also means a third road to a
 * payment cannot be added that forgets to raise it: the raise is in the writing,
 * not beside it.
 *
 * The cost, plainly: the header now shares a module with the checkout road. It
 * is a boolean and a `Set` of listeners and it imports nothing, which is why it
 * is its own file instead of an export from `buy.ts` — none of that module's
 * weight travels into a header that only wants to know whether to take a press.
 *
 * **One window it does not close.** The wallet sheet is already open by the time
 * `startWalletPayment` is called — `handleConfirm` runs `elements.submit()`
 * first — so the control stays live for the length of that call. Accepted on
 * 2 September 2026: the sheet quotes a number Stripe fixed when it opened, and
 * re-rendering the element's options underneath does not change what the
 * customer was asked to authorise.
 *
 * ## Only failure lowers it
 *
 * There is no success arm on either road. The hosted road calls
 * `location.assign` and the browser leaves; `stripe.confirmPayment` never
 * resolves on success, because by then the browser has left for `return_url`.
 * Both roads already hold their own `pending` state raised through that moment
 * on purpose — `HostedCheckoutButton` says why — and this holds with them. A
 * page that is leaving keeps the control frozen until it unloads, which is the
 * right last frame: putting the rows back live under a thumb during a navigation
 * is the mis-tap the freeze exists to prevent, arriving at the other end.
 *
 * ## A store rather than a context
 *
 * `currency.ts` and `components/account/useSignedIn.ts` for the same reason, and
 * more sharply here: the reader is in the header and the writer is in a `lib/`
 * module called from the reading page. They are not relatives. There is no
 * provider that could sit above both without a client boundary on a server
 * layout.
 */

const listeners = new Set<() => void>();

let inFlight = false;

/**
 * **Silent when nothing changed**, and that is not a micro-optimisation.
 * `handleConfirm` has three failure channels and the call it wraps throws into
 * one of them, so a settle landing on top of a settle is the ordinary case; each
 * one would otherwise re-render every header on the page for no news.
 */
function publish(next: boolean): void {
  if (inFlight === next) return;

  inFlight = next;
  for (const listener of listeners) listener();
}

export function subscribeToPayment(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** Whether a write is out and unanswered. */
export function paymentInFlight(): boolean {
  return inFlight;
}

/**
 * The static export is built with nobody buying anything, so hydration has to
 * start there or the first client paint disagrees with the markup it is
 * adopting. `currencySelectionOnServer` starts from the same place for the same
 * reason.
 */
export function paymentInFlightOnServer(): boolean {
  return false;
}

/** A write has been sent. Called by `buy.ts`, on both roads, before the line. */
export function paymentStarted(): void {
  publish(true);
}

/**
 * The write came back, and it came back refused — see the module note above for
 * why there is no success to report.
 */
export function paymentSettled(): void {
  publish(false);
}

/**
 * Drops the flag without telling anybody, which is what a page load does.
 *
 * The seam a test needs to start over, since the state this module is built on
 * is module-scoped by design. `forgetCurrency` is the same door for the same
 * reason. Nothing in the app calls it.
 */
export function forgetPayment(): void {
  inFlight = false;
}

/** Whether the control should be refusing presses this render. */
export function usePaymentInFlight(): boolean {
  return useSyncExternalStore(subscribeToPayment, paymentInFlight, paymentInFlightOnServer);
}
