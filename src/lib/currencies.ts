"use client";

import { useEffect, useSyncExternalStore } from "react";

import { type ApiCurrency, fetchCurrencies } from "./api.ts";

/**
 * Which currencies the site sells in, as the list the control draws its rows
 * from.
 *
 * Separate from `currency.ts`, which holds *which one* the visitor is being
 * priced in. Two questions, and they change on completely different clocks: the
 * choice moves whenever somebody presses a row, the list moves when the backend
 * gains a currency, which is a migration and a deploy on both sides. Folding
 * them into one store would re-render every priced surface on the page each
 * time this endpoint answered.
 *
 * ## The failure rule is the opposite of the language one
 *
 * **A failure here keeps the control on the page with the three currencies this
 * repository knows.** A failure in `languages.ts` takes the language group off
 * it. The asymmetry is not an inconsistency — it is the difference between the
 * two lists:
 *
 * - **A language can be taken down at any moment**, effective on the next
 *   request with no deploy on our side. `API_CONTRACT.md` calls building the
 *   switcher from the endpoint the one requirement it cannot enforce for us. A
 *   hardcoded list therefore drifts silently into offering a dead link
 * - **A currency cannot.** It needs a migration and a deploy on both sides, so
 *   a list held here cannot go stale without somebody here knowing. Taking the
 *   control off the page because one flat endpoint was briefly unreachable
 *   would cost a visitor the ability to change currency for no safety at all
 *
 * So this endpoint is an *upgrade* — the real symbols, and any fourth currency
 * the day it ships — rather than a precondition.
 *
 * Asked once per page load, in `useSignedIn`'s ask-once shape, because the
 * header renders the control twice and one answer serves both.
 */

/**
 * The three the backend sells in, per `products-api-wiring.md`.
 *
 * A fallback rather than the source of truth, which is the endpoint. Kept in
 * sync by the deploy that would have to change both.
 */
export const KNOWN_CURRENCIES: readonly ApiCurrency[] = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
];

/**
 * The rows to draw.
 *
 * Pure, and exported apart from the hook so the fallback rule can be exercised
 * without mounting a header.
 *
 * `null` is "no answer yet, or one that failed", and an empty array is folded
 * in with it deliberately. A successful response listing no currencies would
 * mean a shop that sells in nothing, which is a fault rather than a state to
 * design for — the same reading `resolveProducts` gives an empty catalogue, and
 * for the same reason: honouring it literally would draw a Currency heading
 * over blank space.
 */
export function resolveCurrencies(live: readonly ApiCurrency[] | null): readonly ApiCurrency[] {
  if (!live || live.length === 0) return KNOWN_CURRENCIES;

  return live;
}

/** `null` until the endpoint answers, and after one that failed. */
let snapshot: readonly ApiCurrency[] | null = null;
let asked = false;
let asking: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: readonly ApiCurrency[]): void {
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

export function currencyOptions(): readonly ApiCurrency[] | null {
  return snapshot;
}

/**
 * The static export is built having asked nobody, so the first client render
 * has to agree with the HTML it is adopting: the known three either way.
 */
function currencyOptionsOnServer(): readonly ApiCurrency[] | null {
  return null;
}

/**
 * Asks once per page load, and only once however many controls want it.
 *
 * The guard is the in-flight promise rather than an abort signal, for the
 * reason `useSignedIn` gives at its own `ask`: React's development double-mount
 * would cancel the request the first mount started and the second would skip
 * asking again, which is a difference that lives only in development.
 *
 * Returns a promise so a test can await it. Nothing in the app waits on it —
 * the control is already drawn from `KNOWN_CURRENCIES` by then.
 */
export async function askCurrencies(): Promise<void> {
  if (asked || asking) return;

  asking = fetchCurrencies()
    .then(
      (currencies) => publish(currencies),
      (error: unknown) => {
        // Loud here and invisible on the page: the control still draws its
        // three rows, so from the outside an unreachable endpoint and a
        // working one are the same header. Without this line they would be the
        // same to us too.
        console.error("Could not ask the API which currencies it sells in.", error);
        publish([]);
      },
    )
    .finally(() => {
      asking = null;
    });

  return asking;
}

/** The rows to draw, upgraded to the backend's list once it answers. */
export function useCurrencyOptions(): readonly ApiCurrency[] {
  const live = useSyncExternalStore(subscribe, currencyOptions, currencyOptionsOnServer);

  useEffect(() => {
    void askCurrencies();
  }, []);

  return resolveCurrencies(live);
}

/**
 * Drops the answer and the memory of having asked, which is what a page load
 * does implicitly. The seam a test needs to start over; nothing in the app
 * calls it.
 */
export function forgetCurrencies(): void {
  snapshot = null;
  asked = false;
  asking = null;
}
