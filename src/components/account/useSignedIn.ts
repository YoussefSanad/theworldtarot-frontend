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

export function useSignedIn(): {
  customer: Snapshot;
  setCustomer: (customer: Customer | null) => void;
} {
  const customer = useSyncExternalStore(subscribe, read, readOnServer);

  useEffect(ask, []);

  return { customer, setCustomer: publish };
}
