/**
 * **Entering after payment**: a first-time Viewing Room pass buyer, signed in
 * by having paid, and taken straight into the room from the confirmation. #185,
 * against backend `YoussefSanad/TheWorldTarot#128`, decided in backend #126 on
 * 14 November 2026.
 *
 * It replaces #170's SET YOUR PASSWORD button, and `lib/claim-link.ts` with it.
 * ~~The receipt still carries the set-password link for later visits~~; this
 * page no longer shows it. **Struck 24 November 2026** (#192, backend #135): a
 * separate welcome email carries the link now, and every pass buyer, an
 * existing account included, is entered after paying.
 *
 * `API_CONTRACT.md` ("POST /api/v1/orders/enter", under "Orders") is the
 * authority. The backend decides who may enter, on every request: a paid pass
 * order, ~~an account that payment made~~ (any customer since backend #135),
 * fifteen minutes from settlement, once.
 * **Nothing here decides any of that**, and nothing here could: this module only
 * asks, and reads the answer as one of three things the screen can do.
 *
 * ## The pay token goes in the body and nowhere else
 *
 * It is the whole authority to enter, so it travels as `/orders/status` and
 * `/orders/pay` carry it: in a POST body, through `api-write.ts`, with the
 * cookie credentials and the CSRF header `/login` uses. Never in a path or a
 * query, which land in every access log between here and the backend.
 *
 * ## Why every refusal reads the same
 *
 * 403, 404, 429, a 422, a 500 or no network at all end in one place, "sign in to
 * enter", because the buyer can act on that and on nothing finer. The backend
 * answers one message for every refusal on purpose: telling them apart would
 * tell whoever holds a pay token whether the address typed at Stripe already
 * has an account here.
 */

import { ApiError, apiWriteSettled } from "./api-write.ts";
import { type Customer, currentCustomer, signedInCustomerIn } from "./session.ts";

/**
 * How long to wait before each further ask while the answer is 409, in
 * milliseconds: doubling from one second, thirty seconds in all.
 *
 * **#170's schedule, kept** (it was `CLAIM_LINK_RETRY_DELAYS_MS` in
 * `lib/claim-link.ts`, removed with that file). It answers the same question: a
 * card road reaches the confirmation before the webhook has settled the order,
 * and the webhook usually lands within a few seconds. Past thirty, a 409 is
 * read as a 403, as #185 asks.
 */
export const ENTRY_RETRY_DELAYS_MS: readonly number[] = [1000, 2000, 4000, 8000, 15000];

/** What asking came to, as the screen needs it. */
export type Entry =
  /** Somebody was already signed in, so nothing was asked. */
  | { outcome: "already-in" }
  /** The backend signed the buyer in. The masthead needs this customer. */
  | { outcome: "entered"; customer: Customer }
  /** It never will: a refusal, or 409s for thirty seconds, or no answer at all. */
  | { outcome: "sign-in" };

/** What the pass screen offers where its gold button goes. */
export type PassDoor =
  /** No button yet: neither the room nor the sign in is true until the answer. */
  | "taking-you-in"
  /** ENTER THE VIEWING ROOM, as before #170. */
  | "enter"
  /** SIGN IN TO ENTER, to `/login/?next=/viewing-room/`. */
  | "sign-in";

const PATH = "/api/v1/orders/enter";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Asks the backend to sign the buyer in, following a 409 until it is not one.
 *
 * `signedIn` is the masthead's customer, once `/me` has answered. **Anybody
 * signed in means no call at all**, #185's first branch and the contract's own
 * advice: the order's own customer would get a 200 that spends nothing, and
 * anybody else a 404, so asking could only lose.
 *
 * `stillWanted` is the screen's "have I gone" flag. It is checked before every
 * ask, and an abandoned follow answers `null` so nothing is set on a screen
 * that is no longer there.
 */
export async function enterAfterPayment(
  payToken: string,
  {
    signedIn,
    wait = sleep,
    stillWanted = () => true,
  }: { signedIn: Customer | null; wait?: (ms: number) => Promise<void>; stillWanted?: () => boolean },
): Promise<Entry | null> {
  if (signedIn !== null) return { outcome: "already-in" };

  for (const delay of [...ENTRY_RETRY_DELAYS_MS, null]) {
    if (!stillWanted()) return null;

    let body: unknown;

    try {
      body = await apiWriteSettled(PATH, { pay_token: payToken });
    } catch (cause: unknown) {
      // Only a 409 is worth asking again: the order is not settled yet.
      if (!(cause instanceof ApiError && cause.status === 409) || delay === null) return { outcome: "sign-in" };

      await wait(delay);
      continue;
    }

    return entered(body);
  }

  // Unreachable: the last turn of the loop returns on every path.
  return { outcome: "sign-in" };
}

/**
 * A 200 is a session, whatever its body. Login's body is the customer, and is
 * read field by field; a body that is not one (a proxy that ate it, say) is
 * not a reason to deny a session that exists, so `/me` is asked who it is.
 * Only `/me` answering nobody, or failing, makes it "sign in to enter".
 */
async function entered(body: unknown): Promise<Entry> {
  const customer = signedInCustomerIn(body) ?? (await currentCustomer().catch(() => null));

  return customer ? { outcome: "entered", customer } : { outcome: "sign-in" };
}

/**
 * Which door the pass screen shows. **"Taking you in" until there is an
 * answer**, #185's sixth branch: ENTER THE VIEWING ROOM before the answer would
 * open the paywall to a buyer about to be signed in, and SIGN IN TO ENTER would
 * ask for a password they do not have yet. `entered` stays on it too, because
 * the screen is already navigating to the room.
 */
export function passDoorFor(entry: Entry | "waiting" | null): PassDoor {
  if (entry === null || entry === "waiting" || entry.outcome === "entered") return "taking-you-in";

  return entry.outcome === "already-in" ? "enter" : "sign-in";
}
