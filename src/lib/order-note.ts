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
 * `FormData` the values come out of. Threading `gifting` down to both controls
 * would have put the same branch in two components — which is exactly the drift
 * this module exists to prevent.
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
 * recipient a column and a code of their own — and it is written as prose
 * because prose is what survives being read out of a table cell by somebody
 * deciding what to send and where.
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
 * is capped at 254 and the message at `questionLimit`, which is 500 — 805 at
 * the very worst, prefix included.
 *
 * It also refuses a `question` on any product whose `allows_question` is false.
 * That is safe because gift mode is drawn on reading pages alone and the
 * backend's `ProductKey::allowsQuestion` is true for every `Reading` — but it
 * is a dependency rather than a coincidence, and a giftable product that
 * allowed no question would 422 on **every** gift order rather than only on the
 * ones somebody typed into.
 */
export function giftNote({ recipient, message }: { recipient: string; message: string }): string {
  // Trimmed for the reason the question is: whitespace on an order line comes
  // back out in the admin table and in the email that is sent from it.
  const to = recipient.trim();
  const said = message.trim();

  // No full stop after the address, and one after the sentence that has no
  // address in it. A period hard against an email is a character somebody
  // copying the address out of a table cell takes with them.
  const line = to
    ? `Gift — send this reading to ${to}`
    : "Gift — the buyer gave no recipient address.";

  // Absent rather than labelled empty. The message is the one field on either
  // section whose label says "optional", so a dangling "The buyer's message:"
  // would be the ordinary case reading like a fault.
  return said ? `${line}\n\nThe buyer's message: ${said}` : line;
}

/** Reads one named field, answering `""` for a field that is absent or a file. */
function textIn(fields: FormData, name: string): string {
  const value = fields.get(name);

  return typeof value === "string" ? value : "";
}

/**
 * Whether the order form will accept what is in it — and where it will not,
 * says so on the offending field.
 *
 * **The panel has one required field and no submit button**, which is the whole
 * reason this exists. `RecipientDetails` marks the recipient's address
 * `required` and `type="email"`, and both of those are enforced by the browser
 * at submit time; nothing here ever submits. So until 30 August 2026 the
 * attribute was decoration, and it stopped being harmless the moment gift mode
 * could take money: a buyer could toggle to gift, press a wallet button,
 * authorise with their face, and be charged for a gift addressed to nobody.
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

  return form ? form.reportValidity() : true;
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

  const fields = new FormData(form);

  /*
    Presence, not truthiness. `FormData.get` answers `null` for a field that is
    not in the form and `""` for one that is there and empty — and those are the
    two states this has to tell apart, because an empty recipient in gift mode
    is still a gift and must still be marked as one.
  */
  if (fields.get("recipientEmail") === null) {
    return { text: textIn(fields, "question"), gift: false };
  }

  return {
    text: giftNote({
      recipient: textIn(fields, "recipientEmail"),
      message: textIn(fields, "giftMessage"),
    }),
    gift: true,
  };
}
