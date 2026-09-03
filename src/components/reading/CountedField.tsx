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
 * **One field turns it off**, from 3 September 2026 (#71) — the **address
 * confirmation**, which stands directly under a box of the same limit that is
 * already counting. See `counter`.
 *
 * Uncontrolled apart from the count. The checkout button reads the question off
 * the form at the moment it is pressed (see `HostedCheckoutButton`), and holding
 * a controlled value
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
  counter = true,
  type = "email",
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
  /**
   * Whether the allowance is drawn under the field. On by default, because a
   * limit nobody can see is the keyboard breaking.
   *
   * **Off on the address confirmation, and there only** (#71). The counter
   * earns its line by telling a visitor something the field cannot: how much of
   * an allowance they are spending. Under the second of two identical 254
   * boxes it tells them what the first one is already telling them — two
   * `0/254`s under two email fields, one of which is a copy of the other — and
   * charges the panel 24px of a toggle that already grows for saying it twice.
   *
   * The limit is not relaxed by this: `maxLength` is on the field either way,
   * and the box above it is where the number is visible. A field with no
   * counter has nothing to count, so it drops its `onChange` too and goes as
   * uncontrolled as the rest of it already is.
   *
   * `CodeEntry` on `/redeem/` wants the same thing and predates the prop; it
   * draws this component's line by hand and says why beside it.
   */
  counter?: boolean;
  /**
   * What a single-line field holds. Ignored where `rows` is given, a
   * `<textarea>` having no type.
   *
   * `email` is the default because it is what every single-line field on this
   * panel was until the **gift signature** arrived on 3 September 2026, and a
   * default of `text` would have quietly dropped the browser's own address
   * validation off the two that still want it. The signature is the only
   * `text` one: it is a name, and `type="email"` on it would refuse "Mum".
   */
  type?: "email" | "text";
  required?: boolean;
  /** Given, a `<textarea>`; otherwise a single-line field. */
  rows?: number;
  /** Takes focus when it mounts, so a section that swaps under the visitor lands them in it. */
  autoFocusOnMount?: boolean;
  /**
   * Keeps the browser from offering the visitor's own saved details here.
   *
   * ~~For the gift field~~ — **for both of the gift's address fields from 3
   * September 2026** (#71), which have two different reasons for it. The
   * recipient's is where the address wanted is somebody else's and the one
   * Chrome has on file is exactly the wrong answer; the **address
   * confirmation** beside it is where a value the browser filled in has
   * confirmed nothing at all, the whole point of the second box being that the
   * address is typed twice by the person who knows it.
   *
   * Not the **gift signature**, which keeps its autofill: the browser's guess
   * there is the buyer's own name, and unlike their own address that is a
   * reasonable first offer. See the note by `opaqueName`.
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
    and `recipientEmail` — or `addressConfirmation` — is all the excuse it needs to
    prompt the purchaser with their own address, the one address neither of
    those fields wants.

    So the field goes to the browser effectively nameless. What it submits is
    React's opaque id, which carries no hint of what the box is for, and the
    name the app knows the field by moves to `data-field`, where anything
    reading this form can still find it. `useId` renders the same string on
    the server and the client, so this costs no hydration.

    **`data-field` is a contract, not a debugging aid.** `lib/order-note.ts`
    read this form by `name` for the four days after suppression landed and
    found nothing, so every gift order composed no note and was flagged a
    self-purchase; `check:panel` read it the same way and stayed green. Both
    were corrected on 3 September 2026. Anything that reads this form reads
    `data-field`.

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
    /* Only where something reads it — see `counter`. */
    onChange: counter
      ? (event: { currentTarget: { value: string } }) => setUsed(event.currentTarget.value.length)
      : undefined,
    className: field,
  };

  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      {rows === undefined ? (
        /*
          `name` for a signature the browser has no better guess at than the
          buyer's own — which, unlike the recipient's address below it, is a
          reasonable first offer here: the gift may well be from them under
          their own name. It is a first offer and not an answer; "Mum" is what
          the field is labelled for and is typed over the top of it.
        */
        <input
          type={type}
          autoComplete={suppressAutofill ? "off" : type === "email" ? "email" : "name"}
          {...shared}
        />
      ) : (
        <textarea rows={rows} {...shared} className={cn(field, "resize-y")} />
      )}

      {/*
        Under the field and hard right, where a counter is looked for. `polite`
        rather than silent so it is available to a screen reader on demand, and
        `tabular-nums` so the number does not shuffle its own width as it grows.

        Absent rather than hidden where `counter` is off: this line and its
        `mt` are the 24px the address confirmation gives back to the panel, and
        a `sr-only` copy of it would give back nothing.
      */}
      {counter ? (
        <p
          aria-live="polite"
          className="mt-[0.3em] self-end text-fine leading-none tabular-nums font-light text-champagne/60"
        >
          {used}/{limit}
        </p>
      ) : null}
    </>
  );
}
