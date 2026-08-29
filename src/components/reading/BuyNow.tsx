"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { readingPageChrome } from "@/content/reading-pages";
import { startCheckout } from "@/lib/buy";
import { formatPrice, type Money } from "@/lib/price";
import { questionIn } from "@/lib/question";

const { checkout } = readingPageChrome;

/**
 * The one control on the reading panel that takes money.
 *
 * It replaces three of the client's five frames — Apple Pay, Google Pay and Pay
 * with Card — for the length of the interim, and it is a **redirect** rather
 * than a payment: pressing it places an order, starts its payment and sends the
 * browser to Stripe's **hosted page**. Nothing is collected here, and this file
 * loads no Stripe.js. See `docs/adr/0002-checkout-happens-on-stripes-page.md`.
 *
 * ## It takes Money, or nothing at all
 *
 * `money` is `null` in every state but `live`, and there is no branch in here
 * that can buy without it. **Where there is no live money there is nothing that
 * can take a payment** — the panel's one rule — and this is where it is
 * enforced for the button: `reading.price` is the string `"$75"` for a reading
 * the catalogue prices at EUR 7000, and an order placed from it would be an
 * order at an amount no server ever agreed to.
 *
 * ## It is inert in gift mode
 *
 * `POST /orders` has no field for a recipient email or a gift message. Today
 * every control in gift mode is a dud, which is harmless; one live button makes
 * it a bug that charges somebody for a gift delivered to themselves. So the
 * button stands, states that gifting is coming, and places nothing.
 *
 * ## The question is read off the form, not held in state
 *
 * A `<button>` inside a form knows its own form, and the question is a named
 * field in it, read at the moment of the press. See `questionIn` in
 * `lib/question.ts`, which the wallet button reads through as well — the
 * question has to reach the order line identically on both roads.
 */
export function BuyNow({
  productKey,
  money,
  gifting,
}: {
  /** The reading being bought, and the page a cancelled checkout returns to. */
  productKey: string;
  /** The live offer, or `null` where the catalogue has not priced this today. */
  money: Money | null;
  gifting: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const buyable = money !== null && !gifting;

  async function buy(question: string) {
    /*
      Not `disabled`. The client rejected a disabled control elsewhere on the
      site — it reads as a bug rather than as "not yet" — so the frame stands in
      every state and the refusal is here, where it can also refuse a second
      press of a button whose first press is still in flight.
    */
    if (money === null || gifting || pending) return;

    setPending(true);
    setFailed(false);

    try {
      const url = await startCheckout({ productKey, money, question });

      /*
        The pending state is deliberately not cleared. The browser is leaving,
        and clearing it would put "Buy Now" back under a thumb for the moment
        the navigation takes — which is the same mis-tap the loading state
        exists to prevent, arriving at the other end of the flow.
      */
      location.assign(url);
    } catch (cause: unknown) {
      // Loud here and one sentence on the page. From the outside a refused
      // order and a backend that has grown a shape we cannot read look
      // identical, and they need telling apart from in here.
      console.error("The checkout could not be started.", cause);

      setFailed(true);
      setPending(false);
    }
  }

  return (
    <>
      <Button
        /*
          `check:panel` selects the button by this rather than by its text,
          which changes while a press is in flight and would stop matching
          exactly when the check most wants to see it.
        */
        data-buy-now=""
        type="button"
        variant="ghost"
        size="fluid"
        className="checkout-option"
        /*
          Announced as unavailable rather than rendered as disabled, so the two
          inert cases — no live price, and gift mode — are as legible to a
          screen reader as the line under the button makes them on screen.
        */
        aria-disabled={!buyable}
        aria-busy={pending}
        /*
          The question is read here, synchronously, off the button's own form —
          `currentTarget` is only the button for as long as the handler is
          running, and everything past the first `await` in `buy` happens after
          React has emptied it.
        */
        onClick={(event) => void buy(questionIn(event.currentTarget))}
      >
        {pending ? (
          checkout.buying
        ) : (
          <>
            {/*
              No face of its own. `.btn-ghost` sets the serif every other button
              on the site is in, and this span carried the site's only
              `font-sans` until 29 August 2026 — inherited from the five-frame
              panel, where four siblings hid it, into a three-frame one where it
              was the odd one out. See #49.
            */}
            <span>{checkout.buy}</span>
            {/*
              The amount is the API's, formatted against the site's locale. It
              is set beside the label rather than inside it so the words do not
              move as the price lands, and so a state with no live money simply
              has no number rather than a different sentence.
            */}
            {money ? <span className="text-champagne">{formatPrice(money)}</span> : null}
          </>
        )}
      </Button>

      {gifting ? <Note>{checkout.giftingComing}</Note> : null}

      {/*
        `role="alert"`, because it appears in answer to something the customer
        just did and they may be looking at the button rather than under it.
      */}
      {failed ? <Note alert>{checkout.buyFailed}</Note> : null}
    </>
  );
}

/** A line under the button, at the size the panel's other fine print sits at. */
function Note({ alert = false, children }: { alert?: boolean; children: string }) {
  return (
    <p
      role={alert ? "alert" : undefined}
      className="max-w-[70cqw] text-fine leading-[1.2] font-light text-champagne/73"
    >
      {children}
    </p>
  );
}
