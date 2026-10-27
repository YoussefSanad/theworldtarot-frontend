"use client";

import { useEffect, useSyncExternalStore } from "react";

import { type Customer, currentCustomer } from "@/lib/session";

/**
 * Who is signed in, shared by everything on the page that has to know.
 *
 * A module-scoped store read with `useSyncExternalStore`, in the shape
 * `session-value.ts` already uses for sessionStorage, and for the same reason:
 * two components need one answer, and syncing that answer between them in
 * effects is how they end up disagreeing.
 *
 * There are three readers today and they are not siblings — the masthead's
 * account control is rendered twice, on the desktop row and inside the mobile
 * drawer, and the sign in form has to tell both of them the moment it succeeds,
 * from a page that is about to navigate away. A store outlives the navigation;
 * component state does not, and neither does anything the layout would hold,
 * since `SiteHeader` never unmounts and so would never re-ask.
 *
 * **Nothing is written to storage of any kind.** `/me` answers `no-store`, it
 * is different for every caller, and a `localStorage` copy of it is one
 * customer's name waiting for the next person on a shared machine. This lives
 * in memory for as long as the tab does and is re-read on every load.
 *
 * ## `?signedin=` for review
 *
 * There is no way to sign in on staging without a real account, so there is a
 * switch for looking at the signed-in masthead, drawer and paywall:
 *
 * - `?signedin=1` — a customer with no pass, named by their address, which is
 *   the ordinary case for somebody whose account a purchase created
 * - `?signedin=member` — the same customer holding a Viewing Room pass
 *
 * Development always, staging when the API base says so, never production.
 * `sessionOverrideAllowed` has the gate and the reasoning; it is presentation
 * only and grants no access to anything, because every endpoint still decides
 * for itself.
 */

/** `undefined` until `/me` has answered, which is not the same as nobody being signed in. */
type Snapshot = Customer | null | undefined;

/**
 * How long `/me` gets before we answer for it.
 *
 * **A rejection was already handled; a request that never settles was not.**
 * Those are different failures: a refused connection rejects at once, but a
 * captive portal, a half-open socket, or an API that accepts and then stalls
 * leaves the promise pending forever — and `undefined` means "still asking",
 * so every reader waits with it. The masthead sits on a blank account control,
 * and the Viewing Room sits behind its veil with no modal to act on, neither
 * of which recovers.
 *
 * Eight seconds is long enough for a slow phone on a bad connection and short
 * enough that nobody reads it as broken. Timing out answers `null`, which is
 * the same answer a thrown read already gives, and for the same reason: a
 * visitor can act on "sign in" and cannot act on a spinner.
 */
const ANSWER_DEADLINE_MS = 8_000;

let snapshot: Snapshot;
let asked = false;
let asking: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: Snapshot): void {
  snapshot = next;
  asked = true;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function read(): Snapshot {
  return snapshot;
}

/**
 * The static export renders every page as HTML at build time, where nobody is
 * signed in. Hydration therefore has to start at "not known yet" or the first
 * client paint disagrees with the markup it is adopting.
 */
function readOnServer(): Snapshot {
  return undefined;
}

/**
 * Asks once per page load, and only once however many components ask for it.
 *
 * Not aborted on unmount. The guard is the in-flight promise rather than a
 * signal, because React's development double-mount would otherwise cancel the
 * request the first mount started and the second one would skip asking again —
 * a header stuck on "Sign in" in development and correct in production, which
 * is the worst place for a difference to live.
 */
function ask(): void {
  if (asked || asking) return;

  asking = currentCustomer({ signal: AbortSignal.timeout(ANSWER_DEADLINE_MS) })
    .then(
      // A sign in or sign out may have published while this read was in flight.
      (customer) => { if (!asked) publish(customer); },
      // A 401 already answered `null` rather than throwing, so this is a broken
      // API or a browser with no network. Both are answered the same way and
      // neither is worth a red line in the console of somebody who was only
      // reading the homepage: the masthead cannot act on the difference between
      // "signed out" and "we could not tell", and offering to sign in is the
      // right thing to draw in both.
      () => { if (!asked) publish(null); },
    )
    .finally(() => {
      asking = null;
    });
}

/**
 * A stand-in customer for `?signedin=1`, and for `?signedin=member` with the
 * pass. Never reachable in production; see `sessionOverrideAllowed`.
 *
 * The name is absent on purpose in the plain case, because that is the ordinary
 * one: a buyer whose account checkout made for them has never been asked their
 * name, so `customerLabel` falls back to their address. Reviewing the masthead
 * with "Jane Doe" in it would hide the layout question that actually matters —
 * an address is much longer than a name.
 */
const PRETEND_CUSTOMER: Customer = {
  id: 1,
  name: null,
  email: "jennifer@example.com",
  hasViewingRoomAccess: false,
};

/**
 * Whether `?signedin=` may stand in for what `/me` said.
 *
 * **Development always, and staging when the deploy asks for it**, which is the
 * gate `ViewingRoom`'s `?state=` switch already uses and for its reason: there
 * is no way to buy the pass yet, so without this nobody can look at the
 * signed-in masthead on staging — which is the thing being approved.
 *
 * Derived from `NEXT_PUBLIC_API_BASE_URL` rather than a flag of its own because
 * that variable is already set in every environment and is already what tells
 * the builds apart. On production this is false.
 *
 * **Presentation only.** It publishes a customer into this tab's store and
 * nothing else — no cookie, no session. Every endpoint still decides for
 * itself, so this cannot read anybody's readings or play a film.
 */
function sessionOverrideAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;

  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").includes("staging-api.theworldtarot.com");
}

/** The pretend customer `?signedin=` asks for, or null for no override. */
function readSessionOverride(): Customer | null {
  if (!sessionOverrideAllowed()) return null;

  const value = new URLSearchParams(window.location.search).get("signedin");

  if (value === null || value === "0" || value === "false") return null;

  return value === "member"
    ? { ...PRETEND_CUSTOMER, hasViewingRoomAccess: true }
    : PRETEND_CUSTOMER;
}

export function useSignedIn(): {
  customer: Snapshot;
  setCustomer: (customer: Customer | null) => void;
} {
  const customer = useSyncExternalStore(subscribe, read, readOnServer);

  /*
    Read after mount, never during render. This is a static export: the HTML is
    built on a machine with no URL, so a render that read `window.location`
    would produce different markup than the one it is adopting. `ViewingRoom`'s
    own `?state=` switch goes to the same trouble for the same reason.

    It publishes rather than short-circuiting the return, so every reader of the
    store agrees — the masthead, the drawer and the paywall are all looking at
    one answer, which is the whole point of the store.
  */
  useEffect(() => {
    const pretend = readSessionOverride();

    if (pretend) {
      publish(pretend);
      return;
    }

    ask();
  }, []);

  return { customer, setCustomer: publish };
}
