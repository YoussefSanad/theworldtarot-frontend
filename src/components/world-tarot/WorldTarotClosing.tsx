"use client";

import { ClosingSaying } from "@/components/readings/ClosingSaying";
import { closing } from "@/content/world-tarot";

/**
 * The page's closing saying and its GET MY READING.
 *
 * **Its own client component so the words are the visitor's.** The route is a
 * server component, and a saying it passed to `ClosingSaying` itself would be
 * resolved once, at build time, in English — the way a reading page came to
 * read "Tu Lectura" over English items (see `ReadingForSale`).
 *
 * Champagne, not the index's gold: the quote in her render measures exactly
 * `#fff3d7`, which is `--color-champagne` to the byte. Same tone a reading's
 * own page takes.
 */
export function WorldTarotClosing() {
  return (
    <ClosingSaying
      saying={closing.saying}
      action={closing.action}
      width="worldTarot"
      rule="heroWide"
      tone="champagne"
    />
  );
}
