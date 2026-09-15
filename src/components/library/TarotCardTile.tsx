import Image from "next/image";
import Link from "next/link";

import { cardAlt, cardPath, type MajorArcanaCard } from "@/content/library";
import { cn } from "@/lib/cn";

/**
 * One card in the Library grid, and the link to its own reference page.
 *
 * **The artwork is the whole card.** The client's files carry the gold border,
 * the roundel holding the numeral and the plaque along the bottom — everything
 * except the name, which the folder she delivered says in its own title: "NO
 * PLAQUE NAME". So nothing here rebuilds chrome from tokens the way the
 * Readings panels do; there is one image, and one line of text laid into the
 * plaque it already draws.
 *
 * That name is real text rather than part of the picture because the baked-in
 * version was not sharp enough to read, and because a picture of a word is
 * invisible to search, selection and translation.
 *
 * The tile is a `@container` sized in `cqw`, the `ProductCard` pattern: the
 * plaque is a fixed *fraction* of the card, so one set of measurements holds at
 * every width and the tile never needs to know how big it has been drawn. Width
 * is owned by whatever places it, not by the tile.
 *
 * **The name is a `.stack` cell**, sharing the artwork's grid area rather than
 * being positioned over it, and where it sits on the plaque is
 * `.library-card__name`'s business in globals.css. It was written here as an
 * absolutely positioned box first, which rendered the plaques empty: `.stack`
 * is `display: grid` and establishes no positioning context, so every name
 * resolved against the page instead of its card. `src/app/README.md` has the
 * rule — reach for `.stack` before `position: absolute` — and this is the case
 * it is describing.
 */

/**
 * Where the deck divides for tracking.
 *
 * Measured against the plaque's interior: "THE HIGH PRIEST" (15) is the longest
 * name the client lettered herself and fills about 85% of it; "THE HIGH
 * PRIESTESS" (18) comes to about 103% and is the only overrun in the deck.
 * Fifteen is therefore the line, and `.library-card__name--long` closes the gap
 * with tracking rather than a smaller size — see globals.css.
 */
export const LONG_NAME = 15;

export function TarotCardTile({ card }: { card: MajorArcanaCard }) {
  return (
    <Link href={cardPath(card)} className="library-card group @container no-underline">
      <span className="stack">
        {/*
          The alt text is the client's specified format. It repeats the name
          the plaque prints below, which is right for an image whose subject is
          that card: with the picture unavailable the sentence still says what
          was there, and with it available a screen reader reads the artwork and
          then the plaque, in the order they are drawn.
        */}
        <Image
          src={card.image.src}
          alt={cardAlt(card)}
          width={card.image.width}
          height={card.image.height}
          className="library-card__art h-auto w-full"
          /*
            Four across a 1568px measure at the top of the page. `sizes` still
            earns its place with `images.unoptimized`: it is what the browser
            uses to pick from `srcset` and to prioritise the fetch, and the grid
            reflows to two columns and then one below `lg`.
          */
          sizes="(width >= 64rem) 25vw, (width >= 40rem) 50vw, 100vw"
        />

        {/*
          The name, laid into the plaque the artwork draws.

          Absolute here rather than another `.stack` cell: this is not a layer
          the size of the card, it is a box a few percent tall pinned inside
          one, and `src/app/README.md`'s rule is about not positioning *layout*
          — the stack above is doing that job. `pointer-events-none` keeps the
          whole tile one link target.

          Real text, not `aria-hidden`: being readable by a screen reader and by
          a search engine is half of why the client moved the name out of the
          image. It is the tile's accessible name, so the link needs no label of
          its own.

          The size is the client's own setting, read off her mockup, where "THE
          HIGH PRIEST" fills about 85% of the plaque. Every name but one fits at
          it; see `.library-card__name` in globals.css for the three percent
          "THE HIGH PRIESTESS" needs.
        */}
        <span
          className={cn(
            "library-card__name pointer-events-none",
            card.name.length > LONG_NAME && "library-card__name--long",
          )}
        >
          <span className="library-card__name-text">{card.name}</span>
        </span>
      </span>
    </Link>
  );
}
