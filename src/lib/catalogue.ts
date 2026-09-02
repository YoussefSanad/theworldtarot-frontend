"use client";

import { useEffect, useSyncExternalStore } from "react";

import { fetchProducts, type ApiProduct } from "./api.ts";
import { currencySelection, rememberResolvedCurrency, useCurrency } from "./currency.ts";
import { currentLocale } from "./locale.ts";

/**
 * Everything on sale, fetched once and read by every surface that prices
 * something.
 *
 * ## Why this is a store and not a hook's own state
 *
 * The readings index prices four things across two components — the signature
 * panel and the three cards under it — and #63 asks for **one** `/products`
 * call between them. Two hooks each holding their own `useState` would make
 * two, and a currency switch would make two more. The homepage's tiles want the
 * same answer again.
 *
 * So the response lives here, in `useSignedIn`'s ask-once shape, and the
 * resolvers over it stay pure: `resolveProducts` joins it onto the homepage's
 * bundled tiles, `resolveReadingPrices` onto the readings index's.
 *
 * **Keyed by the chosen currency**, because that is the only thing that changes
 * what the answer says. A switch re-asks; anything else reads what is already
 * here.
 *
 * ## The two rules about what stays on screen
 *
 * - **A refetch keeps the prices that are already showing.** The snapshot is
 *   replaced when the new answer lands and not when the request starts, so a
 *   switch re-renders a stale price rather than emptying a carousel for the
 *   length of a round trip.
 * - **A failure keeps them too.** An unreachable API leaves the last good
 *   answer in place, and leaves `null` if there has never been one — which is
 *   what puts the bundled copy on screen, as `resolveProducts` explains.
 *
 * Not aborted on unmount, for the reason `useSignedIn` gives: React's
 * development double-mount would cancel the request the first mount started and
 * the second would skip asking again. The guard is the in-flight ask, not a
 * signal.
 */

/** `null` is "no answer yet, or none that ever succeeded" — both show bundled copy. */
let snapshot: ApiProduct[] | null = null;
const listeners = new Set<() => void>();

/**
 * The currency of the most recent ask, and whether it has been answered.
 *
 * `undefined` is "never asked", which is distinct from `null` — the currency of
 * a **cold** ask, made by a visitor who has chosen nothing.
 */
let askedFor: string | null | undefined;
let asking = false;

/**
 * Bumped on every ask, so a slow answer for a currency that has since been
 * switched away from cannot land on top of a newer one. A visitor pressing
 * GBP then EUR while the first request is still open must end on EUR, and the
 * order the answers arrive in is not ours to choose.
 */
let generation = 0;

function publish(next: ApiProduct[]): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function catalogue(): ApiProduct[] | null {
  return snapshot;
}

/**
 * The static export is built with nobody having chosen, so the first client
 * render has to agree with the HTML it is adopting: bundled copy either way.
 */
function catalogueOnServer(): ApiProduct[] | null {
  return null;
}

/**
 * Asks for the catalogue in one currency, and answers when that ask settles.
 *
 * Returns a promise so a test can await it. The hook ignores it — nothing in
 * the app waits on this, because the point is that the page renders bundled
 * copy meanwhile.
 */
export async function askCatalogue(currency: string | null): Promise<void> {
  if (askedFor === currency && (asking || snapshot !== null)) return;

  askedFor = currency;
  asking = true;
  const mine = ++generation;

  try {
    const products = await fetchProducts({
      locale: currentLocale(),
      currency: currency ?? undefined,
    });

    if (mine !== generation) return;

    // Every entry in one response carries the currency that request resolved
    // to, so the first is as good as any. An empty list says nothing about
    // currency and is left alone.
    if (products[0]) rememberResolvedCurrency(products[0].price.currency);

    publish(products);
  } catch (error: unknown) {
    if (mine !== generation) return;

    // Loud here and invisible to the visitor: whatever was on screen stays
    // there, so a broken API looks like a working page. Without this line it
    // would look like one to us too.
    console.error("Could not reach the API for products, keeping what is on screen.", error);
  } finally {
    if (mine === generation) asking = false;
  }
}

/**
 * The catalogue, live once the backend has answered, and re-asked whenever the
 * visitor chooses a different currency.
 *
 * **Never fetched at build time**, which is not optional: prices resolve per
 * visitor, so a baked response ships one country's currency to everybody. See
 * the rule at the top of `lib/api.ts`.
 *
 * ## The effect asks the store, not the render it was scheduled from
 *
 * `chosen` is the dependency and **`currencySelection()` is the value**, which
 * looks like a redundancy and is the opposite of one.
 *
 * The hydration render is required to report "nothing chosen": the export was
 * built that way, so `currencySelectionOnServer` is what the first client paint
 * must adopt or it disagrees with the HTML underneath it. An effect closing over
 * *that* render's `chosen` therefore asks cold for every visitor, including one
 * who chose GBP yesterday — and then asks a second time when the store reads
 * storage and the dependency changes.
 *
 * Two calls on every reload, and the first of them a request for a currency the
 * visitor did not want, whose answer paints detected prices for a beat before
 * the second corrects them. Fact 1 of the plan's "What proves it" says a chosen
 * currency rides on **every** product request; that first one carried none.
 *
 * **Found by driving it, not by reading it** — step 11, against staging, and
 * `check:currency`'s "returning" state is where it now lives. Reading the store
 * inside the effect costs nothing and closes both: by the time an effect runs,
 * `localStorage` is readable, so the first ask is the right one and the
 * dependency change that follows is absorbed by `askCatalogue`'s own guard.
 */
export function useCatalogue(): ApiProduct[] | null {
  const { chosen } = useCurrency();
  const live = useSyncExternalStore(subscribe, catalogue, catalogueOnServer);

  useEffect(() => {
    void askCatalogue(currencySelection().chosen);
  }, [chosen]);

  return live;
}

/**
 * Drops the answer and the memory of having asked, which is what a page load
 * does implicitly. The seam a test needs to start over; nothing in the app
 * calls it.
 */
export function forgetCatalogue(): void {
  snapshot = null;
  askedFor = undefined;
  asking = false;
  generation += 1;
}
