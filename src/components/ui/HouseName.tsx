import { Fragment } from "react";

/**
 * The house name, set in the brand's own face wherever it turns up in a line of
 * copy.
 *
 * Figma sets "World Tarot" in Cinzel inside an otherwise Gill Sans line — and
 * Cinzel renders lowercase as small capitals, which is what makes it read as
 * WORLD TAROT on the page. Doing that from the content layer would mean either
 * splitting one sentence into three fragments in `reading-pages.ts` or storing
 * it shouting; doing it here keeps the copy a sentence and the typography a
 * typographic decision, and it keeps working if the client drops the name into
 * another line.
 *
 * The match is on the name without its article, because that is how she writes
 * it mid-sentence — "original World Tarot artwork", not "the The World Tarot".
 */
const HOUSE_NAME = "World Tarot";

export function HouseName({ children }: { children: string }) {
  return children.split(HOUSE_NAME).map((part, index) => (
    <Fragment key={index}>
      {index > 0 ? <span className="font-serif">{HOUSE_NAME}</span> : null}
      {part}
    </Fragment>
  ));
}
