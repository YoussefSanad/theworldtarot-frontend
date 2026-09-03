/**
 * What the customer typed, read out of the form a control sits in, and turned
 * into the fields an order line carries.
 *
 * Shared by the panel's two payment controls, which is the whole reason it is
 * not a private function in either of them. **What the customer typed has to
 * reach the order line identically on both roads** — a wallet payment that
 * dropped it would deliver a reading nobody asked a question of, or a gift
 * nobody named a recipient for, and the customer would have no way of knowing
 * until it arrived.
 *
 * ## Two sections, and from 3 September 2026 two fields on the wire
 *
 * ~~`questionIn`, in `lib/question.ts`.~~ **Renamed on 30 August 2026**, when
 * gift mode grew a live pair of payment controls and this function stopped
 * answering only with questions.
 *
 * ~~`lines[].question` is still the field it fills — the wire shape is
 * unchanged and the backend has grown nothing — but what goes in it now depends
 * on which of the panel's two mutually exclusive sections is mounted.~~
 * **Struck 3 September 2026.** The backend grew `lines[].gift`, and the two
 * sections now fill two different fields: the question section fills
 * `question`, and the gift section fills `gift` and leaves `question` empty.
 * They may not both be filled — a line carrying a question and a present is a
 * 422 keyed to the question — so the exclusivity the panel draws is the
 * exclusivity the wire enforces.
 *
 * **The name is still not a promise about a question.** What this answers is
 * what one press puts on the line, and which of the two that is.
 *
 * Why a gift may be charged at all is argued where the gate came off, in
 * `GetMyReading`, and is not repeated here.
 *
 * **The form is what decides, not a prop.** `recipientEmail` exists in the DOM
 * in gift mode and in no other state, so the mode can be read off the same
 * form the values come out of. Threading `gifting` down to both controls would
 * have put the same branch in two components — which is exactly the drift this
 * module exists to prevent.
 *
 * **Read off the elements by `data-field`, never by `name`.** The panel's two
 * address fields go to the browser under an opaque name so that Chrome does not
 * offer the purchaser their own address; see `fieldIn`, and the week in which
 * that quietly turned every gift order into a self-purchase.
 *
 * ## Read at the press, never held in state
 *
 * That is what keeps `CountedField` uncontrolled: holding the text in React
 * would re-render the whole order form on every keystroke to do it, which is
 * the trade its own docblock refuses.
 *
 * `closest("form")` rather than a button's `.form`, so the same function serves
 * a `<button>` and the wrapper `<div>` the express checkout element mounts
 * inside. The element itself is a cross-origin iframe with nothing readable in
 * it; what is readable is the row it sits in and the form around that.
 */

import type { GiftInput } from "./orders.ts";

/**
 * What one press puts on the order line, and which of the two sections it came
 * from.
 *
 * **The two fields are mutually exclusive and the type does not say so.** A
 * union would, and it would put a narrowing branch in both payment controls to
 * read one field — which is the drift this module exists to prevent, in a
 * shape TypeScript would approve of. What the controls do instead is forward
 * both, and `buy.ts` decides what each is for.
 *
 * ~~The flag is not for the order — `POST /orders` never sees it.~~ **Struck 3
 * September 2026**, when the backend grew `lines[].gift`. The present is now
 * the order's, and it is the record's as well: the confirmation still has to
 * name the address after a round trip to Stripe, and that is `questionFor`'s
 * and `giftRecipient`'s business in `lib/checkout-session.ts`.
 */
export type OrderNote = {
  /**
   * The line's `question`, and **empty in gift mode**.
   *
   * Not "composed" any more, and never both: a line carrying a question and a
   * present is a 422 keyed to the question. In gift mode there is no question
   * field in the form at all — the sections are mutually exclusive — so this
   * answers empty by reading nothing rather than by being cleared.
   */
  text: string;
  /**
   * The present, on a gift, in the wire's own words.
   *
   * **Present rather than true**, which is the change of 3 September 2026: the
   * mode used to be a boolean beside a sentence this module composed, and is
   * now the object the order carries. One thing says a press was a gift, and it
   * is the same thing that says what the gift is.
   *
   * **Absent on a self-purchase**, and present-with-empty-strings on a gift the
   * buyer typed nothing into. That second case is not this module's to refuse —
   * `orderFormAccepts` turns the press down first, and this is a guard rather
   * than a guarantee — and where it does get through, the backend refuses the
   * order with a 422 naming the missing field. **Nothing is charged either
   * way**, which is what the composed sentence could never promise: a gift with
   * no address used to be placed, paid for, and left for a person to notice.
   *
   * **Not the address confirmation**, which is a check on what the buyer typed
   * and is thrown away where it was compared. See `CONTEXT.md`.
   */
  gift?: GiftInput;
};

