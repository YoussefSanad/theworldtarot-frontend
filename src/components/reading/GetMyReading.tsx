import Image from "next/image";
import type { ReactNode } from "react";

import { PanelHeading } from "@/components/reading/PanelHeading";
import { ExpressCheckout } from "@/components/reading/ExpressCheckout";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { readingPageChrome, rushDelivery, type ReadingPage } from "@/content/reading-pages";
import { checkout as marks, type ImageAsset } from "@/lib/assets";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/price";
import type { ProductOffer } from "@/lib/product";

const { checkout, gift } = readingPageChrome;

/**
 * The price, the delivery, and the five ways the client draws of paying it.
 *
 * ## The price is the catalogue's, and so is whether there is one
 *
 * `offer` is what the product endpoint said, as a state rather than a number —
 * see `lib/product.ts`. Three of its four reach this component, and the rule
 * that decides all three is one sentence: **where there is no live money there
 * is nothing that can take a payment.**
 *
 * Note what that sentence does *not* say. It is about what can be paid, not
 * about what can be seen — the client's frame is drawn in every state, and only
 * the one control that quotes an amount is conditional on there being one.
 *
 * - **live** — the price, formatted from `Money` against the site's locale, and
 *   a real `ExpressCheckout` mounted from `offer.money`, so the number the customer
 *   authorises in the sheet is the number they were quoted on the page
 * - **loading** — a resting placeholder at the price line's own height, and the
 *   controls kept in the layout but `invisible` and `inert`. They reserve their
 *   height without being reachable by a pointer, a tab, a screen reader or a
 *   programmatic click. **This is the point of the state**: 498px appearing
 *   under a thumb already reaching for Apple Pay is how a customer pays for
 *   something they did not mean to
 * - **unreachable** — the bundled `reading.price` as plain copy, and the frame's
 *   own five buttons, none of which can take money. The panel looks whole
 *   because a visitor who arrives while the API is down should not meet a hole
 *   where the checkout is. **No express checkout element mounts**, and that is the part
 *   that matters: `reading.price` is the string `"$75"` for a reading the
 *   catalogue prices at EUR 7000. It has no currency in it, nobody has verified
 *   the number today, and a sheet quoting it would be asking for consent to an
 *   amount no server ever agreed to
 *
 * The fourth, **withdrawn**, never gets here — `ReadingOrder` takes the whole
 * order off the page rather than rendering a checkout for something that is not
 * for sale.
 *
 * ## The controls
 *
 * **One of the five is real once there is money**: Apple Pay, which becomes a
 * `ExpressCheckout` on `live` and stays the client's ghost button otherwise. See
 * that file — it takes `Money` rather than an offer, so it cannot be mounted
 * from a state that has no amount.
 *
 * **Three are duds**, on purpose and for now. There is no checkout endpoint and
 * no redemption flow, so Google Pay, Pay with Card and redeem gift code are
 * `type="button"` with nothing behind them — inert rather than submitting a form
 * that would only reload the page with the visitor's question in the URL. They
 * are real buttons rather than disabled ones because the client rejected a
 * disabled control elsewhere on the site: it reads as a bug rather than as
 * "not yet". Google Pay is #36 and the card is #38.
 *
 * The panel is visibly mixed while that is true: Apple draws its own button and
 * allows it three themes, none of them gold, so it cannot be made to match the
 * gold-outlined frames beside it. That is a constraint rather than an
 * oversight — see `ExpressCheckout` and `lib/stripe.ts`.
 *
 * The fifth, `gift a reading`, is live: it turns the whole order into a gift
 * order in place. See `ReadingOrder` for what that means and why it is a mode
 * rather than a second page.
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
  const offering = offer.status === "live";

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
          The one control on this panel that is real, and the only one that
          needs an amount. It is mounted from `offer.money`, which exists on
          `live` and on no other state — so the slot below it is not a fallback
          for a wallet button, it is the client's frame standing where a wallet
          button is not being offered.
        */}
        {offering ? (
          <ExpressCheckout money={offer.money} />
        ) : (
          <CheckoutOption label="Pay with Apple Pay">
            <Mark art={marks.applePay} className="w-[15.43cqw]" />
          </CheckoutOption>
        )}

        <CheckoutOption label="Pay with Google Pay">
          <Mark art={marks.googlePay} className="w-[18.63cqw]" />
        </CheckoutOption>

        <CheckoutOption>
          <Mark art={marks.card} className="w-[7.13cqw]" />
          <span className="font-sans font-light">{checkout.card}</span>
        </CheckoutOption>

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

        {/* Between the two gift controls, at the 448px every rule here is drawn at. */}
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
 * One of the five. `gift a reading` passes an `onClick` and a pressed state;
 * the other four pass neither and are inert — `type="button"`, so a press does
 * nothing at all rather than submitting the order form they sit in.
 */
function CheckoutOption({
  label,
  pressed,
  onClick,
  children,
}: {
  /** For the two that are a mark with no words in them. */
  label?: string;
  pressed?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="fluid"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="checkout-option"
    >
      {children}
    </Button>
  );
}

/**
 * A mark inside a checkout option, at its share of the panel — `cqw` rather
 * than a share of the button, so the five marks keep their sizes relative to
 * each other and to everything else in the panel.
 */
function Mark({ art, className }: { art: ImageAsset; className: string }) {
  return (
    <Image
      src={art.src}
      alt=""
      width={art.width}
      height={art.height}
      className={cn("h-auto max-w-none shrink-0", className)}
    />
  );
}
