"use client";

import {
  Elements,
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type {
  StripeElementsOptions,
  StripeExpressCheckoutElementOptions,
  StripeExpressCheckoutElementAvailablePaymentMethodsChangeEvent,
  StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js";
import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";

import { readingPageChrome } from "@/content/reading-pages";
import { startWalletPayment } from "@/lib/buy";
import { cn } from "@/lib/cn";
import { orderFormAccepts, orderNoteIn } from "@/lib/order-note";
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
 * to show. From 29 August 2026 the plural is literal: **both Apple Pay and
 * Google Pay**, at the client's request.
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
 * ## It is on the panel in gift mode too, from 30 August 2026
 *
 * The row used to be removed by `!gifting`, on the grounds that a wallet takes
 * the money the instant a face is recognised and `POST /orders` had nowhere to
 * put a recipient. The client asked for it back: the button vanishing under a
 * thumb was the more visible fault, and the money is wanted now rather than at
 * the end of the gifting milestone.
 *
 * Why that is safe to charge on is argued at the gate it replaced, in
 * `GetMyReading`. This file changed by almost nothing: the row reads whatever
 * section the form has mounted and never knew which one that was, so what is
 * new here is one guard — a gift with no recipient on it must not reach a
 * PaymentIntent, and `onConfirm` is the last place it can be stopped.
 *
 * ## It charges, and it is the road that does it in the page
 *
 * `onConfirm` fires after the customer has authorised with Face ID. Until 29
 * August 2026 it called `paymentFailed`, because there was no order endpoint
 * wired; now it places the order, asks `/pay` for a `stripe_wallet` payment and
 * confirms the secret that comes back. **The one thing it may never do is
 * resolve successfully for a payment that did not happen** — every failure path
 * below ends in `paymentFailed`, and there is no arm that simply returns.
 *
 * The two roads are not one thing. A hosted Checkout Session is an address you
 * send a browser to; this is an iframe mounted on our own origin. See
 * `docs/adr/0002-checkout-happens-on-stripes-page.md` and the backend's
 * `docs/adr/0003-the-wallet-keeps-its-own-payment-intent.md`.
 *
 * ## Both wallets, and nothing else
 *
 * `applePay` and `googlePay` are `'auto'`; the other four are `'never'`. The
 * default is `'auto'` per method, and the option knows about Link, PayPal,
 * Klarna and Amazon Pay — so naming only Google Pay, as the ticket does, would
 * have let those four onto the panel.
 *
 * `'auto'` rather than `'always'` for both: `'always'` renders a button on
 * devices that cannot use it, which is the "no gap" criterion inverted into a
 * dead control on every visitor's screen who has no wallet. The cost is that a
 * headless browser never sees a button, so `check:panel` asserts the mount and
 * the collapse, and a real device is what proves the sheet.
 *
 * ## The domain is what makes this appear at all
 *
 * `theworldtarot.com` must be a registered Stripe **payment method domain**, in
 * test and in live, and **it is mandatory for an element mounted on our own
 * origin** rather than the belt-and-braces it was for the hosted page. It fails
 * by the button silently not appearing — indistinguishable from a device with
 * no wallet, and therefore indistinguishable from working correctly. Stripe
 * registers **exact hostnames**, so `staging.theworldtarot.com` is its own
 * registration and not covered by the apex. See ADR 0001.
 */

const { checkout } = readingPageChrome;

/*
  Stripe's floor and ceiling for `buttonHeight`, in CSS pixels, quoted from the
  docs for `elements.create('expressCheckout')`: "By default, the height of the
  buttons are 44px. You can override this to specify a custom button height in
  the range of 40px-55px." Read against `@stripe/stripe-js@9.14.0`, where the
  option is typed `number` and neither bound is enforced by the types.

  **There is no `em` here and no percentage.** The option is a number of pixels
  or it is nothing, which is why `useFrameHeight` resolves the frames' `em` and
  hands over the answer rather than passing a unit through.
*/
const BUTTON_HEIGHT = { min: 40, max: 55 } as const;

/*
  The class `GetMyReading` puts on every frame in the payment column, Buy Now
  included. Reached through the row's parent because the frames belong to that
  component and not to this one; what the two share is the column.
*/
const FRAME = ".checkout-option";

const ELEMENT_OPTIONS: StripeExpressCheckoutElementOptions = {
  paymentMethods: {
    applePay: "auto",
    googlePay: "auto",
    link: "never",
    paypal: "never",
    klarna: "never",
    amazonPay: "never",
  },
  /*
    Apple allows three themes and Google two, and none of the five is gold. The
    panel is visibly mixed and that is a constraint rather than an oversight:
    these buttons are drawn by their vendors, and the same rule that stops the
    client's own artwork from shipping stops us styling them.

    ~~What is chosen here is the nearest each vendor has to a dark panel's
    outlined frames.~~ **Black on both from 29 August 2026**, at the client's
    request. `white-outline` and `white` put two filled white slabs above a
    column of unfilled gold frames, which made the wallet row the brightest
    thing on a panel where nothing else is filled at all. `black` is the
    darkest theme either vendor offers and the only one both of them have, so
    it is also the only way the two buttons agree with each other.

    The cost is real and accepted: a black button on `--color-night` has no
    edge of its own, and the mark inside it is what separates it from the
    panel. Neither vendor permits a border, so there is nothing to add here.
  */
  buttonTheme: { applePay: "black", googlePay: "black" },
  // One reading bought outright, not a basket being checked out. Google spells
  // the same intent `buy`; its `checkout` has no hyphen where Apple's does.
  buttonType: { applePay: "buy", googlePay: "buy" },
  /*
    **Load-bearing, and the sentence the buyer's identity rests on.** A wallet
    PaymentIntent has no Checkout Session, so the backend cannot resolve who
    paid the way it does on the card road; it reads the buyer off the charge's
    `latest_charge.billing_details`, and this flag is what puts an email there.
    Without it a wallet payment settles nobody: the order is left pending with
    the customer already charged, forever. See the backend's #43 and #44, and
    `API_CONTRACT.md` section 9 — whose sentence saying this flag was "gone with
    the element" was corrected on 29 August 2026.
  */
  emailRequired: true,
  /*
    One column, and never a Stripe overflow menu offering the four methods the
    panel has just turned off.

    `maxRows: 0` means unlimited, and it is **required** rather than chosen:
    Stripe throws `IntegrationError: options.layout.overflow: 'never' is only
    supported when options.layout.maxRows is 0` and renders nothing at all.
    Unlimited rows is also what lets a device offering both wallets draw both,
    stacked, rather than hiding one behind an overflow the panel has forbidden.
  */
  layout: { maxColumns: 1, maxRows: 0, overflow: "never" },
};

/**
 * The height to draw the wallet buttons at: **the height of the ghost frames
 * standing beside them**, in the pixels Stripe insists on.
 *
 * ## Why it is measured rather than declared
 *
 * The frames are an `em` off `--text-nav`, which is itself a `clamp` on the
 * viewport, so their height is a different number at every width of the page.
 * `buttonHeight` is a number of CSS pixels. There is no unit that can be handed
 * from the first to the second, so the only way the two agree at more than one
 * width is to resolve the `em` here, where it has a value, and to go on
 * resolving it as it changes.
 *
 * ~~`buttonHeight: 55`, Stripe's ceiling, with the row holding the difference.~~
 * That constant was right at one width and wrong either side of it. Below about
 * 1330px it drew the wallet button **taller than every frame beneath it** — 3px
 * at 1280, 16px at 430 — and the row's height being a `min` meant the row grew
 * to fit it. A panel whose whole premise is one set of frames at one height had
 * a wallet button standing proud of them on every laptop and every phone.
 *
 * ## The frames were brought to meet it in the same change
 *
 * ~~The ceiling is still 55, so from about 1400px up the button stays shorter
 * than the frame — 23px of it at 1920 — and the row holds the difference. The
 * floor bites once at the narrow end, where 40 meets a frame drawn at 39.~~
 *
 * **`.checkout-option` was clamped into Stripe's own range instead**, at the
 * client's request: `clamp(40px, 2.6em, 55px)`. The frames now stop where the
 * button stops, at both ends, so the two agree at every width rather than at
 * one. What is left is sub-pixel — the frames are fractional at the middle
 * widths and `buttonHeight` is an integer, so the button lands up to 0.6px
 * short of its frame and never over it.
 *
 * The trade is in the stylesheet rather than here, and it is the client's
 * drawing: 78px at 30px type becomes 55px above about 1354px. See the comment
 * on `.checkout-option`.
 *
 * ## Measured off a sibling rather than computed from the token
 *
 * The number read here is the number on the screen, not `2.6 × font-size`,
 * which would be this file's copy of a figure that belongs to the stylesheet
 * and would go quietly wrong the day `.checkout-option` changes. The row's own
 * box is no use for it: that box is `h-0` until a wallet answers, which is the
 * whole point of it.
 */
function useFrameHeight(row: RefObject<HTMLDivElement | null>) {
  /*
    Stripe's ceiling until a frame has been measured, which is exactly what this
    file passed unconditionally before today. So the first paint is yesterday's
    behaviour and the layout effect below corrects it — before any wallet has
    answered, and therefore before there is a button on the screen to correct.
  */
  const [height, setHeight] = useState<number>(BUTTON_HEIGHT.max);

  useLayoutEffect(() => {
    const frame = row.current?.parentElement?.querySelector(FRAME);

    /*
      A column with no frame in it is not a state this panel has — Buy Now is
      always one of them — but if it ever became one, the state already holds
      Stripe's ceiling, so the wallet draws at the size it drew at yesterday
      rather than not drawing at all. Nothing to set, and nothing to observe.
    */
    if (!frame) return;

    /*
      **The observer is the only reader**, first measurement included:
      `observe()` delivers a callback with the initial size, and it is delivered
      after layout and before paint. So there is no synchronous `setState` in
      this effect and no cascading render — and no first frame drawn at a height
      that is about to change either.

      After that it fires on a resize and on nothing else, the frame being `em`
      off a `clamp` on the viewport. React bails out of a `setState` that lands
      on the value already held, so an observer firing all the way through a
      drag re-renders only at the dozen or so widths where the floored pixel
      actually moves — and `element.update()` reaches Stripe only that often.
    */
    const observer = new ResizeObserver(() => {
      /*
        Floored rather than rounded, and that is the difference between fixing
        this and halving it: the row's height is a `min`, so a button half a
        pixel taller than the frame grows the row by half a pixel — which is the
        fault being corrected, in miniature. Short is free; tall is the bug.
      */
      const drawn = frame.getBoundingClientRect().height;

      setHeight(Math.floor(Math.min(Math.max(drawn, BUTTON_HEIGHT.min), BUTTON_HEIGHT.max)));
    });

    observer.observe(frame);

    return () => observer.disconnect();
  }, [row]);

  return height;
}

export function ExpressCheckout({ productKey, money }: { productKey: string; money: Money }) {
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
    A sentence under the row, and **the only channel left once the confirmation
    has been attempted**. Added 29 August 2026.

    Before the confirmation, the sheet is ours to fail: `event.paymentFailed()`
    writes into the wallet interface the customer is looking at, which is the
    right place for it because that is where they still are. After
    `stripe.confirmPayment` has been called there is no sheet to write into —
    Stripe has closed it — and the message has to land on the page instead. See
    `handleConfirm`, where calling `paymentFailed()` at that point is the
    `IntegrationError` this state was added to fix.

    Held here rather than in `Wallet` because the row is a flex box laid out
    across it: a paragraph inside it would sit *beside* the wallet button rather
    than under it. This is a sibling of the row, so it takes its own line in
    `GetMyReading`'s column and is gapped like every other child.
  */
  const [failure, setFailure] = useState<string | null>(null);

  /*
    The row's own node, and the handle `useFrameHeight` reaches the frames
    through. It is a ref rather than a query off `document` so this component
    finds the column it is actually in, not the first one on the page.
  */
  const row = useRef<HTMLDivElement>(null);

  /*
    **The wallet buttons stand at the frames' height**, from 30 August 2026.
    Passed down rather than read in `Wallet`, because the frames are out here
    beside the row and `Wallet` is inside the element's own provider.
  */
  const buttonHeight = useFrameHeight(row);

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
        exists when this mounts. One is minted at the moment of confirmation,
        which is what keeps a visitor who reads the page and leaves from
        littering Stripe with abandoned intents.

        **The amount quoted here is checked against the intent at confirmation.**
        Stripe refuses to confirm a secret whose amount or currency disagrees
        with these, which is a guard rather than a nuisance: the sheet shows
        this number and the charge is the backend's, and a customer must never
        be charged something other than what the sheet said.
      */
      mode: "payment",
      amount: money.amount,
      // Stripe wants the ISO code lowercased; the API answers "EUR".
      currency: money.currency.toLowerCase(),
      /*
        **What the backend's PaymentIntent declares, said again on this side,
        because the two are one setting split across a network.**

        Added 29 August 2026, and it is what #48 was actually broken on. Omit
        this key and the group is on *automatic* payment methods — that is what
        omitting it means, per the option's own type: "Instead of using
        automatic payment methods, declare specific payment methods to enable."
        `StripeWallet::begin` mints the intent with
        `payment_method_types: ['card']`, and Stripe refuses the pair at the
        moment of confirmation in its own words: _"Payment details were
        collected through Stripe Elements using automatic payment methods and
        cannot be confirmed through the API configured with
        payment_method_types or allowed_payment_method_types."_ Every visible
        thing worked — the button drew, the sheet opened, Face ID passed — and
        the confirm returned 400.

        **This side rather than the backend's, and Stripe's docs are what
        decides which side owns the list:** "If you collect payments before
        creating an intent, then list payment methods in the
        `paymentMethodTypes` attribute on your Elements provider options. If
        you create an intent before rendering Elements, then list payment
        methods in the `payment_method_types` attribute on your Intent." This
        group mounts with no client secret and mints the intent at
        confirmation, so it is the first case. Moving the backend to
        `automatic_payment_methods` would have agreed just as well and cost
        `StripeWallet` the argument its docblock makes for naming card
        explicitly — that nothing can be switched on from a Dashboard nobody is
        watching, and that the only redirect in play stays 3D Secure.

        **`card` alone still draws both buttons**: "Apple Pay and Google Pay are
        automatically enabled when using `card` payment method type." It is also
        a second lock on the four methods `ELEMENT_OPTIONS` sets to `never` —
        PayPal, Klarna and Amazon Pay are payment method types of their own and
        cannot come from a list that names only this one.
      */
      paymentMethodTypes: ["card"],
      /*
        No `paymentMethodCreation: 'manual'`. That option exists to create a
        PaymentMethod from the group and confirm it **server-side**, and ADR
        0003 records why that road was not taken — it is the fallback if the
        wallet's email turns out not to reach the charge, not the plan. What is
        done instead is `confirmPayment({ elements, clientSecret })`, which is
        Stripe's documented deferred-intent flow and needs this unset.
      */
      appearance: walletAppearance,
    }),
    [money.amount, money.currency],
  );

  function handleAvailability(event: StripeExpressCheckoutElementAvailablePaymentMethodsChangeEvent) {
    /*
      `paymentMethods` is `undefined` when nothing at all can show. The two
      wallets are read by name rather than trusting the object's presence,
      because the other four are `never` here — one of *them* being available is
      not a reason to hold open a row this panel will never put a button in.
    */
    const offered = event.paymentMethods;

    setAvailable((offered?.applePay?.available ?? false) || (offered?.googlePay?.available ?? false));
  }

  return (
    <>
      {/*
        The row, not the button, and it settles one of the button's two
        dimensions rather than both.

        **Height is the row's, and from 30 August 2026 the button follows it as
        far as Stripe allows.** `buttonHeight` is a number of pixels and the
        column is `em` against the panel's container query, so the two cannot be
        given the same unit — but `useFrameHeight` resolves the frames' `em` on
        this side and hands Stripe the pixel, which closes the gap everywhere
        between Stripe's floor of 40 and its ceiling of 55.

        Holding the ghost buttons' own `min-block-size` here — the same clamp,
        restated — is what keeps the column's rhythm, and since 30 August 2026
        that clamp is bounded by Stripe's range at both ends, so the row and the
        button it holds are the same height at every width. A `min` rather than a
        fixed height, so the rare device offering both wallets grows the row to
        fit the second rather than clipping it.

        **Width is the element's**, and it has to be: this is a flex box, so a
        child with no width of its own is sized by its content, and Stripe's
        content asked for 300px in a 498px column. The `w-full` that fixes it is
        on the element below, where the reasoning belongs.

        `hidden` rather than a height animation once the answer is `false`: this
        only ever moves the rows below it *up*, and only on a device with no
        wallet, where there is no wallet button under the thumb to mis-tap.
      */}
      <div
        ref={row}
        /*
          `check:panel` selects the row by this rather than by its `aria-label`,
          which ends in a wallet's name on the ghost button it replaces and would
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

            `inert` alongside it, so a wallet button that is not being offered is
            not announced to a screen reader or reachable by a tab — the same
            treatment the panel already gives its controls while the price loads.

            **`-mb-[0.4em]` is what makes "no gap" literally true.** The column
            this sits in is a flex `gap-[0.4em]`, and a gap applies to every
            *rendered* child including a zero-height one — so a row that only
            collapsed its height would still leave exactly the gap it promises
            not to, on every device without a wallet. The negative margin cancels
            the one gap this row is responsible for. It is the only number here
            that belongs to `GetMyReading`'s column rather than to this file, and
            it has to move if that `gap` does.
          */
          /*
            `.checkout-option`'s own `min-block-size`, restated. The two are one
            number in two stylesheets — this row is not a `.checkout-option`,
            because it has no border and no label — so a change to the clamp
            there has to be made here as well or the wallet row alone stops
            agreeing with the column.
          */
          available ? "min-h-[clamp(40px,2.6em,55px)]" : "-mb-[0.4em] h-0 overflow-hidden",
        )}
        /*
          The amount is in the sheet, not on the page, so a screen reader that
          never opens one still gets told what this button is for. It names no
          single wallet, because which one is drawn here is Stripe's decision at
          runtime and may be both.
        */
        aria-label={`Pay ${formatPrice(money)} with a saved wallet`}
      >
        <Elements stripe={getStripe()} options={elementsOptions}>
          <Wallet
            productKey={productKey}
            money={money}
            buttonHeight={buttonHeight}
            onAvailability={handleAvailability}
            onFailure={setFailure}
          />
        </Elements>
      </div>

      {/*
        `role="alert"`, because it answers something the customer just did with
        their face and they are looking at where the sheet was, not at the panel.

        Rendered only after a confirmation that went wrong. Everything that
        fails *before* the confirmation fails in the sheet instead, where the
        customer still is, and never reaches this line.

        **Cleared by the next `onConfirm`, and that matters more than it looks.**
        A second press reopens the sheet on a payment that has not been refused
        yet; leaving the first refusal under it would be a live sentence about a
        payment now in flight, which is the one thing this row must never say.
      */}
      {failure ? (
        <p
          role="alert"
          className="max-w-[70cqw] text-fine leading-[1.2] font-light text-champagne/73"
        >
          {failure}
        </p>
      ) : null}
    </>
  );
}

