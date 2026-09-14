import { MajorArcanaCarousel } from "@/components/library/MajorArcanaCarousel";
import { TarotCardTile } from "@/components/library/TarotCardTile";
import { majorArcana } from "@/content/library";

/**
 * The twenty-two Major Arcana, four across.
 *
 * Figma's block is 914px wide at x=499: cards 205x340, columns at x = 0 / 239 /
 * 472 / 707 and rows at y = 0 / 366 / 734 / 1106 / 1481 / 1849. That is a 233px
 * column pitch and a ~368px row pitch, so **the gutter is 28px both ways** —
 * which is the number the grid is built from, rather than the offsets, since a
 * grid is a pitch and a gap and not a list of coordinates.
 *
 * Twenty-two into four leaves two over, and the client centres them under the
 * fifth row rather than leaving them at the left. `justify-items-center` plus
 * the rule on the last row does that without a second grid or a special case in
 * the markup — see `.library-grid` in globals.css.
 *
 * A list, because that is what it is: twenty-two links to twenty-two pages, in
 * a deliberate order that a screen reader should announce the length of. It
 * stays one flat `<ul>` below `sm` too, where `MajorArcanaCarousel` swipes it
 * instead of stacking it — the list is the carousel's track rather than
 * something wrapped in one.
 *
 * This component stays on the server so `TarotCardTile` does, which is what
 * keeps `next/image` and `next/link` out of the carousel's client bundle.
 */
export function MajorArcanaGrid() {
  return (
    <MajorArcanaCarousel
      slideCount={majorArcana.length}
      /*
        Written here rather than in the client component because it is copy, and
        copy on this site is data the server owns. "Card 7 of 22" rather than
        "slide": the reader is looking at a deck, and the word the page uses for
        one of these everywhere else is card.

        Two strings rather than a formatter function: this is a server
        component, and a function passed across that boundary has nothing React
        can serialise — it fails the prerender outright rather than degrading.
      */
      counterLabel={["Card", "of"]}
    >
      {majorArcana.map((card) => (
        <li key={card.slug} className="carousel-slide">
          <TarotCardTile card={card} />
        </li>
      ))}
    </MajorArcanaCarousel>
  );
}
