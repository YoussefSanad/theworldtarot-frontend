/**
 * Which of the four states a visitor to the Viewing Room is in, and what that
 * means for the room behind the panel.
 *
 * A seam of its own rather than a corner of the component, because the mapping
 * is the one piece of this page that is pure, is the thing most likely to be
 * got subtly wrong, and is testable without a DOM. Everything else on the page
 * is layout.
 */

import type { Customer } from "./session.ts";

/**
 * The four, and `asking` is not a fifth wheel.
 *
 * The room renders immediately — the deck is public — under a veil while
 * `/me` answers. **A member who sees a frame of the paywall has been told they
 * did not buy something they did buy**, which is the one failure this page
 * cannot afford, so "we do not know yet" is a state with its own treatment
 * rather than an absence folded into "signed out".
 */
export type AccessState = "asking" | "signed-out" | "no-pass" | "member";

/**
 * Reads `useSignedIn`'s snapshot as one of the four.
 *
 * **A broken API arrives here as `signed-out`**, not as a permanent `asking`:
 * `useSignedIn` publishes `null` when the read throws, deliberately and with
 * its own argument for why. That is the right answer here too — a visitor
 * whose network died can act on a sign-in prompt and cannot act on a spinner.
 */
export function accessStateOf(customer: Customer | null | undefined): AccessState {
  if (customer === undefined) return "asking";
  if (customer === null) return "signed-out";

  return customer.hasViewingRoomAccess ? "member" : "no-pass";
}

/**
 * Whether the room behind the panel is unusable.
 *
 * **Presentation, and never the gate.** With the attribute removed in dev
 * tools the video endpoint still refuses, because access is decided there on
 * every call and nowhere else. This exists so a screen reader does not read
 * out a room the visitor cannot use, and so a tab key does not wander into it.
 *
 * `asking` is false on purpose. The veil is already over the room, and making
 * it inert as well would only have to be undone a moment later — for a member,
 * before they ever saw it.
 */
export function roomIsInert(state: AccessState): boolean {
  return state === "signed-out" || state === "no-pass";
}
