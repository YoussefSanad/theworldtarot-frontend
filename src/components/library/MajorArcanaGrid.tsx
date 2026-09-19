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
 * a deliberate order that a screen reader should announce the length of.
 *
 * **It is a grid at every width, and that is the client's instruction.** This
 * deck was a swipeable carousel below `sm` for a while, on the reasoning that
 * twenty-two full-height cards is four screens of scrolling on a phone and a
 * carousel turns that back into one card. She asked for it removed by name —
 * "keep the responsive grid with two columns, rather than a horizontal
 * carousel. No horizontal scrolling." — so the deck now folds to two columns
 * and is simply long on a phone, which is the trade she has chosen. Two
 * columns rather than one is what keeps that length in hand: it halves the
 * scroll against the old one-card layout, and the narrower tiles are why
 * `.library-card__name`'s `cqw` type had to grow with it.
 *
 * This component stays on the server, which is what keeps `next/image` and
 * `next/link` off the client entirely now that nothing here needs JavaScript.
 */
export function MajorArcanaGrid() {
  return (
    <ul className="library-grid">
      {majorArcana.map((card) => (
        <li key={card.slug}>
          <TarotCardTile card={card} />
        </li>
      ))}
    </ul>
  );
}
