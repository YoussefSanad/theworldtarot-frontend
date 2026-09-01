"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Mark } from "@/components/ui/Mark";
import { readingPageChrome } from "@/content/reading-pages";
import { checkout as marks } from "@/lib/assets";
import { startCheckout } from "@/lib/buy";
import { orderFormAccepts, orderNoteIn } from "@/lib/order-note";
import { type Money } from "@/lib/price";

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
 * ## ~~`BuyNow`~~ `HostedCheckoutButton`, from 31 August 2026
 *
 * **Renamed because the old name was a label, and the label moved three times
 * in three days**: "Buy Now", then "Continue to Checkout" on 29 August, then
 * "Pay Another Way" on 30 August, all at the client's request. An identifier
 * named after copy goes stale every time the copy does — and by the end this
 * control was called one thing in the code, labelled another on the page, keyed
 * `checkout.buy` in the content, and called "the card button" in `CONTEXT.md`.
 * Four names for one control is the exact condition that file exists to
 * prevent.
 *
 * **So the name is the road, not the words on it.** What this button *is* is
 * the control that starts the hosted-page road, and that has been true since 29
 * August through three labels. `CardButton` was the other candidate — it is
 * what `CONTEXT.md` and both document titles already say — but the label's own
 * docblock argues at length that this button names no payment method, and an
 * identifier that names one puts that argument back on the table every time
 * somebody reads it.
 *
 * In flowing prose it is **"the checkout button"**; `HostedCheckoutButton` is
 * for the component itself. The hook `check-panel.mjs` presses is
 * `data-hosted-checkout`.
 *
 * ## It does not quote the price, and that is a layout fact
 *
 * ~~The amount set beside the label, in champagne.~~ **Gone from the button on
 * 29 August 2026**, at the client's request. The panel states the price once,
 * in display type above these frames, so the number in the button was the
 * second place it was said and the only one that had to be read at nav size.
 *
 * What it cost was the column's shape. `.checkout-option` was the same box
 * five times over — the client stacked them as one set of equal frames — and a
 * third child pushed "Continue to Checkout" past the width it fits on one line:
 * the label wrapped, and the frame stood 82px against its siblings' 78px.
 * Removing the amount alone did not settle that (the label wanted 12.46em and
 * had 12.27em of it), which is why `.checkout-option` gives back some of its
 * inline padding in the same change. `money` stays a prop: it is what the order
 * is placed in, not what the button says.
 *
 * **Both of those facts have since moved and the conclusion has not.** The
 * label is "Pay Another Way" from 30 August 2026 and the face is Gill Sans
 * rather than Cinzel, so this button has more room than the measurement above
 * describes; the two frames under it were narrowed in the same change and now
 * have less. The amount stays off the button for the reason it came off, which
 * was never the width alone: the panel says the price once, above these frames,
 * in display type.
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
 * ## It takes money in gift mode too, from 30 August 2026
 *
 * ~~`POST /orders` has no field for a recipient email or a gift message. Today
 * every control in gift mode is a dud, which is harmless; one live button makes
 * it a bug that charges somebody for a gift delivered to themselves. So the
 * button stands, states that gifting is coming, and places nothing.~~
 *
 * The endpoint still has no such field and the backend has grown nothing. What
 * changed is where the recipient goes: `orderNoteIn` composes the two gift
 * fields into the line's `question`. Why that is enough to charge on is argued
 * at the gate it replaced, in `GetMyReading`.
 *
 * `gifting` stays a prop and is now only about the note underneath: the button
 * is buyable in both modes, and the sentence under it is what differs.
 *
 * ## What was typed is read off the form, not held in state
 *
 * A `<button>` inside a form knows its own form, and what the customer typed is
 * a named field in it — `question`, or the recipient's two in gift mode — read
 * at the moment of the press. See `orderNoteIn` in `lib/order-note.ts`, which
 * the wallet button reads through as well: it has to reach the order line
 * identically on both roads, and by the same rules.
 */
export function HostedCheckoutButton({
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

  const buyable = money !== null;

  async function buy(control: HTMLButtonElement) {
    /*
      Not `disabled`. The client rejected a disabled control elsewhere on the
      site — it reads as a bug rather than as "not yet" — so the frame stands in
      every state and the refusal is here, where it can also refuse a second
      press of a button whose first press is still in flight.
    */
    if (money === null || pending) return;

    /*
      **Before an order exists**, which is the only place it is worth being.
      Nothing submits this form, so the `required` on the recipient's address is
      the browser's to enforce and nobody's to trigger; this is what triggers
      it. Silent on a form with nothing wrong with it, so a self-purchase — where
      the question is not required and never was — is untouched.
    */
    if (!orderFormAccepts(control)) return;

    const note = orderNoteIn(control);

    setPending(true);
    setFailed(false);

    try {
      const url = await startCheckout({ productKey, money, question: note.text, gift: note.gift });

      /*
        The pending state is deliberately not cleared. The browser is leaving,
        and clearing it would put the resting label back under a thumb for the
        moment the navigation takes — which is the same mis-tap the loading
        state exists to prevent, arriving at the other end of the flow.
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
        data-hosted-checkout=""
        type="button"
        variant="ghost"
        size="fluid"
        className="checkout-option"
        /*
          Announced as unavailable rather than rendered as disabled, so the
          one inert case left — no live price — is as legible to a screen reader
          as the panel makes it on screen. ~~The two inert cases: no live price,
          and gift mode.~~ Gift mode takes money from 30 August 2026, and the
          note under the button no longer answers for this attribute.
        */
        aria-disabled={!buyable}
        aria-busy={pending}
        /*
          The **node** is what is handed over, read here because `currentTarget`
          is only the button for as long as the handler is running. What is done
          with it — the validity check and the read of the form around it — both
          happen before the first `await` in `buy`, and a direct reference to the
          node outlives the event React empties.
        */
        onClick={(event) => void buy(event.currentTarget)}
      >
        {pending ? (
          checkout.buying
        ) : (
          <>
            {/*
              Still no face of its own, and the face it inherits has now changed
              twice. ~~It carried the site's only `font-sans` until 29 August
              2026 — inherited from the five-frame panel, where four siblings
              hid it, into a three-frame one where it was the odd one out (#49)
              — and then `.btn-ghost`'s serif with the rest of the panel.~~
              From 30 August 2026 `.checkout-option` sets Gill Sans Light on
              every frame here (#50), so this span is in the sans it started in
              by inheritance, and there is no longer an odd one out to be.
            */}
            {/*
              `marks.card` is the client's own frame icon, drawn for the "Pay
              with Card" frame this button replaced and unused between `1fd46f6`
              and 29 August 2026. Restored at the client's request, at the scale
              its two siblings on this panel already use: 49px ÷ 6.87 = 7.13cqw.

              **It is narrower than the road it opens**, and that is argued in
              `content/reading-pages.ts` beside the label rather than here: the
              hosted page takes Apple Pay and Google Pay too. The wallets have
              their own buttons above this one, so card is what is left by the
              time a customer is reading this frame.
            */}
            <Mark art={marks.card} width="7.13cqw" />
            <span>{checkout.buy}</span>
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
