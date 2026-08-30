"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { PanelHeading } from "@/components/reading/PanelHeading";
import { BuyNow } from "@/components/reading/BuyNow";
import { ExpressCheckout } from "@/components/reading/ExpressCheckout";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Mark } from "@/components/ui/Mark";
import { readingPageChrome, rushDelivery, type ReadingPage } from "@/content/reading-pages";
import { checkout as marks } from "@/lib/assets";
import { cn } from "@/lib/cn";
import { useWalletOffered } from "@/lib/payment-methods";
import { formatPrice } from "@/lib/price";
import type { ProductOffer } from "@/lib/product";

const { checkout, gift } = readingPageChrome;

/**
 * The price, the delivery, and the ways of paying it.
 *
 * ## Two roads, side by side, and they cannot be one control
 *
 * The client draws five frames. What stands here is a **wallet row** that
 * collapses to nothing where there is no wallet, above a fixed-height **Buy
 * Now** that is always there — which is the arrangement
 * `docs/adr/0002-checkout-happens-on-stripes-page.md` argued for rather than a
 * compromise against it. Its claim was never that a wallet button is unwelcome;
 * it was that a wallet sheet, whose height is unknowable at build time, cannot
 * be the control this panel is laid out around.
 *
 * They are two controls because they are two things. Buy Now sends the browser
 * to a hosted Checkout Session — an address; the wallet row mounts an express
 * checkout element and confirms a PaymentIntent in the page — an iframe. No
 * Stripe parameter reconciles those, which is why `/pay` answers two shapes.
 *
 * **The panel is visibly mixed and that is a constraint rather than an
 * oversight.** Apple draws its own button and allows it three themes, none of
 * them gold; Google allows two. Neither can be made to match the gold-outlined
 * frames beside it.
 *
 * ## The price is the catalogue's, and so is whether there is one
 *
 * `offer` is what the product endpoint said, as a state rather than a number —
 * see `lib/product.ts`. Three of its four reach this component, and the rule
 * that decides all three is one sentence, unchanged by the road: **where there
 * is no live money there is nothing that can take a payment.**
 *
 * Note what that sentence does *not* say. It is about what can be paid, not
 * about what can be seen — the client's frame is drawn in every state, and only
 * the one control that quotes an amount is conditional on there being one.
 *
 * - **live** — the price, formatted from `Money` against the site's locale, and
 *   Buy Now handed `offer.money`, so the currency the order is placed in is the
 *   one the customer was quoted
 * - **loading** — a resting placeholder at the price line's own height, and the
 *   controls kept in the layout but `invisible` and `inert`. They reserve their
 *   height without being reachable by a pointer, a tab, a screen reader or a
 *   programmatic click. **This is the point of the state**: 498px appearing
 *   under a thumb already reaching for a payment button is how a customer pays
 *   for something they did not mean to
 * - **unreachable** — the bundled `reading.price` as plain copy, and the frames
 *   drawn with nothing behind them. The panel looks whole because a visitor who
 *   arrives while the API is down should not meet a hole where the checkout is.
 *   **No order can be placed**, and that is the part that matters:
 *   `reading.price` is the string `"$75"` for a reading the catalogue prices at
 *   EUR 7000. It has no currency in it, nobody has verified the number today,
 *   and an order placed from it would be an order at an amount no server ever
 *   agreed to
 *
 * The fourth, **withdrawn**, never gets here — `ReadingOrder` takes the whole
 * order off the page rather than rendering a checkout for something that is not
 * for sale.
 *
 * ## The controls
 *
 * **Two of them take money once there is money**: the wallet row and Buy Now.
 * Both take `Money` rather than an offer, so neither can be built from a state
 * that has no amount. See those files for what a press does and what makes each
 * inert.
 *
 * **`Redeem A Gift Code` is a dud**, on purpose and for now: there is no
 * redemption flow, so it is `type="button"` with nothing behind it — inert
 * rather than submitting a form that would only reload the page with the
 * visitor's question in the URL. It is a real button rather than a disabled one
 * because the client rejected a disabled control elsewhere on the site: it
 * reads as a bug rather than as "not yet".
 *
 * The third, `Gift a Reading`, is live: it turns the whole order into a gift
 * order in place. See `ReadingOrder` for what that means and why it is a mode
 * rather than a second page. **Buy Now is inert while it is on**, because
 * `POST /orders` has no field for a recipient.
 *
 * ## Delivery
 *
 * Off — the state that ships — the frame's own line, stating the one delivery
 * there is. On, the same line becomes a choice with standard still selected,
 * so throwing the switch never changes what a visitor gets by doing nothing.
 * The switch is `rushDelivery.enabled` and it belongs to the CMS.
 */
