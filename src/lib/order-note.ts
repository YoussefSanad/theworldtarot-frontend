/**
 * What the customer typed, read out of the form a control sits in, and turned
 * into the one line of text an order carries.
 *
 * Shared by the panel's two payment controls, which is the whole reason it is
 * not a private function in either of them. **What the customer typed has to
 * reach the order line identically on both roads** — a wallet payment that
 * dropped it would deliver a reading nobody asked a question of, or a gift
 * nobody named a recipient for, and the customer would have no way of knowing
 * until it arrived.
 *
 * ## One field on the wire, two things a customer can put in it
 *
 * ~~`questionIn`, in `lib/question.ts`.~~ **Renamed on 30 August 2026**, when
 * gift mode grew a live pair of payment controls and this function stopped
 * answering only with questions. `lines[].question` is still the field it fills
 * — the wire shape is unchanged and the backend has grown nothing — but what
 * goes in it now depends on which of the panel's two mutually exclusive
 * sections is mounted, and a name promising a question would have been a name
 * that lied in half the cases.
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

/**
 * What one press puts on the order line, and which of the two sections it came
 * from.
 *
 * The flag is not for the order — `POST /orders` never sees it. It is for the
 * **record**, and what it prevents there is argued at `questionFor` in
 * `lib/checkout-session.ts`.
 */
export type OrderNote = {
  /** The line's `question`, composed where the form was the gift section. */
  text: string;
  /** Whether that section was the gift one. */
  gift: boolean;
};

/**
 * What a gift order says on its line, and the only account anybody has of who
 * it was for.
 *
 * ## It is read by a person, not parsed by anything
 *
 * `POST /orders` has no field for a recipient email or a gift message, so the
 * gap this closes is **knowing**: without it the paid order reaches the admin
 * orders table looking exactly like somebody buying a reading for themselves.
 * The line's `question` is the field that table already prints, which is why it
 * is the one used.
 *
 * This is a stopgap with a real end date — the gifting milestone gives the
 * recipient, the message and the **gift signature** columns of their own on a
 * `gifts` row, and a code beside them — and it is written as prose because
 * prose is what survives being read out of a table cell by somebody deciding
 * what to send and where. See the backend's
 * `docs/adr/0004-a-reading-is-a-row-of-its-own.md`.
 *
 * ## It may never answer empty
 *
 * A buyer can reach a payment control in gift mode with nothing typed;
 * `orderFormAccepts` is what stops them, and it is a guard rather than a
 * guarantee — this has to hold even if it is one day pressed without one. An
 * empty note on a gift order is indistinguishable from a self-purchase, because
 * `placeOneReading` drops an empty question from the line rather than sending a
 * blank one, so the order would carry no trace of the gift at all and the
 * reading would go quietly to the buyer. Every blank combination therefore
 * still answers, and says which part is missing.
 *
 * ## Two limits it lives inside, neither of them checked here
 *
 * The backend refuses a line's `question` over 2000 characters, and this stays
 * under it **by construction**: `CountedField` sets `maxLength`, so the address
 * is capped at 254, the signature at 50 and the message at `questionLimit`,
 * which is 500 — a little over 850 at the very worst, prose included. The
 * confirmation is not in that sum and never travels: it is a check on what the
 * buyer typed, not a second thing they told us.
 *
 * It also refuses a `question` on any product whose `allows_question` is false.
 * That is safe because gift mode is drawn on reading pages alone and the
 * backend's `ProductKey::allowsQuestion` is true for every `Reading` — but it
 * is a dependency rather than a coincidence, and a giftable product that
 * allowed no question would 422 on **every** gift order rather than only on the
 * ones somebody typed into.
 */
export function giftNote({
  recipient,
  message,
  signature,
}: {
  recipient: string;
  message: string;
  signature: string;
}): string {
  // Trimmed for the reason the question is: whitespace on an order line comes
  // back out in the admin table and in the email that is sent from it.
  const to = recipient.trim();
  const said = message.trim();
  const signed = signature.trim();

  /*
    The **gift signature** goes in front of the address rather than after it,
    which is the same rule as the full stop below: whatever ends this clause is
    a character somebody copying the address out of a table cell takes with
    them, and a comma is no better than a period for that.

    It is required on the form from 3 September 2026 (#71) and still composed
    here as though it might be missing, for the reason the recipient is — this
    function is a guard rather than a guarantee, and a required attribute that
    nothing submits is enforced by `orderFormAccepts` alone.
  */
  const opening = signed ? `Gift from ${signed}` : "Gift";

  // No full stop after the address, and one after the sentence that has no
  // address in it. A period hard against an email is a character somebody
  // copying the address out of a table cell takes with them.
  const line = to
    ? `${opening} — send this reading to ${to}`
    : `${opening} — the buyer gave no recipient address.`;

  // Absent rather than labelled empty. The message is the one field on either
  // section whose label says "optional", so a dangling "The buyer's message:"
  // would be the ordinary case reading like a fault.
  return said ? `${line}\n\nThe buyer's message: ${said}` : line;
}

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
function fieldIn(form: ParentNode, name: string): (HTMLInputElement | HTMLTextAreaElement) | null {
  return form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-field="${name}"]`);
}

/** What one field holds, answering `""` for a field this section has not mounted. */
function textIn(form: ParentNode, name: string): string {
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
  const confirmation = fieldIn(form, "confirmEmail");

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
 * The line's text and its mode, read off whichever section the form has
 * mounted.
 *
 * An empty `text` where there is no form, no field, or nothing typed — all
 * three mean the same thing to an order, whose `question` is optional on every
 * product. **A gift is the one case that never answers empty**; see `giftNote`.
 */
export function orderNoteIn(node: Element | null | undefined): OrderNote {
  const form = node?.closest("form");

  // Not a gift, rather than unknown. There is one flag and it decides whether a
  // cancelled checkout refills a textarea, so the case where nothing could be
  // read has to land on the answer that puts nothing anywhere.
  if (!form) return { text: "", gift: false };

  /*
    Presence, not truthiness. A field that is not in the form at all and one
    that is there and empty are the two states this has to tell apart, because
    an empty recipient in gift mode is still a gift and must still be marked as
    one — which is why the element is looked for rather than its value read.
  */
  if (fieldIn(form, "recipientEmail") === null) {
    return { text: textIn(form, "question"), gift: false };
  }

  return {
    text: giftNote({
      recipient: textIn(form, "recipientEmail"),
      message: textIn(form, "giftMessage"),
      signature: textIn(form, "giftSignature"),
    }),
    gift: true,
  };
}
