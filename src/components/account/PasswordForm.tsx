"use client";

import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  type PasswordPageCopy,
  resetPasswordCopy,
  setPasswordCopy,
} from "@/content/passwords";
import {
  type PasswordFailure,
  type PasswordSubmission,
  readPasswordFailure,
  resetPassword,
  setPassword,
} from "@/lib/passwords";

/**
 * The form both password pages are made of.
 *
 * One component and two sets of words, rather than one page with a mode: the
 * pages differ in every string a person reads and in nothing else, so both
 * halves of the difference — the words and the endpoint — hang off one `flow`.
 *
 * **`flow` is a name rather than the function to call.** A route file is a
 * server component and cannot hand a client one a function; a build cut on 28
 * August 2026 failed on exactly that. It makes no `fetch` of its own either:
 * the CSRF handshake belongs to the write seam and is not worth a second
 * implementation here.
 *
 * `token` and `email` are read from the query string and never shown or edited.
 * They are the link, not the form: an email a person could change would just be
 * a way to aim a token at another address, and the backend would refuse it.
 */
/** Which of the two pages this is. Claiming an account, or resetting one. */
export type PasswordFlow = "claim" | "reset";

const FLOW: Record<
  PasswordFlow,
  { copy: PasswordPageCopy; submit: (submission: PasswordSubmission) => Promise<void> }
> = {
  claim: { copy: setPasswordCopy, submit: setPassword },
  reset: { copy: resetPasswordCopy, submit: resetPassword },
};

export function PasswordForm({ flow }: { flow: PasswordFlow }) {
  const { copy, submit } = FLOW[flow];
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const fieldId = useId();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [failure, setFailure] = useState<PasswordFailure | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  /*
    A link missing either half is dead before anything is typed, and it reads as
    the same dead link as an expired one. Held as state rather than checked at
    render so the page still draws its own words above a form nobody can use.
  */
  const linkIsIncomplete = token === "" || email === "";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    if (linkIsIncomplete) {
      setFailure({ kind: "link" });
      return;
    }

    setBusy(true);
    setFailure(null);

    try {
      await submit({ token, email, password, passwordConfirmation });
      setDone(true);
    } catch (cause: unknown) {
      setFailure(readPasswordFailure(cause));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Panel>
        <h1 className="font-display text-h2 text-champagne">{copy.successHeading}</h1>
        <p className="mt-4 text-note text-ash">{copy.successBody}</p>
      </Panel>
    );
  }

  // Only the password fields carry a field-keyed message. Everything else the
  // backend can key in a 422 came from the token check, and `readPasswordFailure`
  // has already collapsed it into `link`.
  const fieldErrors = failure?.kind === "fields" ? failure.errors : {};

  return (
    <Panel>
      <h1 className="font-display text-h2 text-champagne">{copy.heading}</h1>
      <p className="mt-4 text-note text-ash">{copy.intro}</p>

      <form className="mt-8 flex flex-col gap-6" onSubmit={onSubmit} noValidate>
        {/*
          Invisible, and here for password managers: without a username beside
          the new password they offer to save an entry with no account on it.
        */}
        <input type="text" name="email" value={email} autoComplete="username" readOnly hidden />

        <Field
          id={`${fieldId}-password`}
          label={copy.passwordLabel}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          errors={fieldErrors.password}
        />

        <Field
          id={`${fieldId}-confirmation`}
          label={copy.confirmLabel}
          value={passwordConfirmation}
          onChange={setPasswordConfirmation}
          autoComplete="new-password"
          errors={fieldErrors.password_confirmation}
        />

        <Button type="submit" size="md" disabled={busy} className="self-start lowercase">
          {busy ? copy.busyLabel : copy.submitLabel}
        </Button>
      </form>

      {failure && failure.kind !== "fields" ? (
        <p role="alert" className="mt-6 text-note text-ash">
          {failure.kind === "link"
            ? copy.linkFailure
            : failure.kind === "rate-limited"
              ? copy.rateLimited
              : copy.unknownFailure}
        </p>
      ) : null}
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto w-full max-w-[36.25rem] px-6 py-24">{children}</section>;
}

function Field({
  id,
  label,
  value,
  onChange,
  autoComplete,
  errors,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
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
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required
        /* The backend's own ceiling for a hashed password. */
        maxLength={72}
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