export function GetMyReading({
  reading,
  offer,
  gifting,
  onGiftToggle,
}: {
  reading: ReadingPage;
  /** Never `withdrawn`; that state does not render an order at all. */
  offer: Exclude<ProductOffer, { status: "withdrawn" }>;
  gifting: boolean;
  onGiftToggle: () => void;
}) {
  /*
    Whether this environment offers the wallet at all, which is a different
    question from whether the device has one. A local build configures no
    Stripe; a deployed one does. `false` until the backend answers, so nothing
    is mounted and no Stripe.js is fetched on a page that turns out to have no
    wallet button to draw.
  */
  const walletOffered = useWalletOffered();

  return (
    /* 49px under the question field. */
    <section className="mt-[clamp(1rem,2.55vw,3.0625rem)] flex flex-col items-center text-center">
      <PanelHeading className="text-h2-md">{checkout.heading}</PanelHeading>

      <Price offer={offer} fallback={reading.price} />

      {rushDelivery.enabled ? (
        <DeliveryChoice />
      ) : (
        <p className="mt-[clamp(0.25rem,0.36vw,0.4375rem)] text-note leading-none tracking-[0.01em] font-light text-gold">
          {reading.delivery}
        </p>
      )}

      {/*
        498px of the 687px panel; 12px between buttons at the 30px they label.

        **This is the column's width, and from 30 August 2026 it is no longer
        every frame's.** The wallet row and Buy Now fill it, as they always did;
        the two gift frames under the Stripe line set their own narrower width
        over the top of `.checkout-option`'s — see `CheckoutOption` below. It
        stays here rather than moving onto the children entirely because two
        things in this column are still shares of it and not of a frame: the
        secure line, and the divider, whose 448px is measured against this box.

        Absent entirely once the request has failed, and present-but-inert while
        it is still in flight — the block's own height is what reserves the
        space, rather than a `min-height` that would be a second number to keep
        true at four widths of a panel laid out in `cqw`.
      */}
      <div
        className={cn(
          "mt-[clamp(0.5rem,1.2vw,1.4375rem)] flex w-[72.49cqw] flex-col items-center gap-[0.4em] text-nav leading-none",
          offer.status === "loading" && "invisible",
        )}
        inert={offer.status === "loading"}
      >
        {/*
          The wallet row, above Buy Now and nowhere else.

          **Three conditions, and each removes it for a different reason.**
          `live`, because `money` exists in no other state and a sheet quoting a
          price no server agreed to is the one thing this panel may never open.
          `walletOffered`, because an environment that configured no Stripe has
          no wallet to offer. And not `gifting`, for the reason Buy Now goes
          inert there: `POST /orders` has no field for a recipient, so a live
          control in gift mode charges somebody for a gift delivered to
          themselves — and a wallet is the worse of the two to get wrong, since
          it takes the money the instant a face is recognised.

          Absent rather than collapsed in all three. The row's own collapse
          answers a fourth question — this device has no wallet — and it must
          stay the only reason the row is ever zero-height, or the check that
          tells a collapsed row from an absent one is measuring nothing.

          **The gifting absence is the one a customer can watch happen, and
          from 30 August 2026 it is spoken for.** The other two are states a
          panel is found in; this one answers a button the customer just
          pressed, on the only devices that had a row to lose. What speaks is
          `checkout.giftingComing` under Buy Now, and why one note does for
          both controls is argued there beside the copy rather than here.
          Nothing is mounted in this branch to carry it: a frame here is a
          frame in the one state the panel is sure it cannot take money in.
        */}
        {offer.status === "live" && walletOffered && !gifting ? (
          <ExpressCheckout productKey={reading.productKey} money={offer.money} />
        ) : null}

        {/*
          The control on this panel that is always here, and the only one that
          needs an amount before it can act. `offer.money` exists on `live` and
          on no other state, so the button is handed `null` everywhere else and
          there is no branch in it that can place an order without a price the
          backend set.
        */}
        <BuyNow
          productKey={reading.productKey}
          money={offer.status === "live" ? offer.money : null}
          gifting={gifting}
        />

        {/*
          Figma sets this at 24px, a step under the buttons it reassures about,
          and the padlock beside it at 19x27 — sized in `em` off the line so
          the two stay in proportion rather than the mark pinning to 19px.
        */}
        <p className="mt-[0.2em] flex items-center justify-center gap-[0.4em] text-note leading-none font-light text-white">
          <Image
            src={marks.lock.src}
            alt=""
            width={marks.lock.width}
            height={marks.lock.height}
            className="h-[1.125em] w-auto max-w-none shrink-0"
          />
          {checkout.secure}
        </p>

        <CheckoutOption>
          <Mark art={marks.redeem} className="w-[7.57cqw]" />
          {checkout.redeem}
        </CheckoutOption>

        {/*
          Between the two gift controls, at the 448px every rule here is drawn
          at.

          Unchanged by the narrowing, and deliberately: the client's frame keeps
          this rule at its full width across two frames that no longer reach it.
          448px is `--measure-flourish` capped by the 498px column above, which
          is why the column keeps a width of its own.
        */}
        <Divider variant="hero" className="my-[-0.3em]" />

        {/*
          The one control on this panel that does something. Its label is the
          way back out of gift mode, so the state can be read off the button
          rather than inferred from a section most of a panel above it.
        */}
        <CheckoutOption pressed={gifting} onClick={onGiftToggle}>
          <Mark art={marks.gift} className="w-[7.71cqw]" />
          {gifting ? gift.leave : gift.enter}
        </CheckoutOption>
      </div>
    </section>
  );
}

