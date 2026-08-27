"use client";

import { useState } from "react";

import { AskQuestion } from "@/components/reading/AskQuestion";
import { GetMyReading } from "@/components/reading/GetMyReading";
import { RecipientDetails } from "@/components/reading/RecipientDetails";
import type { ReadingPage } from "@/content/reading-pages";

/**
 * The left panel's form, and the one piece of state on this page.
 *
 * **Gift is a mode, not a page.** Clicking "gift a reading" turns this form
 * into a gift order in place: the question section becomes recipient details,
 * the payment stays exactly where it was, and the price, the product and
 * everything else the visitor was looking at holds still. A separate
 * `/readings/gift` page would have to restate all of it, and would lose the
 * reading they had already chosen.
 *
 * **The purchaser never gets a question field**, which is the hard constraint
 * and the reason this is a swap rather than a disclosure. The two sections are
 * mutually exclusive in the DOM, so there is no hidden `question` input left
 * in the form to be submitted with a gift — hiding one with CSS would have
 * satisfied the design and not the requirement.
 *
 * The recipient's own question is asked after they redeem, which is a flow
 * this page does not build yet: `redeem gift code` is a dud, as the payment
 * controls are. See `GetMyReading`.
 *
 * ## One thing here is a deliberate departure
 *
 * The client's frame puts "gift a reading" at the foot of the payment column,
 * and what it changes is most of a panel above it — an action whose effect is
 * off screen. Rather than move her button, `CountedField`'s `autoFocusOnMount`
 * brings the visitor to the fields that replaced the question. The control
 * also states what it is: it carries `aria-pressed`, and its label becomes the
 * way back out, so gift mode can never be somewhere a visitor is stuck.
 */
export function ReadingOrder({ reading }: { reading: ReadingPage }) {
  const [gifting, setGifting] = useState(false);

  return (
    /*
      No action, and none of its controls submit it — see `GetMyReading`. It is
      a form because the fields inside it are one submission's worth of data,
      and naming them now is what makes wiring the checkout a matter of adding
      an endpoint rather than restructuring the panel.
    */
    <form className="mt-[clamp(2rem,5.63vw,6.75rem)]">
      {gifting ? <RecipientDetails /> : <AskQuestion />}

      <GetMyReading reading={reading} gifting={gifting} onGiftToggle={() => setGifting((on) => !on)} />
    </form>
  );
}
