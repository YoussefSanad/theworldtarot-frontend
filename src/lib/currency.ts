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

/** The visitor picked one. This is what starts travelling as `?currency=`. */
export function chooseCurrency(code: string): void {
  load();
  if (snapshot.chosen === code) return;

  write(CHOSEN_KEY, code);
  publish({ ...snapshot, chosen: code });
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
