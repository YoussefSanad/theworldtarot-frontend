/**
 * What a PaymentIntent's status means to the person looking at the screen.
 *
 * Stripe has seven statuses and a customer has three questions: did my money
 * go, do I have to do something, or has nothing happened yet. This maps the one
 * onto the other, and it is the *only* place a Stripe status string is read —
 * the confirmation renders an outcome, so a status this build has never heard
 * of cannot reach the copy.
 *
 * **None of these say anything about a reading.** Only the backend **settles**
 * an order, on a verified webhook, and that has very likely not happened yet
 * when this renders. See `CONTEXT.md` on Confirmation.
 */

/**
 * The four things the screen can be looking at.
 *
 * - `received` — the money is taken. `succeeded`.
 * - `pending` — taken but not yet confirmed by the network; some methods are
 *   genuinely asynchronous and can take days. `processing`.
 * - `unpaid` — nothing was collected and the customer can try again.
 *   `requires_payment_method` (the declined card and the abandoned sheet) and
 *   `canceled`.
 * - `unfinished` — the payment is mid-flight and the page cannot say more,
 *   which is a state a confirmation screen should not normally be looking at.
 *   `requires_action`, `requires_confirmation`, `requires_capture`, and
 *   anything Stripe adds later.
 */
export type PaymentOutcome = "received" | "pending" | "unpaid" | "unfinished";

const OUTCOME: Record<string, PaymentOutcome> = {
  succeeded: "received",
  processing: "pending",
  requires_payment_method: "unpaid",
  /*
    Grouped with the decline rather than given words of its own. A customer
    whose intent was cancelled and one whose card was refused are in the same
    position — no money moved, the order is still pending, buy it again — and a
    screen that distinguishes them is explaining Stripe's state machine to
    somebody who wants to know whether they have been charged.
  */
  canceled: "unpaid",
  /*
    Stripe's other three, spelled out rather than left to the default. They map
    where the default already put them, so `outcomeFor` is unchanged by their
    presence — what changes is that `isRecognisedStatus` can now answer for the
    whole of the contract's list, and only a status Stripe adds *later* reads as
    one this build has never heard of.
  */
  requires_action: "unfinished",
  requires_confirmation: "unfinished",
  requires_capture: "unfinished",
};

/**
 * Whether this build has heard of a status at all.
 *
 * Added for the confirmation screen, which starts at `received` on the card
 * road and asks the backend only to be corrected. **A status we do not
 * recognise is not a correction** — the contract's own advice for one is "we do
 * not know yet" — so it has to be told apart from the six below rather than
 * arriving as `unfinished` and replacing a true screen with a hedge.
 *
 * It reads the same table `outcomeFor` does, which is what keeps this file the
 * only place a Stripe status string is named.
 */
export function isRecognisedStatus(status: string): boolean {
  return status in OUTCOME;
}

/**
 * Maps a status to an outcome, defaulting to `unfinished`.
 *
 * The default is the reason this is a lookup and not a `switch` with a throw.
 * A status we do not recognise is a customer whose payment is probably fine,
 * and refusing to render for them would be the page failing at the one job it
 * has.
 */
export function outcomeFor(status: string): PaymentOutcome {
  return OUTCOME[status] ?? "unfinished";
}
