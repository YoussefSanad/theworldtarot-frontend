import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

/**
 * Page-level rhythm. `Section` owns the vertical spacing and full-bleed
 * background; `Container` owns the measure. Keeping them separate lets a
 * section's artwork run edge to edge while its content stays on the grid.
 */

export type ContainerWidth = "page" | "hero" | "measure" | "copy" | "readings" | "readingsGift" | "reading";

const WIDTH_CLASS: Record<ContainerWidth, string> = {
  page: "shell--page",
  hero: "shell--hero",
  measure: "shell--measure",
  copy: "shell--copy",
  readings: "shell--readings",
  readingsGift: "shell--readings-gift",
  reading: "shell--reading",
};

export function Container({
  width = "page",
  className,
  ...props
}: { width?: ContainerWidth } & ComponentPropsWithoutRef<"div">) {
  return <div className={cn("shell", WIDTH_CLASS[width], className)} {...props} />;
}

/**
 * Vertical rhythm is a prop rather than a default, so a section that carries its
 * own spacing (usually one bounded by ornamental rules) cannot end up fighting a
 * base padding utility.
 */
export type SectionPadding = "section" | "tight" | "none";

const PADDING_CLASS: Record<SectionPadding, string> = {
  section: "py-section",
  tight: "py-[clamp(1.5rem,3.1vw,3.7rem)]",
  none: "",
};

export function Section({
  padding = "section",
  className,
  ...props
}: { padding?: SectionPadding } & ComponentPropsWithoutRef<"section">) {
  return <section className={cn("relative", PADDING_CLASS[padding], className)} {...props} />;
}
