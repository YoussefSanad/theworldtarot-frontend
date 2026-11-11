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
 *
 * Champagne, not gold. The client read this line as off against the rest of
 * the site, and it was: the World Tarot page and a reading's own page both
 * closed in `--color-champagne` while this one and the readings index closed in
 * gold. This page moved first; the readings index followed for the same note,
 * and champagne is now `ClosingSaying`'s default rather than a thing each page
 * asks for. `tone` is still passed here to keep the call explicit alongside the
 * other three props.
 *
 * `hugRule` collapses this block's centred room-space box, so GET MY READING
 * sits under the rule instead of floating in the middle of up to 256px of air —
 * the same move the World Tarot page makes, and for the same reason: this page
 * owns the room below its closing line on the wrapper in the route, so spending
 * it twice pushed the button away from the line it belongs to. The wrapper's
 * `lg:pb-` absorbs the 94px that box used to contribute; see the note there.
 */
export function LibraryClosing() {
  return (
    <ClosingSaying
      saying={[library.closing]}
      action={headerActions.cta}
      width="library"
      rule="heroWide"
      tone="champagne"
      hugRule
    />
  );
}