/**
 * One of the panel's fields, found by the name the app knows it by.
 *
 * **`data-field` rather than `name`, and rather than `FormData`.** The
 * recipient's address and its confirmation both go to the browser under
 * `CountedField`'s opaque `useId` string, because Chrome classifies a field by
 * its `name` as much as by its `autocomplete` and `recipientEmail` was all the
 * excuse it needed to offer the purchaser their own address — the one address a
 * gift must not go to. So the submitted names are unknowable from here and the
 * real ones live on `data-field`, which is where anything reading this form has
 * to look.
 *
 * ~~`new FormData(form)`, keyed by `name`.~~ **Corrected 3 September 2026**
 * (#71). Autofill suppression landed on 29 August and this reader on 30 August,
 * and between those two dates every gift order placed on this panel arrived
 * looking exactly like a self-purchase: `fields.get("recipientEmail")` answered
 * `null` for a field that was sitting in the form under another name, so
 * `orderNoteIn` took the not-a-gift arm, sent no note at all, and the reading
 * would have gone quietly to the buyer. That is the one outcome this module
 * exists to prevent, and it was defeated by an attribute.
 *
 * Reading the element also gets `setCustomValidity` a field to write on, which
 * `FormData` — a snapshot of values — never could.
 */
export function fieldIn(form: ParentNode, name: string): (HTMLInputElement | HTMLTextAreaElement) | null {
  return form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-field="${name}"]`);
}

/**
 * What one field holds, answering `""` for a field this section has not mounted.
 *
 * **Exported for `RedeemPanel`**, which reads its own three fields off its own
 * form and had a verbatim copy of the selector above until 3 September 2026.
 * The reader is one function for the reason the docblock on `fieldIn` gives at
 * length: a second copy is a second thing to forget when the attribute it keys
 * to moves, and the last time that happened it took four days and every gift
 * order placed in them. `scripts/check-panel.mjs` reads the DOM independently
 * on purpose — a check that shared this function could not catch it drifting.
 */
export function textIn(form: ParentNode, name: string): string {
  return fieldIn(form, name)?.value ?? "";
}

/**
 * Whether the address and its confirmation are the same address.
 *
 * **Trimmed and case-folded**, which is a deliberate looseness: a mobile
 * keyboard capitalises the first letter of a field it was not told not to, and
 * a pasted address arrives with a trailing space often enough that refusing
 * either would be refusing a buyer who typed the address correctly twice. The
 * local part of an address is case-sensitive in the RFC and in practice is not,
 * and what is at stake here is a typo rather than a delivery.
 *
 * **An empty confirmation agrees with anything**, so that `required` is what
 * speaks for it. A buyer who has typed nothing has not made a mistake yet, and
 * "these do not match" on an empty box is a worse sentence than "please fill
 * out this field" — which the browser already has.
 */
export function giftAddressesAgree(recipient: string, confirmation: string): boolean {
  const said = confirmation.trim().toLowerCase();

  return said === "" || said === recipient.trim().toLowerCase();
}

/**
 * Writes the disagreement onto the **address confirmation**, or takes it back
 * off.
 *
 * **`setCustomValidity` and nothing else**, which is the whole design of this
 * refusal. It is called from `orderFormAccepts` immediately before the one
 * `reportValidity()`, and both payment controls depend on that being the single
 * place a press can be turned down: a control that grew its own
 * `if (mismatch) return` beside it is how a buyer authorises with their face
 * for a gift the form had already rejected, because two refusal paths are two
 * chances for one of them to be forgotten on the one road no headless browser
 * here can press.
 *
 * So the disagreement is not an error this raises. It is a state it puts on the
 * field, where the browser's own machinery — validity, the bubble, the focus
 * `reportValidity` moves — picks it up exactly as it already picks up the
 * `required` beside it.
 *
 * **Recomputed at every press rather than kept up to date as the buyer types**,
 * which is what makes editing the address *after* confirming it as safe as
 * editing the confirmation. A listener on the section could do the same job and
 * would be one more thing that has to have run.
 *
 * ## The sentence comes off the form, not out of an import
 *
 * The copy lives in `content/reading-pages.ts`, which this module cannot reach:
 * `node --test` resolves no `@/`, and that file would lead on to `@/lib/assets`
 * anyway — every other `@/` in `src/lib` is an `import type` for the same
 * reason. Passing it in as an argument was the other option and it is the
 * forgettable one: a third caller of `orderFormAccepts` that omitted it would
 * turn this check off and nothing would say so.
 *
 * So `RecipientDetails` hangs it on the field's own wrapper as `data-mismatch`,
 * where it is bound to the field it belongs to and arrives with it. An absent
 * one leaves the field valid rather than refusing with an empty bubble — a
 * refusal the buyer cannot read is worse than the typo it was catching.
 *
 * A no-op wherever there is no confirmation to write on: a self-purchase, or a
 * gift section that has not mounted.
 */
function markGiftAddresses(form: ParentNode): void {
  const confirmation = fieldIn(form, "addressConfirmation");

  if (!confirmation) return;

  const said = form.querySelector("[data-mismatch]")?.getAttribute("data-mismatch") ?? "";

  confirmation.setCustomValidity(
    giftAddressesAgree(textIn(form, "recipientEmail"), confirmation.value) ? "" : said,
  );
}

/**
 * Whether the order form will accept what is in it — and where it will not,
 * says so on the offending field.
 *
 * **The panel has required fields and no submit button**, which is the whole
 * reason this exists. `RecipientDetails` marks the **gift signature**, the
 * recipient's address and its confirmation `required`, gives the two addresses
 * `type="email"`, and has `markGiftAddresses` write a mismatch on the third
 * with `setCustomValidity` — every one of which the browser enforces at submit
 * time, and nothing here ever submits. So until 30 August 2026 the attributes
 * were decoration, and they stopped being harmless the moment gift mode could
 * take money: a buyer could toggle to gift, press a wallet button, authorise
 * with their face, and be charged for a gift addressed to nobody.
 *
 * **Three faults, one refusal.** Whichever of them is standing, it is this call
 * that turns the press down and this call alone — which is why the two
 * addresses are compared *here*, on the way past, rather than by a listener
 * that has to have run first. See `markGiftAddresses` for why the
 * disagreement is a state on a field rather than a branch in a control.
 *
 * `reportValidity` rather than `checkValidity`, because refusing a press
 * silently is the same fault in a quieter form. It draws the browser's own
 * message on the field and focuses it — which on the wallet road is where the
 * customer is looking once Stripe has closed its sheet.
 *
 * **A form it cannot find is not an invalid form.** The controls answer an
 * empty note in that case and the order goes without one; refusing there would
 * turn a row lifted out of the form by a refactor into a dead button rather
 * than a harmless one, and it is `check:panel`'s job to catch that.
 */
export function orderFormAccepts(node: Element | null | undefined): boolean {
  const form = node?.closest("form");

  if (!form) return true;

  markGiftAddresses(form);

  return form.reportValidity();
}

/**
 * What the line carries, read off whichever section the form has mounted.
 *
 * An empty `text` and no gift where there is no form, no field, or nothing
 * typed — all three mean the same thing to an order, whose `question` is
 * optional on every product.
 *
 * **Every field is trimmed on the way out.** Whitespace on an order line comes
 * back out in the admin table, in the mail sent from it, and — for the
 * signature — in the subject line of a message to somebody who has never heard
 * of us. It is done here rather than downstream because there is one reader and
 * two roads, and a trim in either road is a trim the other can forget.
 */
export function orderNoteIn(node: Element | null | undefined): OrderNote {
  const form = node?.closest("form");

  // Not a gift, rather than unknown. What is read here decides whether a
  // cancelled checkout refills a textarea, so the case where nothing could be
  // read has to land on the answer that puts nothing anywhere.
  if (!form) return { text: "" };

  /*
    Presence, not truthiness. A field that is not in the form at all and one
    that is there and empty are the two states this has to tell apart, because
    an empty recipient in gift mode is still a gift and must still be sent as
    one — which is why the element is looked for rather than its value read.

    Sending it as one is what earns the refusal. The backend requires an address
    on a gift, so the blank case is a 422 with nothing charged; dropping the
    empty object here would place an ordinary order for the buyer instead, which
    is the outcome this module exists to prevent.
  */
  if (fieldIn(form, "recipientEmail") === null) {
    return { text: textIn(form, "question") };
  }

  const message = textIn(form, "giftMessage").trim();

  return {
    // **Never both.** The gift section mounts no question field, so this reads
    // empty on its own; it is stated rather than read so that a section that
    // one day holds both boxes cannot quietly send a 422.
    text: "",
    gift: {
      recipient_email: textIn(form, "recipientEmail").trim(),
      signature: textIn(form, "giftSignature").trim(),
      // Absent rather than empty. The message is the one field on this section
      // whose label says "optional", and a gift mail rendering a blank line
      // where the buyer's words go is the ordinary case reading like a fault.
      ...(message === "" ? {} : { message }),
    },
  };
}
