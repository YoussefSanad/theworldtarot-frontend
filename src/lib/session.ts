/**
 * Who the browser is talking to the API as: signing in, signing out, asking for
 * a reset link, and reading back the customer the session belongs to.
 *
 * A third seam beside `api.ts` and `api-write.ts` rather than a corner of
 * either, because a session is neither content nor a purchase and every rule
 * below is about the session rather than about the endpoint that carries it.
 *
 * **None of these take a locale segment.** An account is the same account in
 * every language, so it is `/api/v1/login`, never `/api/v1/en/login`.
 *
 * **Nothing here may be cached, stored or persisted** — no `localStorage`, no
 * service worker, no store written to disk. `/me` answers `Cache-Control:
 * no-store` and it is different for every caller: anything holding it hands one
 * customer's name and address to the next visitor.
 */

import { apiBaseUrl, apiWrite, apiWriteEmpty } from "./api-write.ts";
import { type PasswordFailure, readPasswordFailure } from "./passwords.ts";

/**
 * A signed-in customer, as far as this website has any use for one.
 *
 * `created_at` is on the wire and is not here: nothing on the site shows it,
 * and the shape is small enough that adding it back when something does costs
 * one line.
 */
export type Customer = {
  id: number;
  name: string;
  email: string;
  /**
   * Whether they hold a pass into the Viewing Room. **A hint for the UI and
   * never the enforcement** — the film endpoint decides again on every call,
   * and a `true` here against a 403 there means the 403 is the truth.
   *
   * Read today and acted on nowhere, because there is no Viewing Room to point
   * at yet. It is carried rather than dropped so the page that grows one is not
   * also a change to this seam.
   */
  hasViewingRoomAccess: boolean;
};

/** The wire shape, which is snake_case and carries a field we do not keep. */
type ApiCustomer = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  has_viewing_room_access: boolean;
};

function toCustomer(customer: ApiCustomer): Customer {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    hasViewingRoomAccess: customer.has_viewing_room_access,
  };
}

/**
 * Signs a customer in on the cookie flow, and answers with who they are.
 *
 * **`device_name` is deliberately not sent, and must never be.** That single
 * field is the whole of the choice between the two authentication styles:
 * sending it hands back a bearer token and no session cookie, so the sign in
 * would look like it worked and the next page load would be a stranger. The
 * website is the cookie flow; the token flow is for native apps that do not
 * exist yet.
 */
export async function signIn(credentials: {
  email: string;
  password: string;
}): Promise<Customer> {
  return toCustomer(
    await apiWrite<ApiCustomer>("/api/v1/login", {
      email: credentials.email,
      password: credentials.password,
    }),
  );
}

/**
 * Ends the session. Answers 204 and nothing else, which is why it goes through
 * the seam's empty write.
 *
 * **Signing out rotates the CSRF token**, so the next write needs a fresh
 * handshake. That is already free: `apiWrite` fetches `/sanctum/csrf-cookie`
 * before every write, so there is no second handshake to add here.
 */
export async function signOut(): Promise<void> {
  await apiWriteEmpty("/api/v1/logout");
}

/**
 * Asks for a reset link to be sent.
 *
 * **It always answers 200 with the same body, whatever happened** — a known
 * address, an unknown one, and one asking again too soon are identical on the
 * wire, on purpose, since anything else would make this a way to ask whether
 * somebody has an account here. Nothing is returned for the same reason: there
 * is no per-address outcome for a caller to render, and the page's own wording
 * must never say a message was sent, because sometimes none was.
 *
 * Refusals it can still raise are about us rather than about the address: a 429
 * for too many asks, or a broken API.
 */
export async function requestPasswordLink(email: string): Promise<void> {
  await apiWrite<{ message: string }>("/api/v1/forgot-password", { email });
}

/**
 * Whoever the session cookie belongs to, or null for a visitor.
 *
 * A credentialed **read**, which is why it is here and not in `api.ts`: it
 * needs `credentials: "include"` the way a write does, and it must not be
 * cached the way the draw must not be.
 *
 * **A 401 is the normal answer for a visitor.** It is not logged, not surfaced
 * and not thrown — most people who load the homepage are not signed in, and an
 * error for each of them fills a console with the ordinary case. Anything else
 * still throws, so an API that is genuinely broken stays distinguishable from
 * a browser that simply has no session.
 */
export async function currentCustomer(
  { signal }: { signal?: AbortSignal } = {},
): Promise<Customer | null> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/me`, {
    credentials: "include",
    // The server says no-store and this says it again. The two failure modes
    // differ: a cache between us serves one customer's identity to the next.
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });

  if (response.status === 401) return null;

  if (!response.ok) {
    throw new Error(`Reading the signed-in customer failed with ${response.status}.`);
  }

  return toCustomer((await response.json()) as ApiCustomer);
}

/**
 * Why a sign in was refused, in the four shapes the page needs.
 *
 * The arm that matters is `refused`. **A wrong password, an address with no
 * account, and an account made by a purchase whose owner has never set a
 * password are one outcome here** — the backend answers all three with the same
 * status and the same message on the `email` field, says it will not change,
 * and telling them apart is exactly what a form must not offer. The page
 * supplies one wording that leaves every door open.
 */
export type SignInFailure =
  /** A password rule, keyed by the field the backend named. */
  | { kind: "fields"; errors: Record<string, string[]> }
  /** Those details do not sign anybody in. Which of the reasons is not said. */
  | { kind: "refused" }
  /** Five failures on one address, and the wait comes with it. Not a 422. */
  | { kind: "rate-limited"; retryAfterSeconds: number | undefined }
  | { kind: "unknown" };

/**
 * Reads a thrown seam error as one of those four.
 *
 * The 422 split is `readPasswordFailure`'s, unchanged and deliberately reused:
 * the same rule — a `password` key is about the password, anything else in a
 * 422 is the vague refusal — is right on both forms, and one implementation
 * cannot drift from the other. Only the name of that arm differs, because a
 * dead link and a refused sign in read as nothing alike to a person.
 *
 * An `email` key here is therefore always the refusal, including the ordinary
 * "the email field is required". That is a fair reading rather than a
 * limitation: both fields are `required` in the form, so an empty one is a
 * browser's own message long before it is the backend's.
 */
export function readSignInFailure(cause: unknown): SignInFailure {
  const failure: PasswordFailure = readPasswordFailure(cause);

  return failure.kind === "link" ? { kind: "refused" } : failure;
}
