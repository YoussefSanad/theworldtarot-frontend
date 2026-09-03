import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The 607px box every field on the order panel and on `/redeem/`'s stands in.
 *
 * **One number, because it is what stops the panel changing shape.** The two
 * sections the order panel swaps between are different heights and always will
 * be — four required boxes and a textarea do not fit the question field's 607px
 * in both directions — so the width is the half of the not-shifting that still
 * holds, and a copy of it that drifted would lose that half too. It is
 * `88.35cqw` rather than a share of the column because `cqw` resolves against
 * the panel: the number is the frame's own, and it survives the column being
 * resized around it. `scripts/check-panel.mjs` asserts it on both sections.
 *
 * `cn` rather than a template literal: `className` is optional, and an omitted
 * one interpolates the string "undefined" into the class list.
 */
export function FieldBox({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex w-[88.35cqw] flex-col", className)} {...rest}>
      {children}
    </div>
  );
}
