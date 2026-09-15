"use client";

import { ClosingSaying } from "@/components/readings/ClosingSaying";
import { library } from "@/content/library";
import { headerActions } from "@/content/site";

/**
 * The Library's closing line and its GET MY READING.
 *
 * **Its own client component so the words are the visitor's.** The route is a
 * server component, and a line it passed to `ClosingSaying` itself would be
 * resolved once, at build time, in English — the way a reading page came to
 * read "Tu Lectura" over English items (see `ReadingForSale`).
 *
 * GET MY READING goes to the readings index because this page sells nothing
 * itself, which is the rule `content/site.ts` sets for the whole site.
 */
export function LibraryClosing() {
  return (
    <ClosingSaying
      saying={[library.closing]}
      action={headerActions.cta}
      width="library"
      rule="heroWide"
      tone="gold"
    />
  );
}
