/**
 * The column, the field, and the refusal the account forms are drawn from.
 *
 * Lifted out of `PasswordForm` when the sign in page arrived and wanted the
 * same box, the same label treatment and the same field-keyed error rendering,
 * with an email in it as well as a password. Two copies of a bordered input
 * would have drifted the first time one of them was tuned.
 *
 * **That first lift took the inputs and left the failure behind**, so both
 * forms went on carrying the same split of a field-keyed refusal from a
 * whole-form one and the same `role="alert"` paragraph under the submit.
 * `fieldErrorsOf` and `Refusal` are the other half of the same extraction.
 *
 * No `"use client"` of its own: it is only ever imported by a client component,
 * and a boundary is declared where the interactivity starts rather than at
 * every leaf below it.
 */

import type { PasswordFailure } from "@/lib/passwords";
import type { SignInFailure } from "@/lib/session";

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

/**
 * A refusal either account form can be holding.
 *
 * **Both unions are the same shape.** `SignInFailure` and `PasswordFailure`
 * share three arms and differ only in the name of the fourth, `refused` against
 * `link`, which is why `readSignInFailure` maps one onto the other by renaming
 * a single arm. Nothing below needs to know which union it has, only whether
 * the arm it holds is the field-keyed one.
 *
 * **Named as both real unions rather than as `{ kind: string }`**, which was
 * the first shape here and was a mistake: it made the read below an unchecked
 * assertion, so renaming the `fields` arm or letting its `errors` go undefined
 * would have compiled and silently dropped every field message. Types only, so
 * this costs no import at runtime and no cycle: `lib` never reaches back here.
 */
type AccountFailure = PasswordFailure | SignInFailure;

/**
 * What the backend said about each field, for the `Field`s that name them.
 *
 * Answers an empty record for every other arm, so a form reads
 * `fieldErrors.password` without first asking which kind of failure it has.
 */
export function fieldErrorsOf(failure: AccountFailure | null): Record<string, string[]> {
  return failure?.kind === "fields" ? failure.errors : {};
}

/**
 * What the backend said about the form rather than about one field.
 *
 * **The sentences stay with each page and the rule stays here.** A dead claim
 * link and a refused sign in read as nothing alike to a person, and one of the
 * sign in page's sentences depends on which half of its panel is on screen, so
 * this takes a function rather than a copy object. What it owns is the part
 * both pages must not get wrong: a field-keyed failure is answered beside the
 * input that names it and never a second time down here, which is why `wording`
 * is never called for that arm.
 */
export function Refusal<F extends AccountFailure>({
  failure,
  wording,
}: {
  failure: F | null;
  wording: (failure: F) => string;
}) {
  if (failure === null || failure.kind === "fields") return null;

  return (
    <p role="alert" className="mt-6 text-note text-ash">
      {wording(failure)}
    </p>
  );
}
