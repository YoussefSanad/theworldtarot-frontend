/**
 * The two password writes: claiming an account, and resetting a forgotten
 * password.
 *
 * Both go through `api-write.ts`, so the CSRF handshake is not restated here.
 * Neither takes a locale segment. They are two endpoints rather than one with a
 * flag because the backend asks a different question of each: a claim only
 * works on an account that has never had a password, and says so by refusing.
 *
 * `token` and `email` come from the link's query string and go back unchanged.
 * A token alone identifies nobody, so a link missing either half is already
 * dead and this module never sends one.
 */

import { ApiRateLimitError, ApiValidationError, apiWrite } from "./api-write.ts";

export type PasswordSubmission = {
  /** Straight from the link. Single use, and valid for sixty minutes. */
  token: string;
  email: string;
  password: string;
  /** Sent as `password_confirmation`. The backend refuses a mismatch itself. */
  passwordConfirmation: string;
};

function requestBody(submission: PasswordSubmission) {
  return {
    token: submission.token,
    email: submission.email,
    password: submission.password,
    password_confirmation: submission.passwordConfirmation,
  };
}

/**
 * Claims the account made for somebody when they bought something.
 *
 * Nothing is returned. The backend sends a message on success and it is not
 * rendered: the words a person reads here belong to the page, which knows
 * whether it just set a first password or replaced an old one.
 *
 * **Named for the act rather than for the endpoint it posts to**, unlike its
 * neighbour below. `setPassword` was the obvious name and it collided with the
 * setter half of a `useState` in the one component that calls this, where the
 * import and the setter shadowed each other and the file worked only because
 * `FLOW` captured the import at module scope. It is also the name both sides
 * already use for this act: `ClaimAccount` in the backend, "claim link" in
 * `CONTEXT.md`, and the `claim` arm of `PasswordFlow`.
 */
export async function claimAccount(submission: PasswordSubmission): Promise<void> {
  await apiWrite<{ message: string }>("/api/v1/set-password", requestBody(submission));
}

/** Chooses a new password for an account that already had one. */
export async function resetPassword(submission: PasswordSubmission): Promise<void> {
  await apiWrite<{ message: string }>("/api/v1/reset-password", requestBody(submission));
}

/**
 * Why a password write was refused, in the only four shapes a page needs.
 *
 * The interesting arm is `link`. **A used token, an expired one, a malformed
 * one and an account that has already been claimed are one outcome here**, and
 * deliberately: each of those is a 422 keyed to `email`, each carries a
 * backend message naming which, and rendering that message would turn this page
 * into a way to ask whether an address has an account and whether it has been
 * claimed. The page supplies its own wording for this arm.
 */
export type PasswordFailure =
  /**
   * The password itself was refused. Keyed by field name exactly as the backend
   * sent it — `password`, `password_confirmation` — so a rule failure lands
   * against the field it names rather than in a summary above the form.
   */
  | { kind: "fields"; errors: Record<string, string[]> }
  /** The link is no longer valid. Which of the reasons applies is not said. */
  | { kind: "link" }
  | { kind: "rate-limited"; retryAfterSeconds: number | undefined }
  /** A 500, an offline browser, a 419 that survived the seam's one retry. */
  | { kind: "unknown" };

/** Field errors that are about the password rather than about the link. */
function passwordErrors(errors: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(errors).filter(([field]) => field.startsWith("password")),
  );
}

/**
 * Reads a thrown seam error as one of the four outcomes.
 *
 * A 422 is the only ambiguous status, and the split is by key rather than by
 * message: the request is validated before the token is looked at, so a
 * `password` key means the password broke a rule and the link is still fine.
 * Anything else keyed in a 422 arrived from the token check and is a dead link.
 */
export function readPasswordFailure(cause: unknown): PasswordFailure {
  if (cause instanceof ApiRateLimitError) {
    return { kind: "rate-limited", retryAfterSeconds: cause.retryAfterSeconds };
  }

  if (cause instanceof ApiValidationError) {
    const errors = passwordErrors(cause.errors);

    return Object.keys(errors).length > 0 ? { kind: "fields", errors } : { kind: "link" };
  }

  return { kind: "unknown" };
}
