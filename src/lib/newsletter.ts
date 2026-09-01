/**
 * Joining the mailing list, from the footer's STAY CONNECTED form.
 *
 * The endpoint is `POST /api/v1/newsletter`, and the invitation form on the
 * `origin/coming-soon-page` branch has posted to the same one since 15 August
 * 2026 — that branch is what issue #20 means by "the integration used in the
 * coming soon branch", and it is where the named files below live. Two things
 * about its shape are worth having written down here rather than looked up:
 *
 * - **Flat, with no locale segment.** Content routes carry one,
 *   `/api/v1/es/products`, and a mailing list is not content: the same address
 *   joins the same list whatever language the page was in
 * - **202, not 201.** The address is handed to a queue and answered before the
 *   list has been touched, so *accepted* is the strongest thing the endpoint
 *   can honestly claim. A signup Mailchimp later refuses is invisible from
 *   here, which is the backend's documented trade — see the note on `success`
 *   in `content/site.ts` for what that means for the words on the page
 *
 * **There is no "already subscribed" to render.** A new address, one already on
 * the list, and one the list will refuse later all answer identically, so that
 * a public endpoint cannot be used to ask whether a named person subscribed.
 *
 * Goes through `api-write.ts` like every other POST the browser makes, so the
 * CSRF handshake is not restated here. `origin/coming-soon-page`'s `api.ts`
 * instead calls `fetch` directly, and that is the one place this deliberately
 * parts from it: the backend turns on `statefulApi()` and `config/sanctum.php`
 * puts `ValidateCsrfToken` in the stateful middleware, so a write arriving from
 * a stateful frontend origin is CSRF-validated whether or not the route itself
 * wants a session. The seam is what carries the token. **Untested against a
 * deployed origin** — it is read off the backend's configuration, and it costs
 * one request either way, so this takes the road that works under both answers.
 */

import { ApiRateLimitError, ApiValidationError, apiWrite } from "./api-write.ts";

export type NewsletterSignup = {
  /**
   * Sent as typed. The backend trims and lowercases before validating, so
   * `Jennifer@` and `jennifer@` cannot become two contacts that look identical
   * in the audience.
   */
  email: string;
  /**
   * The FIRST NAME field, which is what this form has and the coming-soon one
   * does not. Optional on both sides.
   */
  name?: string;
};

/**
 * Puts an address on the list.
 *
 * Resolves on acceptance and throws the seam's error on anything else, so a
 * caller's `catch` is the error state. `readNewsletterFailure` is what turns
 * the throw into something the form can say.
 */
export async function subscribeToNewsletter(signup: NewsletterSignup): Promise<void> {
  /*
    `next dev` answers itself rather than reaching the real list.

    **Both deployed environments share one Mailchimp audience** — the one
    Jennifer mails — and the backend's only opt-out is `NEWSLETTER_DRIVER=log`
    on a *local* API, which this app is configured never to point at (see
    `.env.example`). Without this guard, every developer who exercised the
    footer form would be adding rows to the launch-day list.

    Gated on `=== "development"` rather than `origin/coming-soon-page`'s
    `!== "production"`, which is a tightening: `next dev` is the only thing that
    sets it, so an unset NODE_ENV — a test runner, a script — takes the real
    path and can assert on the real request instead of silently simulating.
    Every deployed build, staging included, is `production` either way.

    Dynamically imported so the simulation is provably absent from a deployed
    bundle rather than left to tree-shaking. See `newsletter-sim.ts`; deleting
    that file and this block is the whole removal.
  */
  if (process.env.NODE_ENV === "development") {
    const { simulateSignup } = await import("./newsletter-sim.ts");

    return simulateSignup();
  }

  const name = signup.name?.trim();

  await apiWrite<{ subscribed: boolean }>("/api/v1/newsletter", {
    email: signup.email,

    /*
      Hardcoded true, and honest: the checkbox carries `required`, so the
      browser refuses to fire a submit event without it and this function is
      never reached. The backend validates it again regardless, since a
      checkbox in a browser gates a button and nothing more.
    */
    consent: true,

    /*
      Omitted rather than sent empty. The contract says an absent name may be
      left out entirely, and `""` would land in the audience as a contact whose
      first name is a blank string.
    */
    ...(name ? { name } : {}),
  });
}

/**
 * Why a signup was refused, in the three shapes the form can say something
 * about.
 *
 * No `already-subscribed` arm, and there never can be one: the endpoint
 * answers that case with the same 202 as a new address.
 */
export type NewsletterFailure =
  /** The address itself was refused. The one failure the visitor can act on. */
  | { kind: "address" }
  /*
   * Six a minute. **Counted per caller, not per address** — `throttle:6,1` keys
   * on the request's IP, so this says nothing about how often one email has
   * been offered, and the copy beside it must not either.
   *
   * Carries no `Retry-After`, unlike `SignInFailure`'s arm of the same name.
   * The window is a fixed minute and the sentence says so, so a number the
   * endpoint often omits would be a field nothing could read.
   */
  | { kind: "rate-limited" }
  /** A 500, an offline browser, a 419 that survived the seam's one retry. */
  | { kind: "unknown" };

/**
 * Reads a thrown seam error as one of the three outcomes.
 *
 * A 422 is split by key rather than by message. `consent` is hardcoded true
 * here and `name` is capped at the backend's own 40 in the field, so neither
 * can fail on a submission this form produced — a 422 naming one of those is
 * our bug, and telling somebody their address is wrong would send them editing
 * a field that is already correct.
 */
export function readNewsletterFailure(cause: unknown): NewsletterFailure {
  if (cause instanceof ApiRateLimitError) return { kind: "rate-limited" };

  if (cause instanceof ApiValidationError && cause.errors.email) return { kind: "address" };

  return { kind: "unknown" };
}