/**
 * The one line the whole panel turns on.
 *
 * Three states, one box: whichever renders, it is a single line of display type
 * at the same size, so the heading above it and the delivery under it do not
 * move as the answer arrives.
 *
 * The resting state is a shape rather than words. "Loading…" in the price's
 * place is a sentence the panel would have to take back, and at this size it
 * reads as copy; a quiet bar reads as a price that has not landed. Screen
 * readers get `checkout.pricePending` instead, and get it through `role=status`
 * so the price that replaces it is announced rather than swapped in silently.
 */
function Price({
  offer,
  fallback,
}: {
  offer: Exclude<ProductOffer, { status: "withdrawn" }>;
  fallback: string;
}) {
  const line = "mt-[clamp(0.125rem,0.21vw,0.25rem)] font-display text-h2-md leading-none tracking-[0.01em] text-white";

  if (offer.status === "loading") {
    return (
      <p role="status" aria-label={checkout.pricePending} className={line}>
        <span className="inline-block h-[0.55em] w-[2.4em] animate-pulse rounded-full bg-white/15 align-middle" />
      </p>
    );
  }

  /*
    `formatPrice` formats against the site's locale and never the browser's, so
    a US visitor's price is not written `75,00 $` because their laptop is set to
    German. The currency varies by visitor; the language it is written in does
    not. The other branch is `reading.price`, which is already a display string
    and is copy rather than money — see its docblock.
  */
  return <p className={line}>{offer.status === "live" ? formatPrice(offer.money) : fallback}</p>;
}

