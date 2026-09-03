"use client";

import { useEffect, useSyncExternalStore } from "react";

import { type ApiLanguage, fetchLanguages } from "./api.ts";
import { BUILT_LOCALES, type Locale } from "./locale.ts";

/**
 * Which languages the site may be offered in, as the list the switcher draws
 * its rows from.
 *
 * ## Never a hardcoded list, and never the endpoint alone
 *
 * `API_CONTRACT.md` calls building the switcher from `GET /api/v1/languages`
 * the one requirement it cannot enforce for us: a language can be taken down at
 * any moment, effective on the next request with no deploy on our side, and a
 * hardcoded switcher then offers a dead link with a 404 behind it.
 *
 * A static export cannot obey that literally — a route has to exist at build
 * time. **So the switcher draws the intersection**: a language must be in
 * `BUILT_LOCALES` *and* in the live answer. That keeps the property the clause
 * exists for, which is that taking a language down removes it everywhere
 * immediately. See `docs/adr/0004-language-is-a-path-segment.md`.
 *
 * ## A failure takes the switcher away, unlike `currencies.ts`
 *
 * The asymmetry is deliberate and it follows from the paragraph above. There is
 * no safe fallback list for a language: any list held here is exactly the
 * hardcoded switcher the contract forbids, and the failure it produces —
 * offering a language that is down — is a 404 in the visitor's face. A missing
 * language group costs an English reader nothing, so silence is the cheap way
 * to be wrong. `currencies.ts` argues the other direction for its own list.
 *
 * ## In memory, not `sessionStorage`
 *
 * The contract asks for a brief cache, and the *reason* it gives is that this
 * endpoint is what tells you a language went down. A `sessionStorage` copy
 * would outlive the tab's page loads and keep answering after the takedown,
 * which is the one thing the call exists to notice. One ask per page load is
 * the cache.
 */

/**
 * The languages to offer.
 *
 * Pure, and exported apart from the hook so both halves of the rule can be
 * exercised without mounting a header.
 *
 * **Fewer than two offers nothing.** A group holding only the language you are
 * already reading is a control that cannot do anything, and drawing a Language
 * heading over a single inert row is worse than drawing neither. `null` — no
 * answer yet, or one that failed — lands in the same place, because both mean
 * there is nothing safe to offer.
 *
 * The live answer's order is kept, being the backend's own.
 */
export function resolveLanguages(
  live: readonly ApiLanguage[] | null,
  built: readonly Locale[] = BUILT_LOCALES,
): readonly ApiLanguage[] {
  if (!live) return [];

  const offered = live.filter((language) => built.includes(language.code));

  return offered.length < 2 ? [] : offered;
}

/** `null` until the endpoint answers, and after one that failed. */
let snapshot: readonly ApiLanguage[] | null = null;
let asked = false;
let asking: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: readonly ApiLanguage[]): void {
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

export function languageOptions(): readonly ApiLanguage[] | null {
  return snapshot;
}

/**
 * The static export is built having asked nobody, so the first client render
 * has to agree with the HTML it is adopting: no language group either way.
 */
function languageOptionsOnServer(): readonly ApiLanguage[] | null {
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
 * Returns a promise so a test can await it. Nothing in the app waits on it.
 */
export async function askLanguages(): Promise<void> {
  if (asked || asking) return;

  asking = fetchLanguages()
    .then(
      (languages) => publish(languages),
      (error: unknown) => {
        // Loud here and invisible on the page: no language group is drawn,
        // which is what one live language draws too. From the outside the two
        // are the same header, and without this line they would be the same to
        // us as well.
        console.error("Could not ask the API which languages are live.", error);
        publish([]);
      },
    )
    .finally(() => {
      asking = null;
    });

  return asking;
}

/**
 * The language rows to draw — empty until there are two to choose between.
 *
 * **Correct and invisible today**, which is the reason it ships now rather than
 * with #69: the switcher appears the day somebody flips a second language to
 * `Live` and this export has been built for it, and that property only exists
 * if the call is already in the bundle.
 */
export function useLanguageOptions(): readonly ApiLanguage[] {
  const live = useSyncExternalStore(subscribe, languageOptions, languageOptionsOnServer);

  useEffect(() => {
    void askLanguages();
  }, []);

  return resolveLanguages(live);
}

/**
 * Drops the answer and the memory of having asked, which is what a page load
 * does implicitly. The seam a test needs to start over; nothing in the app
 * calls it.
 */
export function forgetLanguages(): void {
  snapshot = null;
  asked = false;
  asking = null;
}
