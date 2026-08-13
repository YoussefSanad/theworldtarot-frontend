import { createSessionValue } from "@/lib/session-value";

/**
 * A stand-in for `POST /subscribe` while that route does not exist, so the
 * invitation form's success state can actually be looked at.
 *
 * **Development only.** `requestInvitation()` reaches this behind a
 * `process.env.NODE_ENV !== "production"` guard and a dynamic import, so none of
 * it is in a production bundle. Deleting this file and that guard is the whole
 * removal.
 *
 * The first attempt in a tab succeeds; every attempt after it fails. Both halves
 * are reachable because the counter is in sessionStorage rather than in a module
 * variable: a success locks the form, so the only way to submit again is a
 * reload, and a module variable would reset on exactly that reload and hand out
 * a second success forever.
 *
 *     fresh tab  → submit → success
 *     reload     → submit → failure
 *     reload     → submit → failure
 *     new tab    → submit → success
 */
const attempted = createSessionValue("wt.invitation.attempted");

/** Long enough for the loader beside the button to be legible. */
const LATENCY_MS = 900;

export async function simulateInvitation(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  if (attempted.get()) {
    throw new Error("Simulated invitation failure. Open a new tab for another success.");
  }

  attempted.set("1");
}