/**
 * Standard or rush, once the CMS has turned rush on.
 *
 * Radios rather than a switch: these are two priced options of which exactly
 * one is true, which is what a radio group is for, and it means the choice
 * submits itself along with the rest of the form the day there is somewhere to
 * submit to. Standard carries `defaultChecked`, so the default outcome stays
 * the one the page had before the switch was thrown.
 */
function DeliveryChoice() {
  return (
    <fieldset className="mt-[clamp(0.25rem,0.52vw,0.625rem)] flex flex-col items-start gap-[0.3em] text-note leading-none">
      <legend className="sr-only">Delivery</legend>

      {/*
        Named rather than described. The product's own `delivery` line — "within
        24 hours" — is what the page says when there is only one delivery to
        say; set against an option called 24-Hour Rush it stops reading as a
        promise and starts reading as a contradiction. What arrives when is
        already the last line of Your Reading, in the panel opposite.
      */}
      <DeliveryOption value="standard" defaultChecked>
        {rushDelivery.standard}
      </DeliveryOption>

      <DeliveryOption value="rush">
        {rushDelivery.label} <span className="text-champagne">({rushDelivery.surcharge})</span>
      </DeliveryOption>
    </fieldset>
  );
}

function DeliveryOption({
  value,
  defaultChecked = false,
  children,
}: {
  value: string;
  defaultChecked?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-[0.5em] font-light text-gold">
      {/*
        The same appearance-none-and-gold treatment the newsletter's consent box
        wears, drawn round, and lit with the gold glow every other chosen thing
        on the site answers with rather than a second colour.
      */}
      <input
        type="radio"
        name="delivery"
        value={value}
        defaultChecked={defaultChecked}
        className="size-[0.75em] shrink-0 appearance-none rounded-full border border-gold checked:bg-gold checked:shadow-(--glow-gold)"
      />
      <span>{children}</span>
    </label>
  );
}

/**
 * One of the client's frames, drawn but not wired. `Gift a Reading` passes an
 * `onClick` and a pressed state; `Redeem A Gift Code` passes neither and is
 * inert — `type="button"`, so a press does nothing at all rather than
 * submitting the order form it sits in.
 *
 * Buy Now is not one of these. It wears the same `.checkout-option` treatment
 * so the column reads as one set of frames, and owns its own state, which is
 * what a control that can be mid-purchase needs and these two never are.
 *
 * ## Narrower than the frames above them, from 30 August 2026
 *
 * The client's revision keeps the wallet row and Buy Now at the column's 498px
 * and pulls these two in to **84% of it** — 418px of the 687px panel, which is
 * the `60.89cqw` below. So this is the one thing these two do not share with
 * Buy Now, and the reason the width is set per frame rather than once on the
 * column they stand in.
 *
 * **The ratio is the measurement and the `cqw` is arithmetic off it.** 84% was
 * read off the client's exported frame rather than out of their file, so it is
 * the figure to confirm if the two ever look wrong beside each other; the
 * number here follows from it and from the 72.49cqw above.
 *
 * The `label` prop went with the two frames that were a mark and no words. Both
 * that are left carry their own text, and an `aria-label` restating it would be
 * the accessible name disagreeing with the visible one.
 */
function CheckoutOption({
  pressed,
  onClick,
  children,
}: {
  pressed?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="fluid"
      aria-pressed={pressed}
      onClick={onClick}
      /*
        `w-` is a utility and `.checkout-option`'s `inline-size: 100%` is a
        component, so this wins on layer order rather than on specificity —
        which is why it can be a plain class here and needs no `!`.
      */
      className="checkout-option w-[60.89cqw]"
    >
      {children}
    </Button>
  );
}

/**
 * A mark inside a checkout option, at its share of the panel — `cqw` rather
 * than a share of the button, so the marks keep their sizes relative to each
 * other and to everything else in the panel.
 */
