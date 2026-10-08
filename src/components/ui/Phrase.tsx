import { Fragment } from "react";

/**
 * Copy whose line breaks the client chose.
 *
 * Several pieces of text on the Readings page sit on one line in the desktop
 * frame and on two or three in the mobile one, always breaking at a point she
 * picked rather than wherever the measure happened to run out. Written as hard
 * lines that would take a second copy of the text and a breakpoint to switch
 * between them; left to wrap on its own the break lands in the wrong place.
 *
 * So each phrase is an `inline-block`, joined by ordinary spaces: the browser
 * sets them on one line while they fit and breaks *between* them when they
 * don't — never inside one. One copy of the words, no breakpoint, and the
 * breaks fall exactly where the frames draw them.
 *
 * **`reflow` relaxes the "never inside one" half of that**, for copy whose
 * own lines are longer than the narrowest measure they have to sit in. The
 * suit pages' closing sayings are the case: her line "The mind, when clear,
 * becomes a blade of light" is 46 characters and Pentacles' is 53, both wider
 * than a phone column — so the `inline-block` could not fit and dropped whole,
 * leaving a short orphan line beneath it and three lines where two would do.
 *
 * With `reflow` each part keeps its own box — so the browser still prefers to
 * break between her lines — but that box may not exceed the measure, and its
 * text wraps inside it when it would. A line that fits behaves exactly as
 * before; only one too long for the column gives way, and it gives way within
 * itself rather than dropping entire.
 */
export function Phrase({ parts, reflow = false }: { parts: readonly string[]; reflow?: boolean }) {
  return parts.map((part, index) => (
    <Fragment key={part}>
      {index > 0 ? " " : null}
      <span className={reflow ? "inline-block max-w-full" : "inline-block"}>{part}</span>
    </Fragment>
  ));
}
