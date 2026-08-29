/**
 * The column and the field the account forms are drawn in.
 *
 * Lifted out of `PasswordForm` when the sign in page arrived and wanted the
 * same box, the same label treatment and the same field-keyed error rendering,
 * with an email in it as well as a password. Two copies of a bordered input
 * would have drifted the first time one of them was tuned.
 *
 * No `"use client"` of its own: it is only ever imported by a client component,
 * and a boundary is declared where the interactivity starts rather than at
 * every leaf below it.
 */

/** The narrow centred column both account pages are laid out in. */
export function Panel({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto w-full max-w-[36.25rem] px-6 py-24">{children}</section>;
}

/**
 * One labelled input and, when the backend named this field, what it said about
 * it.
 *
 * `errors` is the array the API sent for this field name, so a rule failure
 * lands against the field it names rather than in a summary above the form.
 */
export function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  maxLength,
  errors,
}: {
  id: string;
  label: string;
  type: "email" | "password";
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  /**
   * The backend's own ceiling for this field — 72 for a password, which is
   * bcrypt's, and 255 for an address. Passed rather than assumed, because a
   * field silently truncating what somebody typed is a refusal they cannot see
   * the cause of.
   */
  maxLength: number;
  errors: string[] | undefined;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-note text-ash">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required
        maxLength={maxLength}
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? errorId : undefined}
        className="field px-3 py-2 text-note"
      />
      {errors ? (
        <p id={errorId} className="text-fine text-champagne">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
