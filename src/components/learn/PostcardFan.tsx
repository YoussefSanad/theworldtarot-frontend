import Image from "next/image";

import { postcards } from "@/content/learn";

/**
 * The three course stills, fanned.
 *
 * **Built on `.stack`, not `position: absolute`.** The site's rule is to reach
 * for the one-grid-cell stack before absolute positioning (`src/app/README.md`),
 * and it is the better fit here anyway: three cards share a cell, the tallest
 * sets the box, and the group keeps a height in the flow — so the cream band
 * grows around the fan instead of the fan having to be measured into it.
 *
 * **Nothing here rotates anything.** Her exports arrive already tilted, with the
 * rounded corners and the play glyph painted in, so these placements only decide
 * where each card sits. Adding a `rotate` would tilt artwork that is already
 * tilted — see `learnArtwork` in `lib/assets`.
 *
 * **The placements are measured, not eyeballed.** In her frame the fan occupies
 * x930..1775, y1056..1567 — an 845x511 box — and each card sits at:
 *
 *     card      width of box     left of box     top (of box WIDTH)
 *     Sun           62%              0%              0%
 *     Chariot       57%             43%              9%
 *     Star          55%             21%             26%
 *
 * The constant below opens that out a little on the client's eye: the Chariot
 * rises to 5% and moves right to 45%, and the Star drops to 29%, so the three
 * read as a wider cascade than a literal transcription gives. The ordering and
 * the proportions are hers; only the spread is tuned.
 *
 * **The Sun is the highest card, then the Chariot, then the Star** — a cascade
 * down and to the right. That ordering is easy to get backwards: the Sun is
 * rotated anticlockwise, so its *left* corner hangs low (y1137) while its
 * top-right corner is the highest point in the whole fan (y1056). An earlier
 * draft measured that left corner and put the Chariot on top by mistake.
 *
 * All three are drawn at native scale (1.01, 1.00 and 1.00), so the percentages
 * above are just their own widths over the box. Percentages rather than lengths
 * so the fan holds its shape as the column narrows.
 *
 * **The composition is the same at every width**, which is why there is not a
 * single breakpoint in here. Every value is a percentage of the group's own
 * box, so the fan scales with its column rather than being rebuilt for small
 * screens: on a phone the same three cards sit in the same arrangement, just
 * smaller. An earlier draft dropped to the Star alone below `sm`, on the
 * reasoning that three cards would be unreadable thumbnails — but the fan is
 * the point of the section, and a phone column is wide enough to carry it.
 *
 * `StepInside` gives this group the full column width below `lg`, where it is
 * no longer sharing a row with the copy, so the cards land larger there than
 * the desktop half-column would suggest.
 */

/**
 * Each card's share of the fan box, and where its top-left corner sits in it,
 * as read off her frame.
 *
 * `.stack` puts every child in the same grid cell, so `place-self-start`
 * anchors each to that cell's top-left and the margins offset it from there.
 * **Both margins are percentages of the cell's width**, which is how CSS
 * resolves a percentage margin on either axis — so the vertical figures are
 * her pixel offsets over the fan's *width* (830), not its height.
 */
const PLACEMENT = [
  /* The Sun: widest, highest, furthest left, behind the other two. */
  "w-[62%] mt-0 ml-0",
  /* The Chariot: furthest right, a short step below the Sun. */
  "w-[57%] mt-[5%] ml-[45%]",
  /* The Star: lowest, centre-left, in front of both. */
  "w-[55%] mt-[29%] ml-[20%]",
];

export function PostcardFan() {
  return (
    <div className="stack w-full">
      {postcards.map((postcard, index) => (
        <div key={postcard.image.src} className={`place-self-start ${PLACEMENT[index]}`}>
          <Image
            src={postcard.image.src}
            alt={postcard.alt}
            width={postcard.image.width}
            height={postcard.image.height}
            /* ~60% of the fan box: half the shell above `lg`, the full column below it. */
            sizes="(width >= 64rem) 30vw, 55vw"
            className="h-auto w-full"
          />
        </div>
      ))}
    </div>
  );
}
