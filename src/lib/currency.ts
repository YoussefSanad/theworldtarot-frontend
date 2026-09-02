"use client";

import { useSyncExternalStore } from "react";

/**
 * Which currency the visitor is being priced in, shared by everything on the
 * page that has to know.
 *
 * ## Two values, and only one of them is ever sent
 *
 * - **chosen** is the currency the visitor explicitly picked. It is the only
 *   value that travels, as `?currency=` on every product request, and the
 *   backend honours it exactly and stops detecting — `API_CONTRACT.md` section
 *   4, resolution order step 1.
 * - **resolved** is what the backend answered with, read off `price.currency`.
 *   It is remembered so the control has something to highlight on `/login/`,
 *   `/set-password/` and `/checkout/complete/`, which fetch no product and so
 *   would otherwise draw a currency selector with nothing selected.
 *
 * **The split is the design, not bookkeeping.** A visitor who has never chosen
 * sends nothing, deliberately, and is answered by the backend's `CF-IPCountry`
 * detection. Sending **resolved** back would turn every one of those visitors
 * into an explicit choice on their second page load, and the border they crossed
 * since would never be noticed. So **resolved** is read for the highlight and
 * for nothing else.
 *
 * ## localStorage, not a cookie
 *
 * The contract offers a `currency` cookie as an alternative to the parameter.
 * It is declined in #63: the API is a different origin, so it would be a
 * third-party cookie under Safari's rules, and it would put per-visitor state on
 * responses whose URLs do not vary — the exact caching problem the contract's
 * own section 9 warns about. The parameter varies the URL, which is what makes
 * the response cacheable at all.
 *
 * ## A store rather than a context
 *
 * Same reasoning as `components/account/useSignedIn.ts`, which this copies: the
 * readers are not siblings. The header renders the control twice — desktop panel
 * and mobile drawer — and the things that act on it are `lib/` modules that are
 * not the layout's descendants. A context would force a client boundary onto a
 * server layout to serve them.
 *
 * **The snapshot is one object, replaced only when a value changes.**
 * `useSyncExternalStore` calls the getter on every render and compares with
 * `Object.is`, so a getter building a fresh object each time renders forever.
 * `checkout-session.ts` learned the same lesson and says so at `recallCheckout`.
 */

const CHOSEN_KEY = "currency.chosen";
const RESOLVED_KEY = "currency.resolved";

export type CurrencySelection = {
  /** The explicit choice. Sent as `?currency=`. `null` until one is made. */
  chosen: string | null;
  /** What the backend last answered with. Display-only, and never sent. */
  resolved: string | null;
};

/** Also the server snapshot, which is why it is a constant and not a literal. */
const NOTHING_CHOSEN: CurrencySelection = { chosen: null, resolved: null };

const listeners = new Set<() => void>();

let snapshot: CurrencySelection = NOTHING_CHOSEN;
let loaded = false;

/**
 * The in-memory value is the authority and storage is its durable copy, rather
 * than the other way round. That ordering is what lets a browser with storage
 * switched off still take a choice for the length of the page load: the switch
 * works, and only outliving the reload is lost.
 */
function load(): void {
  if (loaded) return;
  loaded = true;

  const chosen = read(CHOSEN_KEY);
  const resolved = read(RESOLVED_KEY);

  if (chosen !== null || resolved !== null) snapshot = { chosen, resolved };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Storage refused: a browser set to block site data, or an embedded
    // webview with it off. Answering "nothing chosen" is the right way to be
    // wrong here — the visitor is priced by detection, which is what a first
    // visit does anyway.
    return null;
  }
}

function forget(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Same locked-down browser as `read` and `write`. The in-memory value is
    // the authority, and it has already been cleared by the caller.
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Same browser, and the choice still holds in memory for this page load.
    // Losing it on reload is a worse experience, not a broken one, and it must
    // not throw into a header the visitor merely clicked.
  }
}

