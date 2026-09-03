/**
 * A stand-in for `POST /api/v1/newsletter` in `next dev`, so the footer form's
 * sent and error states can actually be looked at.
 *
 * **Development only.** `subscribeToNewsletter()` reaches this behind a
 * `process.env.NODE_ENV === "development"` guard and a dynamic import, so none
 * of it is in a deployed bundle. Deleting this file and that block is the whole
 * removal.
 *
 * There are two reasons it exists and either would be enough on its own. The
 * list is the one Jennifer mails and both deployed environments share it, so a
 * real submission from a developer's machine is a real contact. And a write
 * from `next dev` cannot succeed anyway: the cookie handshake in `api-write.ts`
 * needs the browser to be on a same-site origin, which localhost is not — see
 * the note in `.env.local`. Without this the form's only reachable state here
 * would be the failure one.
 *
 * The first attempt in a tab succeeds; every attempt after it fails. Both
 * halves are reachable because the flag is in sessionStorage rather than in a
 * module variable: a success locks the form, so the only way to submit again is
 * a reload, and a module variable would reset on exactly that reload and hand
 * out a second success forever.
 *
 * Read and written directly rather than through `createSessionValue`, which
 * exists to back a `useSyncExternalStore` and whose `subscribe` nothing here
 * would ever call.
 *
 *     fresh tab  → submit → sent
 *     reload     → submit → error
 *     reload     → submit → error
 *     new tab    → submit → sent
 */
const ATTEMPTED = "wt.newsletter.attempted";

/** Long enough for the button's sending label to be legible. */
const LATENCY_MS = 900;

export async function simulateSignup(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  if (sessionStorage.getItem(ATTEMPTED)) {
    throw new Error("Simulated newsletter failure. Open a new tab for another success.");
  }

  sessionStorage.setItem(ATTEMPTED, "1");
}
