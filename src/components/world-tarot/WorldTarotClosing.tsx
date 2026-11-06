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
 *
 * `hugRule` because this page owns the air under its closing line, on the
 * wrapper in the route. Without it the block also spends
 * `lg:h-[clamp(6rem,14vw,16rem)]` on a room-space box and centres the button
 * inside it — up to 256px of it — which set the button adrift below the quote.
 * Collapsing that box puts it just under the rule the way the frame draws it,
 * 17px below.
 *
 * The readings pages keep the centred box, which is theirs and correct: there
 * the artwork runs on under the button and that air is the room on show. Here
 * the same air is already on the wrapper, and having it twice is what pushed
 * the button down.
 */
export function WorldTarotClosing() {
  return (
    <ClosingSaying
      saying={closing.saying}
      action={closing.action}
      width="worldTarot"
      rule="heroWide"
      tone="champagne"
      hugRule
    />
  );
}
