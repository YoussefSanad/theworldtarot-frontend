import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

/**
 * The two button treatments used across the site: the gold gradient primary and
 * the dark bordered secondary. Both are drawn from tokens in globals.css.
 *
 * `size` covers the box metrics Figma repeats; pass `size="fluid"` when the
 * button scales with its own container, such as inside a product tile.
 */
export type ButtonVariant = "gold" | "ghost";
export type ButtonSize = "md" | "lg" | "fluid";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  gold: "btn-gold",
  ghost: "btn-ghost",
};

/*
  Figma drew both sizes at a fixed width — 305px and 449px — but that width is
  dead space either side of the label, and the client wants a gold button to be
  its own text plus its padding at every breakpoint. So only the height carries
  over from the drawing; the width is always the content's.
*/
const SIZE_CLASS: Record<ButtonSize, string> = {
  // 54px tall at 30px type on desktop, taller below lg.
  md: "min-h-[2.2em] w-fit max-w-full px-[1em] py-[0.45em] text-nav whitespace-nowrap lg:min-h-[1.8em] lg:py-[0.3em]",
  // 80px tall at 30px type.
  lg: "min-h-[2.66em] w-fit max-w-full px-[0.6em] py-[0.33em] text-nav whitespace-nowrap",
  fluid: "",
};

function buttonClass(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cn("btn", VARIANT_CLASS[variant], SIZE_CLASS[size], className);
}

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "gold",
  size = "md",
  className,
  type = "button",
  ...props
}: SharedProps & ComponentPropsWithoutRef<"button">) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "gold",
  size = "md",
  className,
  ...props
}: SharedProps & ComponentPropsWithoutRef<typeof Link>) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
