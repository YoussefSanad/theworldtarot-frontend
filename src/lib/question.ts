/**
 * What the customer typed, read out of the form a control sits in.
 *
 * Shared by the panel's two payment controls, which is the whole reason it is
 * not a private function in either of them. **The question has to reach the
 * order line identically on both roads** — a wallet payment that dropped it
 * would deliver a reading nobody asked a question of, and the customer would
 * have no way of knowing until it arrived.
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
 *
 * An empty string when there is no form, no field, or nothing typed — all three
 * mean the same thing to an order, whose `question` is optional on every
 * product. In gift mode there is no `question` field in the DOM at all, since
 * the sections are mutually exclusive, and an empty string is the correct
 * answer for a form that has no question in it.
 */
export function questionIn(node: Element | null | undefined): string {
  const form = node?.closest("form");

  if (!form) return "";

  const typed = new FormData(form).get("question");

  return typeof typed === "string" ? typed : "";
}
