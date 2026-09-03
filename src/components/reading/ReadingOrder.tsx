"use client";

import { useState, useSyncExternalStore } from "react";

import { AskQuestion } from "@/components/reading/AskQuestion";
import { GetMyReading } from "@/components/reading/GetMyReading";
import { RecipientDetails } from "@/components/reading/RecipientDetails";
import { readingPageChrome, type ReadingPage } from "@/content/reading-pages";
import { questionFor } from "@/lib/checkout-session";
import { giftOffered, useProduct } from "@/lib/product";

/**
 * The left panel's form, and the one piece of state on this page.
 *
 * **Gift is a mode, not a page.** Clicking "Gift a Reading" turns this form
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
 * this page does not build and, from 31 August 2026, no longer advertises: the
 * `Redeem A Gift Code` frame that stood inert in the payment column went in
 * #62, redemption being a page of its own rather than a control on this one.
 * See `GetMyReading`.
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
 * ## The question a cancelled checkout left behind
 *
 * **Losing several sentences of typed question silently is the worst thing this
 * flow can do**, and a redirect is what makes it easy to get wrong: a customer
 * who cancels at Stripe arrives back at an ordinary page load, with nothing in
 * the URL to say where they came from. The record written before the browser
 * left is the only evidence, so this reads it on the way in.
 *
 * **Only onto the page it was typed on.** The record names the **product key**
 * it was made against, and a question restored onto a different reading is a
 * stranger's sentence appearing in a box the visitor did not type it in. That
 * comparison is `questionFor`, beside the guard the confirmation uses, rather
 * than a pair of fields compared here.
 *
 * **And never a gift**, from 30 August 2026, which `questionFor` decides and
 * argues. What it means here is that a cancelled gift checkout comes back to an
 * empty panel in self mode: this reads one string for one textarea, and gift
 * mode is two fields and a toggle it has no way to restore.
 *
 * `useSyncExternalStore` rather than an effect that sets state. Storage is an
 * external store, and this is a static export: the HTML is built on a machine
 * that has none, so the build snapshot is `null` and the client's is the record.
 * Reading it during render instead would hydrate a page whose first paint
 * disagrees with its second. Nothing subscribes, because nothing changes the
 * record while this page is open — the one thing that writes it is the checkout
 * button,
 * immediately before the browser leaves.
 *
 * The section is **remounted** rather than re-rendered when a question arrives,
 * which the `key` is for: the field is uncontrolled, and React applies a
 * `defaultValue` at mount and ignores it on an update. The key only ever
 * changes once, on the render after hydration, and only where there is
 * something to put back.
 *
 * **Nothing is cleared here.** A customer who cancels twice gets their question
 * back twice, and the confirmation still has a record to paint from after a
 * reload. The one thing that does drop the question is the confirmation itself,
 * once the backend has said the money moved — a question about a reading
 * already bought, sitting in the box on the way back to the page, reads as an
 * order that did not go through.
 *
 * ## Whether there is a gift mode at all is the catalogue's answer
 *
 * `is_giftable` on `/products` decides it, from 3 September 2026 (#73), and
 * this component asks the same question `GetMyReading` asks rather than being
 * handed the answer: the control that turns the mode on and the section it
 * turns on are two files, and a page that drew one without the other is either
 * a dead button or a form with no way out of it. The rule is `giftOffered` in
 * `lib/product.ts`.
 *
 * **So the section is mounted on the mode *and* on the offer**, which is one
 * `&&` guarding a transition that can happen: a page that first painted
 * `unreachable` draws the toggle, and a later answer can be a live product the
 * backend says may not be gifted. Without the second half the visitor is left
 * in a gift form whose way out has just been removed from under them.
 *
 * ## One thing here is a deliberate departure
 *
 * The client's frame puts "Gift a Reading" at the foot of the payment column,
 * and what it changes is most of a panel above it — an action whose effect is
 * off screen. Rather than move her button, `CountedField`'s `autoFocusOnMount`
 * brings the visitor to the first of the fields that replaced the question —
 * the **gift signature** from 3 September 2026, the recipient's address before
 * it. The control also states what it is: it carries `aria-pressed`, and its
 * label becomes the way back out, so gift mode can never be somewhere a visitor
 * is stuck.
 */
export function ReadingOrder({ reading }: { reading: ReadingPage }) {
  const [wantsGift, setWantsGift] = useState(false);
  const offer = useProduct(reading.productKey);
  // Both halves, so the mode cannot outlive the offer that allows it. See above.
  const gifting = wantsGift && giftOffered(offer);
  const restored = useSyncExternalStore(
    nothingChangesIt,
    () => questionFor(reading.productKey),
    noQuestionWhereThisIsBuilt,
  );

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
          {gifting ? (
            <RecipientDetails />
          ) : (
            <AskQuestion key={restored === undefined ? "fresh" : "restored"} question={restored} />
          )}

          <GetMyReading
            reading={reading}
            offer={offer}
            gifting={gifting}
            onGiftToggle={() => setWantsGift((on) => !on)}
          />
        </form>
      )}
    </div>
  );
}

/** Nothing writes the record while this page is open, so there is nothing to hear. */
const nothingChangesIt = () => () => {};

/** The static export is built where there is no sessionStorage to read. */
const noQuestionWhereThisIsBuilt = () => undefined;