/**
 * The element itself, inside the group, where `useStripe` and `useElements` can
 * reach it.
 *
 * A child rather than the same component, and not for tidiness: both hooks
 * answer `null` outside an `<Elements>` provider, so confirming from the parent
 * is not something that works less well — it is something that cannot work at
 * all.
 */
function Wallet({
  productKey,
  money,
  buttonHeight,
  onAvailability,
  onFailure,
}: {
  productKey: string;
  money: Money;
  /** Resolved from the frames beside the row; see `useFrameHeight`. */
  buttonHeight: number;
  onAvailability: (event: StripeExpressCheckoutElementAvailablePaymentMethodsChangeEvent) => void;
  /**
   * A sentence for the page, for the arms that no longer have a sheet, and
   * `null` to take it back down when a fresh attempt starts.
   */
  onFailure: (message: string | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  /*
    `ELEMENT_OPTIONS` plus the one key that is not a constant.

    Memoised on the height because react-stripe-js diffs this object by identity
    and calls `element.update()` with whatever changed — a fresh object every
    render would be a fresh `update()` every render. `buttonHeight` is a member
    of `StripeExpressCheckoutElementUpdateOptions` as well as of the create
    options, which is what makes changing it after mount legal rather than a
    remount; it is not in react-stripe-js's immutable list either, so it goes
    through as an update and the mounted element redraws at the new size.
  */
  const options = useMemo(() => ({ ...ELEMENT_OPTIONS, buttonHeight }), [buttonHeight]);

  /*
    What the customer typed is read out of the DOM at the moment of
    confirmation, off the order form this row sits inside — the same fields,
    read the same way, as the card button reads them. In gift mode that is the
    recipient and the message rather than a question, and this file does not
    know the difference: `orderNoteIn` reads the form and decides. There is no
    node of ours inside the element to hang this on, so it hangs on a marker
    beside it.
  */
  const anchor = useRef<HTMLSpanElement>(null);

  async function handleConfirm(event: StripeExpressCheckoutElementConfirmEvent) {
    /*
      ~~One failure sentence for every arm below.~~ **Two**, corrected 29 August
      2026 at review, and the line between them is what is actually known about
      the customer's money rather than which call went wrong.

      ~~There is no arm of this function that ends without either a confirmed
      payment or one of those two calls.~~ **The line is now also about *where*
      the sentence can go**, corrected 29 August 2026 against a real device.
      `stripe.confirmPayment` is itself the payment being submitted, and Stripe
      resolves the wallet interface when it returns — so `paymentFailed()` after
      that point is a second answer to a question already answered, and Stripe
      throws for it by name: _"Unexpected call to paymentFailed(). Ensure you
      are either submitting a payment or calling paymentFailed() once per
      expressCheckout Element confirm event."_ The throw was uncaught, and the
      sheet showed its own generic failure rather than anything written here.

      So the two arms are no longer two sentences down one channel. They are two
      channels: **before** the confirmation the customer is looking at a sheet
      that is still ours to fail, and **after** it the sheet is gone and the
      only place left is the panel underneath.

      Which of the six things went wrong is a matter for the console either way,
      and is logged there.
    */
    const log = (why: string, cause?: unknown) =>
      console.error(`The wallet payment could not be completed: ${why}`, cause);

    /*
      Whatever the last attempt left under the row comes down before this one
      starts. The customer is looking at a reopened sheet, and a refusal still
      standing beneath it describes a payment that is no longer the one being
      made.
    */
    onFailure(null);

    /**
     * It did not happen, we know that, and the sheet is still open to say so.
     *
     * Every arm **before** the confirmation ends here: the sheet was refused,
     * the order was, or `/pay` was — and in all of them there is no secret yet,
     * so there is nothing that could have taken money. This is the only helper
     * that may call `paymentFailed`, and it is the reason the call is safe: no
     * payment has been submitted at any point that reaches it.
     */
    const fail = (why: string, cause?: unknown, message: string = checkout.walletFailed) => {
      log(why, cause);

      event.paymentFailed({ reason: "fail", message });
    };

    /**
     * Stripe answered the confirmation, and its answer was no.
     *
     * **The same fact as `fail` and a different channel, which is the whole
     * reason it is a third helper.** A resolved `{ error }` is Stripe saying
     * the payment did not go through — a declined wallet card, an abandoned 3D
     * Secure step, an intent it refused — so "nothing has been charged" is as
     * true here as it is above. What is not true here is that there is still a
     * sheet: the confirmation is the submitted payment, and it closed.
     */
    const refused = (why: string, cause?: unknown) => {
      log(why, cause);

      onFailure(checkout.walletFailed);
    };

    /**
     * The confirmation itself went wrong, **what happened to the money is not
     * known here**, and there is no sheet left to say either thing in.
     *
     * A rejected `confirmPayment` is not a refused payment. The request may
     * have reached Stripe and been acted on before the connection dropped, so
     * "nothing has been charged" is a claim this arm cannot support — and a
     * false claim about a customer's money is worse than an unhelpful true one.
     * It points at the receipt, which is the record that counts and the one
     * channel that knows.
     *
     * **No `paymentFailed` here.** Stripe closed the interface when the
     * confirmation came back; this hands the sentence to the page instead.
     */
    const unresolved = (why: string, cause?: unknown) => {
      log(why, cause);

      onFailure(checkout.walletUnresolved);
    };

    if (!stripe || !elements) return fail("Stripe.js is not loaded.");

    /*
      **Before the group is submitted and before an order exists.** Nothing
      submits this form, so the `required` on the recipient's address is
      enforced by nobody unless something asks — and without asking, a customer
      reaches this line having authorised with their face for a gift addressed
      to no one. `giftNote` would record the absence rather than prevent it.

      Safe to `paymentFailed` here for the reason every arm above the
      confirmation is: there is no secret yet, so nothing can have been charged.
      `orderFormAccepts` marks and focuses the field underneath at the same
      time, for when Stripe closes the sheet over it.
    */
    if (!orderFormAccepts(anchor.current)) {
      return fail("The gift has no recipient on it.", undefined, checkout.walletNeedsRecipient);
    }

    let clientSecret: string;

    /*
      **Everything that happens before there is a secret**, which is what makes
      the one message this arm ends in true. The split from the confirmation
      below is not tidiness: it is the difference between "nothing was taken"
      and "we do not know", and only one of those can be said here.
    */
    try {
      /*
        Required by the deferred-intent flow, and it comes first: it validates
        the group and is what Stripe's own documented order does. Running it
        after the order was placed would leave a pending order behind for a
        sheet that was never valid.
      */
      const { error: invalid } = await elements.submit();

      if (invalid) return fail(invalid.message ?? "The wallet sheet was refused.", invalid);

      const note = orderNoteIn(anchor.current);

      clientSecret = await startWalletPayment({
        productKey,
        money,
        question: note.text,
        gift: note.gift,
      });
    } catch (cause: unknown) {
      /*
        A refused order, a 422 on the line, a 429, a network failure, or an
        instruction this road cannot act on. Nothing has been charged in any of
        them — the throw happens before there is a secret to confirm.
      */
      return fail("The order or its payment was refused.", cause);
    }

    try {
      /*
        `return_url` is **our own** confirmation, built from this origin. It is
        not the open redirect the backend's ADR 0002 guards against: nothing
        caller-supplied reaches the backend on this road — `startWalletPayment`
        sends no `return_to` at all — and the only redirect in play is 3D Secure
        returning the browser to where it started.

        The trailing slash is the export's shape: this is a static site of
        directories with an `index.html` in each, and the address without it
        redirects.
      */
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: `${location.origin}/checkout/complete/` },
      });

      /*
        Reached only when the payment did **not** go through — on success the
        browser has already left for `return_url`. A declined wallet card, an
        abandoned 3D Secure step, an intent Stripe refused: all of them arrive
        here, and all of them are a payment that did not happen.

        ~~`fail`~~ **`refused`** from 29 August 2026. The fact is `fail`'s and
        the channel is not: this is the line that threw `IntegrationError:
        Unexpected call to paymentFailed()` on a real device, because by the
        time a confirmation has answered, the payment has been submitted and
        the interface is Stripe's to close.
      */
      if (error) return refused(error.message ?? "Stripe refused the confirmation.", error);
    } catch (cause: unknown) {
      /*
        **Not `refused`.** A resolved `{ error }` above is Stripe telling us the
        payment did not go through, which is a fact. A *rejection* here is the
        call itself failing — and it can fail after the request reached Stripe,
        which means the charge may exist. There is a secret by this point and it
        has been used, so this is the one arm on this road that must not say
        nothing was taken.
      */
      return unresolved("The confirmation could not be completed.", cause);
    }
  }

  return (
    <>
      {/*
        A zero-size marker, and the handle on the form. The element beside it is
        a cross-origin iframe with nothing addressable inside it, so this is
        what `closest("form")` is called on.
      */}
      <span ref={anchor} className="hidden" />

      <ExpressCheckoutElement
        /*
          **The width the wallet buttons are drawn at, and the reason they were
          not the frames' width until 29 August 2026.**

          `className` lands on the plain `<div>` react-stripe-js mounts the
          element into, and that div is a flex item of the row above — so with no
          width of its own it was sized by its content, and Stripe's content is an
          iframe that asks for 300px. The wallet buttons stood 292px wide in a
          497.63px column of 497.63px frames, centred, visibly narrow against
          every other control on the panel.

          `w-full` is what makes it the column's width instead: the element fills
          the row, `.__PrivateStripeElement` is `display: block` inside it, and
          the iframe's own `min-width: 100%` follows both. Measured against
          staging at 497.63px and at 229.91px, where a `.checkout-option` stands
          at exactly the same two numbers.

          The iframe reads 8px wider than that, and it is meant to: Stripe sets
          `width: calc(100% + 8px)` with `margin: -4px` and insets what it draws
          by the same amount, so the *button* lands on the frames' edges. Nothing
          overflows — the document and the panel both scroll to their own width.

          Height is the dimension `className` cannot reach — it is drawn inside
          the iframe — so it is set through `buttonHeight` in the options
          instead, resolved from the frames by `useFrameHeight`. Stripe's ceiling
          of 55 is the only part of it still left to the row.
        */
        className="w-full"
        options={options}
        onAvailablePaymentMethodsChange={onAvailability}
        onConfirm={(event) => void handleConfirm(event)}
      />
    </>
  );
}
