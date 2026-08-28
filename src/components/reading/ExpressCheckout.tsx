"use client";

import { Elements, ExpressCheckoutElement } from "@stripe/react-stripe-js";
import type {
  StripeElementsOptions,
  StripeExpressCheckoutElementOptions,
  StripeExpressCheckoutElementAvailablePaymentMethodsChangeEvent,
  StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js";
import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { formatPrice, type Money } from "@/lib/price";
import { getStripe, walletAppearance } from "@/lib/stripe";

/**
 * The **express checkout element**, and the wallet sheet it opens.
 *
 * Not "the Apple Pay button", which is what `CONTEXT.md` lists under _Avoid_
 * for this: the element is one control that *draws* wallet buttons, plural, and
 * which ones it draws is Stripe's decision at runtime. A name that says "the
 * Apple Pay button" is the name that produced the bug `c27d69f` fixed — asking
 * Apple whether the device could pay instead of asking the element what it had
 * to show.
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
  /*
    One column, and never a Stripe overflow menu offering the five methods the
    panel has just turned off.

    `maxRows: 0` means unlimited, and it is **required** rather than chosen:
    Stripe throws `IntegrationError: options.layout.overflow: 'never' is only
    supported when options.layout.maxRows is 0` and renders nothing at all. With
    every other wallet set to `never` there is only ever one button to lay out,
    so unlimited rows and no overflow are the same single row either way.
  */
  layout: { maxColumns: 1, maxRows: 0, overflow: "never" },
};

function handleConfirm(event: StripeExpressCheckoutElementConfirmEvent) {
  event.paymentFailed({
    reason: "fail",
    message: "Checkout is not open yet. Nothing has been charged.",
  });
}

export function ExpressCheckout({ money }: { money: Money }) {
  /*
    Stripe's own pattern, from the Express Checkout Element docs: start hidden
    and reveal when the element says it has something to show.

    **The row reserves nothing until then**, which is what makes the "no gap"
    criterion true in every case rather than most of them — including a Mac that
    supports Apple Pay with an empty Wallet, where the device is capable and
    there is still no button. An earlier version asked `ApplePaySession`
    instead, which answers for the *device* and would have left 78px of nothing
    on exactly that machine.

    This is the event that never fires when nothing is available, which is why
    no headless browser sees it: it reports availability, and there is none.
  */
  const [available, setAvailable] = useState(false);

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

  function handleAvailability(event: StripeExpressCheckoutElementAvailablePaymentMethodsChangeEvent) {
    /*
      `paymentMethods` is `undefined` when nothing at all can show. Apple Pay is
      read by name rather than trusting the object's presence, because every
      other wallet is `never` here — one of them being available is not a reason
      to hold open a row this panel will never put a button in.
    */
    setAvailable(event.paymentMethods?.applePay?.available ?? false);
  }

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
      data-express-checkout=""
      inert={!available}
      className={cn(
        "flex w-full items-center justify-center",
        /*
          Not `hidden`, and not `sr-only`. The element has to stay rendered with
          its real width or it may never initialise far enough to tell us
          whether it has anything to show — and `display:none` is exactly the
          zero-size box that would prevent the event this row is waiting for.
          `h-0 overflow-hidden` keeps the width and clips the height, so there
          is nothing to see and nothing to scroll past.

          `inert` alongside it, so an Apple Pay button that is not being offered
          is not announced to a screen reader or reachable by a tab — the same
          treatment the panel already gives its controls while the price loads.
        */
        available ? "min-h-[2.6em]" : "h-0 overflow-hidden",
      )}
      /*
        The amount is in the sheet, not on the page, so a screen reader that
        never opens one still gets told what this button is for.
      */
      aria-label={`Pay ${formatPrice(money)} with Apple Pay`}
    >
      <Elements stripe={getStripe()} options={elementsOptions}>
        <ExpressCheckoutElement
          options={ELEMENT_OPTIONS}
          onAvailablePaymentMethodsChange={handleAvailability}
          onConfirm={handleConfirm}
        />
      </Elements>
    </div>
  );
}
