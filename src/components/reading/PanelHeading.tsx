import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * A section heading inside a reading panel, with the rule running through it.
 *
 * Figma ships each of the four as a 626x1 bitmap that is solid gold up to the
 * words and transparent behind them — a rule with a gap in it. Here the gap is
 * the heading's own width and the rules are `flex: 1` borders taking whatever
 * it leaves, so nothing has to be re-measured when the type scales or the
 * words wrap. Same construction as the readings index's "Traditional Tarot
 * Readings" row (`.flanked`), one weight lighter.
 *
 * The rules centre on the heading's box, which is where the client runs the
 * line: 930px against the box's own 931 in the frame.
 */
export function PanelHeading({
  as: Tag = "h2",
  className,
  children,
}: {
  as?: "h2" | "h3";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cn("flanked flanked--hairline w-full text-center font-display text-mist", className)}>
      <span aria-hidden className="flanked__rule" />
      {/* 12px either side of the words at the 48px the left panel sets. */}
      <span className="mx-[0.25em] min-w-0">{children}</span>
      <span aria-hidden className="flanked__rule" />
    </Tag>
  );
}