function publish(next: CurrencySelection): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function subscribeToCurrency(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function currencySelection(): CurrencySelection {
  load();

  return snapshot;
}

/**
 * The static export is built with nobody having chosen anything, so hydration
 * has to start there or the first client paint disagrees with the markup it is
 * adopting. `useSignedIn` starts from the same place for the same reason.
 */
export function currencySelectionOnServer(): CurrencySelection {
  return NOTHING_CHOSEN;
}

/**
 * The visitor picked one. This is what starts travelling as `?currency=`.
 *
 * **The last resolution is dropped with the press**, and without that the
 * control is broken on exactly the pages `resolved` was persisted for. Nothing
 * on `/login/`, `/set-password/` or `/checkout/complete/` refetches, so a
 * resolution left standing outranks the new choice for ever — see
 * `highlightedCurrency`, which prefers it — and the row the visitor just pressed
 * never lights up. The press looks broken because, on those pages, it is.
 *
 * Dropping it costs nothing where a page *does* fetch: the answer lands a round
 * trip later and writes `resolved` again, which is the gap `highlightedCurrency`
 * already documents `chosen` as covering. Found by the Spec review, 2 September
 * 2026.
 */
export function chooseCurrency(code: string): void {
  load();
  if (snapshot.chosen === code) return;

  write(CHOSEN_KEY, code);
  forget(RESOLVED_KEY);
  publish({ chosen: code, resolved: null });
}

/**
 * The backend answered in this currency. Display-only: it feeds the highlight
 * and never a request.
 */
export function rememberResolvedCurrency(code: string): void {
  load();
  if (snapshot.resolved === code) return;

  write(RESOLVED_KEY, code);
  publish({ ...snapshot, resolved: code });
}

/**
 * What a visitor is priced in before anything at all is known about them.
 *
 * Only ever a highlight, never a request: a **cold** visitor still sends no
 * `?currency=`, and the backend answers them from `CF-IPCountry`. This is the
 * label the control wears for the one paint between hydration and the first
 * response, and on a page that fetches no product and has nothing remembered.
 *
 * USD because that is what the bundled strings in `content/home.ts` and
 * `content/readings.ts` are written in, so the highlight agrees with the prices
 * beside it while both are still bundled copy.
 *
 * **Cold, not a fallback.** This was `FALLBACK_CURRENCY` until the Standards
 * review of 2 September 2026: the word is in the _Avoid_ list of the very
 * glossary entry the paragraph above is a restatement of, and a name that
 * argues with the definition under it teaches the wrong one.
 */
export const COLD_CURRENCY = "USD";

/**
 * Which row the control draws as chosen.
 *
 * **resolved first, and that ordering is the rule.** It is what the visitor is
 * actually being charged in — the backend honours a **chosen** currency it
 * sells in and falls back to its own where it does not, so highlighting the
 * request rather than the answer would tell somebody who asked for JPY that
 * they are paying in JPY when they are paying in USD.
 *
 * **chosen** covers the gap before any answer, so the row a visitor just
 * pressed highlights on the press instead of a round trip later. The constant
 * covers the visitor who has neither — see `COLD_CURRENCY`.
 *
 * Pure, and exported apart from the hook so the rule can be exercised without
 * mounting a header.
 */
export function highlightedCurrency({ chosen, resolved }: CurrencySelection): string {
  return resolved ?? chosen ?? COLD_CURRENCY;
}

/**
 * Drops the in-memory copy so the next read comes from storage again.
 *
 * What a page load does implicitly, and the seam a test needs to simulate one —
 * the state this module is built on is module-scoped by design, so there is no
 * other way to ask it to start over. Nothing in the app calls it.
 */
export function forgetCurrency(): void {
  loaded = false;
  snapshot = NOTHING_CHOSEN;
}

/**
 * The currency to price in, and the way to change it.
 *
 * **chosen** is what a fetch should send — absent means send nothing. The
 * control highlights **resolved**, falling back to **chosen** where no request
 * has answered yet.
 */
export function useCurrency(): CurrencySelection & { choose: (code: string) => void } {
  const { chosen, resolved } = useSyncExternalStore(
    subscribeToCurrency,
    currencySelection,
    currencySelectionOnServer,
  );

  return { chosen, resolved, choose: chooseCurrency };
}
