import { Divider } from "@/components/ui/Divider";
import { cn } from "@/lib/cn";

/**
 * A reference page's opening block: the numeral, the name and the rule under it.
 *
 * **The numeral is a paragraph, not part of the heading.** It is drawn inside
 * the artwork below as well — the roundel at the top of every card carries it —
 * so folding it into the `<h1>` would have a screen reader announce "zero The
 * Fool" as one title where the frame plainly draws two things.
 *
 * **Props are primitives rather than a card**, because a suit's page draws this
 * same block with no numeral at all. `eyebrow` is optional for exactly that: a
 * card passes its Roman numeral, a suit passes nothing and the line is not
 * rendered.
 *
 * **`string` rather than `ReactNode`**, narrowly and deliberately. A `ReactNode`
 * admits `0`, which is falsy — so a future caller rendering a rank as a number
 * (an Ace as `0`) would silently get a heading with its eyebrow dropped and no
 * error anywhere. Every caller passes a string already; the narrower type makes
 * that whole class of bug unrepresentable rather than guarded against.
 *
 * The keyword line under this rule is **not** here — it is `Keywords`, which
 * both page kinds call.
 */
export function CardHeader({ heading, eyebrow }: { heading: string; eyebrow?: string }) {
  return (
    <header className="flex flex-col items-center text-center">
      {eyebrow ? (
        <p className="font-serif text-card-lead leading-none tracking-[0.01em] text-card-ink">{eyebrow}</p>
      ) : null}

      {/*
        **The gap above the name belongs to the numeral**, so a page without
        one starts at the heading rather than 19px below where it should.
        `mt-0` rather than a conditional class list because there are exactly
        two cases and the margin is the only thing that differs.
      */}
      <h1
        className={cn(
          "font-serif text-card-name leading-none tracking-[0.01em] text-card-ink",
          eyebrow &&
            "mt-[clamp(calc(0.5rem*var(--card-scale)),calc(0.99vw*var(--card-scale)),calc(1.1875rem*var(--card-scale)))]",
        )}
      >
        {heading}
      </h1>

      <Divider variant="green" className="mt-[clamp(calc(0.75rem*var(--card-scale)),calc(1.04vw*var(--card-scale)),calc(1.25rem*var(--card-scale)))]" />
    </header>
  );
}
