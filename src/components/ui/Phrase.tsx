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
 */
export function Phrase({ parts }: { parts: readonly string[] }) {
  return parts.map((part, index) => (
    <Fragment key={part}>
      {index > 0 ? " " : null}
      <span className="inline-block">{part}</span>
    </Fragment>
  ));
}
