"use client";

import { useSyncExternalStore } from "react";

import { currentLocale, DEFAULT_LOCALE } from "@/lib/locale";

const subscribeHydration = () => () => {};
const getHydrated = () => true;
const getServerHydrated = () => false;

/**
 * Everything whose words depend on the visitor's stored language, rendered in
 * that language only once hydration is over.
 *
 * **The export is English, and a stored Spanish is only known in the
 * browser.** Every `content/*.ts` module resolves its copy at module scope from
 * `currentLocale()`, so on a Spanish visit the very first client render is
 * already Spanish while the HTML it is adopting is English. React calls that a
 * hydration failure: it reports it on every page load (`#418` in the export, a
 * full-screen overlay in development) and regenerates the whole tree on the
 * client. The regeneration is what used to put Spanish on screen, so the
 * accepted "flash of English, then Spanish" was being delivered by an error.
 *
 * So for a visitor reading anything but English this adopts the served markup
 * **without hydrating it** (`dangerouslySetInnerHTML` tells React there are no
 * children to compare, and `suppressHydrationWarning` silences the one
 * attribute it would otherwise diff), then renders its children the moment
 * hydration is done. React clears the served English and mounts the tree fresh,
 * in Spanish. The visitor sees what they saw before; React has nothing to
 * report. An English visit hydrates exactly as it always did.
 *
 * `display: contents` keeps the wrapper out of the layout, so the column's
 * flexbox, and the positioning `PageAtmosphere` resolves against, see the same
 * children they always did.
 *
 * `npm run check:locale` is the check that goes red without this.
 */
export function LanguageBoundary({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(subscribeHydration, getHydrated, getServerHydrated);

  if (!hydrated && currentLocale() !== DEFAULT_LOCALE) {
    return <div className="contents" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />;
  }

  return <div className="contents">{children}</div>;
}
