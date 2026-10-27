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
  busy = false,
  busyLabel,
  className,
  type = "button",
  children,
  ...props
}: SharedProps &
  ComponentPropsWithoutRef<"button"> & {
    /** Whether the work this button started is still in flight. */
    busy?: boolean;
    /**
     * What a screen reader is told while `busy`. The sighted label is replaced
     * by a spinner, which has nothing to read.
     */
    busyLabel?: string;
  }) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      aria-busy={busy || undefined}
      disabled={busy || props.disabled}
      {...props}
    >
      <BusySwap busy={busy} busyLabel={busyLabel}>
        {children}
      </BusySwap>
    </button>
  );
}

/**
 * Swaps a button's label for a spinner **without the button changing width**.
 *
 * ## Why the label stays in the document
 *
 * The obvious way to do this is `busy ? <Spinner/> : label`, and it makes the
 * button jump: "Sign in" and a 1em spinner are nothing like the same width, so
 * a row of controls reflows the instant somebody presses one, and a button
 * under the pointer moves out from under it. Replacing the words with another
 * string — "Signing in…" — is the same fault wearing a label, and it is what
 * this site did until now: every busy wording was *longer* than its idle one,
 * so every button grew at the worst moment.
 *
 * So the label is never removed. It stays in the flow, holding the box at
 * exactly the width it had, and goes `invisible` — which keeps its size and
 * drops it from the accessibility tree. The spinner is absolutely positioned
 * over the middle, where it costs the layout nothing.
 *
 * The fade is on opacity alone for the same reason: anything that animated a
 * dimension would reintroduce the movement this exists to prevent.
 */
function BusySwap({
  busy,
  busyLabel,
  children,
}: {
  busy: boolean;
  busyLabel?: string;
  children?: React.ReactNode;
}) {
  if (!busy) return <>{children}</>;

  return (
    <span className="relative inline-flex items-center justify-center gap-[inherit]">
      {/*
        The label, holding the width it already had. `invisible` rather than
        `hidden` or a removal: it keeps the box and its measurements and only
        stops it being painted or read.
      */}
      <span aria-hidden className="invisible inline-flex items-center gap-[inherit]">
        {children}
      </span>

      <span className="absolute inset-0 flex items-center justify-center">
        <Spinner />
      </span>

      {busyLabel ? <span className="sr-only">{busyLabel}</span> : null}
    </span>
  );
}

/**
 * The loader that stands in for a label.
 *
 * A ring with a gap, turning. Drawn in `currentColor` so it is the button's own
 * ink in every variant — gold on the primary, mist on the ghost — rather than a
 * colour this component would have to know about.
 *
 * `motion-reduce:animate-none` leaves a static ring for anybody who asked not
 * to be spun at; the button is `aria-busy` either way, which is what actually
 * carries the meaning.
 */
function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-[1.15em] animate-spin motion-reduce:animate-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}

export function ButtonLink({
  variant = "gold",
  size = "md",
  className,
  ...props
}: SharedProps & ComponentPropsWithoutRef<typeof Link>) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
