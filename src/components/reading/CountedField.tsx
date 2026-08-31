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
 * Uncontrolled apart from the count. Buy Now reads the question off the form
 * at the moment it is pressed (see `BuyNow`), and holding a controlled value
 * here would re-render the whole order form on every keystroke to save it the
 * trouble.
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
  suppressAutofill = false,
  defaultValue,
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
  /**
   * Keeps the browser from offering the visitor's own saved details here.
   *
   * For the gift field, where the address wanted is somebody else's and the
   * one Chrome has on file is exactly the wrong answer. See the note by
   * `opaqueName`.
   */
  suppressAutofill?: boolean;
  /**
   * What the field starts with. Uncontrolled still: this is the mounting
   * value, applied once, and the visitor owns it from then on.
   *
   * It arrives after the first render — a question restored from a cancelled
   * checkout is read out of storage, which the build has none of — so the
   * caller remounts this field rather than changing the prop under it, which a
   * `defaultValue` would ignore. See `ReadingOrder`.
   */
  defaultValue?: string;
  className?: string;
}) {
  const id = useId();
  // Started from the value rather than at zero, or a restored question would
  // sit above a counter reading 0/500.
  const [used, setUsed] = useState(defaultValue?.length ?? 0);

  /*
    `.field` owns the focus behaviour every input on the site shares; the
    utilities on top of it are the frame's own 2px gold line, its 20px corner
    and the `--color-ink` at 30% she fills the box with.
  */
  const field = cn(
    "field rounded-[clamp(0.5rem,1.04vw,1.25rem)] border-2 border-gold bg-ink/30 px-[1.35em] py-[0.9em] text-left align-top font-light text-note leading-tight",
    className,
  );

  /*
    Chrome does not take `autocomplete="off"` at its word on a box it has
    already decided is an email field: it classifies by name and id as well,
    and `recipientEmail` is all the excuse it needs to prompt the purchaser
    with their own address — the one address this field does not want.

    So the field goes to the browser effectively nameless. What it submits is
    React's opaque id, which carries no hint of what the box is for, and the
    name the app knows the field by moves to `data-field`, where anything
    reading this form can still find it. `useId` renders the same string on
    the server and the client, so this costs no hydration.

    The rest is the same suppression said in the other dialects the visitor
    might have installed: `data-1p-ignore` for 1Password, `data-lpignore` for
    LastPass, `data-form-type` for Dashlane and Bitwarden.
  */
  const opaqueName = `f${id.replace(/[^a-zA-Z0-9]/g, "")}`;

  const shared = {
    id,
    name: suppressAutofill ? opaqueName : name,
    "data-field": name,
    ...(suppressAutofill
      ? { "data-1p-ignore": true, "data-lpignore": "true", "data-form-type": "other" }
      : null),
    placeholder,
    required,
    defaultValue,
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
        <input type="email" autoComplete={suppressAutofill ? "off" : "email"} {...shared} />
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
