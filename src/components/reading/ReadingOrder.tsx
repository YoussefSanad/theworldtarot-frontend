"use client";

import { useState } from "react";

import { AskQuestion } from "@/components/reading/AskQuestion";
import { GetMyReading } from "@/components/reading/GetMyReading";
import { RecipientDetails } from "@/components/reading/RecipientDetails";
import { readingPageChrome, type ReadingPage } from "@/content/reading-pages";
import { useProduct } from "@/lib/product";

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
 * ## What is for sale, and whether anything is
 *
 * This is also where the catalogue is asked about the product — `useProduct`,
 * on the page's own `productKey` — because the answer decides the whole
 * section, not only the number in it. See `docs/plans/reading-page-live-price.md`.
 *
 * **A withdrawn product takes the order off the page.** A 404 means unpublished,
 * or copy or a price emptied in the panel: somebody withdrew it deliberately,
 * and it is the same call the homepage already makes when it drops a tile the
 * catalogue answered without (`HIDE_WITHDRAWN` in `lib/products.ts`). The rest
 * of the page is untouched — the reading, what it includes, the testimonial and
 * the artwork are all still true — but nothing here invites a purchase, and the
 * question goes with it, being a line on an order that cannot be placed.
 *
 * The anchor stays. It sits on the wrapper rather than on the checkout section,
 * so the closing call to action at the foot of the page lands on the panel in
 * every state instead of scrolling to an id that is no longer in the document.
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
  const offer = useProduct(reading.productKey);

  return (
    <div id={readingPageChrome.checkout.anchor}>
      {offer.status === "withdrawn" ? null : (
        /*
          No action, and none of its controls submit it — see `GetMyReading`. It
          is a form because the fields inside it are one submission's worth of
          data, and naming them now is what makes wiring the checkout a matter
          of adding an endpoint rather than restructuring the panel.
        */
        <form className="mt-[clamp(2rem,5.63vw,6.75rem)]">
          {gifting ? <RecipientDetails /> : <AskQuestion />}

          <GetMyReading
            reading={reading}
            offer={offer}
            gifting={gifting}
            onGiftToggle={() => setGifting((on) => !on)}
          />
        </form>
      )}
    </div>
  );
}
