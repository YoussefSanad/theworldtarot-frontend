import { Divider } from "@/components/ui/Divider";
import type { MajorArcanaCard } from "@/content/library";

/**
 * The card's numeral and name, over the first of the page's three green rules.
 *
 * **The numeral is a paragraph, not part of the heading.** It is drawn inside
 * the artwork below as well — the roundel at the top of every card carries it —
 * so folding it into the `<h1>` would have a screen reader announce "zero The
 * Fool" as one title where the frame plainly draws two things.
 */
export function CardHeader({ card }: { card: MajorArcanaCard }) {
  return (
    <header className="flex flex-col items-center text-center">
      <p className="font-serif text-card-lead leading-none tracking-[0.01em] text-card-ink">{card.numeral}</p>

      <h1 className="mt-[clamp(0.5rem,0.99vw,1.1875rem)] font-serif text-card-name leading-none tracking-[0.01em] text-card-ink">
        {card.name}
      </h1>

      <Divider variant="green" className="mt-[clamp(0.75rem,1.04vw,1.25rem)]" />
    </header>
  );
}
