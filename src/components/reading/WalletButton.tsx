"use client";

import { Elements, ExpressCheckoutElement } from "@stripe/react-stripe-js";
import type {
  StripeElementsOptions,
  StripeExpressCheckoutElementOptions,
  StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js";
import { useMemo, useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";
import { formatPrice, type Money } from "@/lib/price";
import { getStripe, walletAppearance } from "@/lib/stripe";

/**
 * The Apple Pay button, and the wallet sheet it opens.
 *
 * See `docs/plans/apple-pay-sheet.md`. Option names are pinned against
 * `@stripe/stripe-js@9.14.0`, which is not decoration: `wallets` is deprecated
 * in favour of `paymentMethods` in this version, and the collection flags exist
 * on both the element options and `ClickResolveDetails`, where they are
 * deprecated. Re-read the installed types before changing any of them.
 *
 * ## It takes Money, not an offer
 *
 * The prop is `money`, so there is no state this can be handed that has no
 * amount in it. `ProductOffer` carries `money` only on `live` (see
 * `lib/product.ts`), which makes "mount a wallet sheet from a price we invented"
 * a type error rather than a rule somebody remembers. **The number in the sheet
 * is the number the customer believes they agreed to**; it is the whole reason
 * #34 gated this ticket.
 *
 * ## It charges nothing, and says so
 *
 * `onConfirm` fires after the customer has authorised with Face ID, and there
 * is no order endpoint wired yet — that is #38. It calls `paymentFailed`, so
 * the sheet closes stating that checkout is not ready. Resolving successfully
 * would show a green tick for a payment that never happened, which is the one
 * thing a payment surface may never do, staging or not. The handler is a
 * required prop, so there is no third option of leaving it off and letting the
 * sheet spin.
 *
 * ## Apple Pay only
 *
 * Every other key in `paymentMethods` is `'never'`, all six of them. The
 * default is `'auto'` per method, and the option knows about Link, PayPal,
 * Klarna and Amazon Pay as well as Google Pay — so naming only Google Pay, as
 * the ticket does, would have let three more wallets onto the panel.
 *
 * `applePay: 'auto'` rather than `'always'`: `'always'` renders the button on
 * devices that cannot use it, which is the "no gap" criterion inverted into a
 * dead button on every Windows and Android visitor's screen. The cost is that a
 * headless browser never sees this button, so `check:panel` asserts the
 * collapse and Safari on a real device is what proves the sheet.
 */

const ELEMENT_OPTIONS: StripeExpressCheckoutElementOptions = {
  paymentMethods: {
    applePay: "auto",
    googlePay: "never",
    link: "never",
    paypal: "never",
    klarna: "never",
    amazonPay: "never",
  },
  // Apple's three, of which this is the only one that reads as belonging
  // beside a column of gold-outlined ghost buttons on a dark panel.
  buttonTheme: { applePay: "white-outline" },
  // One reading bought outright, not a basket being checked out.
  buttonType: { applePay: "buy" },
  // Stripe's ceiling, and still short of the 78px the ghost buttons stand at
  // — which is why the wrapper below holds the row's height instead.
  buttonHeight: 55,
  /*
    The value #31 committed to the backend. Nothing is done with it here
    because nothing is charged here, but it is what the finished sheet looks
    like, and the screenshot going to the client should be of that sheet
    rather than of a shorter one we would quietly grow later.
  */
  emailRequired: true,
  // One button, and never a Stripe overflow menu offering the five methods
  // the panel has just turned off.
  layout: { maxColumns: 1, maxRows: 1, overflow: "never" },
};

function handleConfirm(event: StripeExpressCheckoutElementConfirmEvent) {
  event.paymentFailed({
    reason: "fail",
    message: "Checkout is not open yet. Nothing has been charged.",
  });
}

export function WalletButton({ money }: { money: Money }) {
  const reserved = useSyncExternalStore(subscribe, hasApplePay, reserveWhileUnknown);

  /*
    Memoised on the money, because `Elements` treats a new `options` object as
    something to apply — and `mode` and `currency` are exactly the two keys
    Stripe refuses to change on a mounted group. Rebuilding this every render
    would hand it a fresh object each time and invite that error for no reason.
    The price does not change under a visitor, so in practice this is built once.
  */
  const elementsOptions: StripeElementsOptions = useMemo(
    () => ({
      /*
        Deferred intent: no client secret, so no order and no PaymentIntent
        exists when this mounts. The amount is quoted to the sheet from here and
        confirmed against a real intent at #38.
      */
      mode: "payment",
      amount: money.amount,
      // Stripe wants the ISO code lowercased; the API answers "EUR".
      currency: money.currency.toLowerCase(),
      paymentMethodCreation: "manual",
      appearance: walletAppearance,
    }),
    [money.amount, money.currency],
  );

  return (
    /*
      The row, not the button. Stripe's button is a fixed pixel height and the
      column around it is `em` against the panel's container query, so the two
      cannot track each other across the four widths this panel is laid out at.
      Holding `2.6em` here — the ghost buttons' own `min-block-size` — keeps the
      column's rhythm at every width and centres whatever Apple draws inside it.

      `hidden` rather than a height animation once the answer is `false`: this
      only ever moves the rows below it *up*, and only on a device with no
      wallet, where there is no wallet button under the thumb to mis-tap.
    */
    <div
      /*
        `check:panel` selects the row by this rather than by its `aria-label`,
        which ends in "Apple Pay" on the ghost button it replaces and would
        match both. A collapsed row and an absent one are the two things that
        check has to tell apart.
      */
      data-wallet-row=""
      className={cn(
        "flex w-full items-center justify-center",
        reserved ? "min-h-[2.6em]" : "hidden",
      )}
      /*
        The amount is in the sheet, not on the page, so a screen reader that
        never opens one still gets told what this button is for.
      */
      aria-label={`Pay ${formatPrice(money)} with Apple Pay`}
    >
      <Elements stripe={getStripe()} options={elementsOptions}>
        <ExpressCheckoutElement options={ELEMENT_OPTIONS} onConfirm={handleConfirm} />
      </Elements>
    </div>
  );
}

/**
 * Whether this device could open an Apple Pay sheet at all.
 *
 * **Apple's check, because Stripe does not give us one.** Verified against
 * `@stripe/stripe-js@9.14.0` in a headless Chromium against the real export:
 * where no wallet can show, `onReady` never fires — nor does `onLoadError`, nor
 * `onAvailablePaymentMethodsChange`. There is no negative signal to listen for.
 * The positive one cannot be proved anywhere but a registered payment method
 * domain either: on any other origin Stripe declines to draw the button and
 * says nothing, which is the silent failure #31 exists to prevent.
 *
 * `ApplePaySession` is absent outside Safari and on Macs without the hardware,
 * so its presence is what "no wallet is available" actually means here.
 * `canMakePayments()` is the synchronous form and answers for the device; the
 * async form answers for a card in the Wallet, and needs a merchant session we
 * have no business opening to decide a CSS height.
 */
function hasApplePay(): boolean {
  const applePay = (window as { ApplePaySession?: { canMakePayments(): boolean } }).ApplePaySession;

  try {
    return applePay?.canMakePayments() ?? false;
  } catch {
    // `canMakePayments` throws rather than returns false in an insecure or
    // cross-origin-framed context. Same answer either way.
    return false;
  }
}

/**
 * The answer before there is a `window` to ask: reserve the space.
 *
 * In practice this never runs. `WalletButton` mounts only once the price has
 * arrived, which is after hydration, so the first render already calls
 * `hasApplePay` for real. It is here because a snapshot that guessed *wrong* in
 * a future where the offer resolves during hydration would guess a payment
 * button into existence, and reserving space is the harmless direction to be
 * wrong in.
 *
 * **What this does not do is prevent a reflow.** On a device with no Apple Pay
 * the 2.6em ghost row is replaced by a collapsed one the moment the price
 * lands, and the rows beneath move up by that much. That is the trade accepted
 * for the "no gap" criterion: the movement is upward, and it happens only where
 * there is no wallet button for a thumb to land on.
 */
function reserveWhileUnknown(): boolean {
  return true;
}

/** The capability does not change under a visitor, so there is nothing to subscribe to. */
function subscribe(): () => void {
  return () => {};
}
