"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * A field that says how much of its allowance is left.
 *
 * The counter is the reason this exists: a `maxlength` alone stops a visitor
 * typing and never says why, which reads as the keyboard breaking. The limit
 * is therefore enforced twice on purpose — on the field, so it cannot be
 * exceeded, and in the counter, so the visitor sees it coming — and both take
 * the same number from `questionLimit`.
 *
 * Uncontrolled apart from the count. Nothing on this page reads the text yet
 * (there is no checkout endpoint — see `GetMyReading`), and holding a
 * controlled value here would re-render the whole order form on every
 * keystroke to do it.
 *
 * The label is `sr-only` by default because Figma names these boxes with a
 * placeholder and nothing else — and a placeholder is not a label: it leaves
 * the field unnamed to a screen reader and empties the moment anybody types.
 */
export function CountedField({
  name,
  label,
  placeholder,
  limit,
  required = false,
  rows,
  autoFocusOnMount = false,
  className,
}: {
  name: string;
  label: string;
  placeholder: string;
  limit: number;
  required?: boolean;
  /** Given, a `<textarea>`; otherwise a single-line field. */
  rows?: number;
  /** Takes focus when it mounts, so a section that swaps under the visitor lands them in it. */
  autoFocusOnMount?: boolean;
  className?: string;
}) {
  const id = useId();
  const [used, setUsed] = useState(0);

  /*
    `.field` owns the focus behaviour every input on the site shares; the
    utilities on top of it are the frame's own 2px gold line, its 20px corner
    and the `--color-ink` at 30% she fills the box with.
  */
  const field = cn(
    "field rounded-[clamp(0.5rem,1.04vw,1.25rem)] border-2 border-gold bg-ink/30 px-[1.35em] py-[0.9em] text-left align-top font-light text-note leading-tight",
    className,
  );

  const shared = {
    id,
    name,
    placeholder,
    required,
    maxLength: limit,
    /*
      Only ever true for a field that has just replaced another under the
      visitor's pointer — never on a page load, where taking focus would jump
      them past everything above it.
    */
    autoFocus: autoFocusOnMount,
    onChange: (event: { currentTarget: { value: string } }) => setUsed(event.currentTarget.value.length),
    className: field,
  };

  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      {rows === undefined ? (
        <input type="email" autoComplete="email" {...shared} />
      ) : (
        <textarea rows={rows} {...shared} className={cn(field, "resize-y")} />
      )}

      {/*
        Under the field and hard right, where a counter is looked for. `polite`
        rather than silent so it is available to a screen reader on demand, and
        `tabular-nums` so the number does not shuffle its own width as it grows.
      */}
      <p
        aria-live="polite"
        className="mt-[0.3em] self-end text-fine leading-none tabular-nums font-light text-champagne/60"
      >
        {used}/{limit}
      </p>
    </>
  );
}
