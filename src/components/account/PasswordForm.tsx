"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import { Field, fieldErrorsOf, Panel, Refusal } from "@/components/account/FormPanel";
import { Button } from "@/components/ui/Button";
import { signInPath } from "@/content/login";
import {
  type PasswordPageCopy,
  resetPasswordCopy,
  setPasswordCopy,
} from "@/content/passwords";
import {
  claimAccount,
  type PasswordFailure,
  type PasswordSubmission,
  readPasswordFailure,
  resetPassword,
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
  claim: { copy: setPasswordCopy, submit: claimAccount },
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
  const fieldErrors = fieldErrorsOf(failure);

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
          type="password"
          maxLength={72}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          errors={fieldErrors.password}
        />

        <Field
          id={`${fieldId}-confirmation`}
          label={copy.confirmLabel}
          type="password"
          maxLength={72}
          value={passwordConfirmation}
          onChange={setPasswordConfirmation}
          autoComplete="new-password"
          errors={fieldErrors.password_confirmation}
        />

        <Button type="submit" size="md" disabled={busy} className="self-start lowercase">
          {busy ? copy.busyLabel : copy.submitLabel}
        </Button>
      </form>

      <Refusal failure={failure} wording={(refusal) => failureWording(refusal, copy)} />

      {/*
        Only for a dead link. The other two failures are answered by trying
        again on this page, and a way off it would be the wrong offer.
      */}
      {failure?.kind === "link" ? (
        <Link
          href={signInPath}
          className="mt-4 inline-block text-note text-champagne underline underline-offset-4 transition-colors hover:text-gold"
        >
          {copy.signInPrompt}
        </Link>
      ) : null}
    </Panel>
  );
}

/**
 * What a person reads for a failure that is not about one field.
 *
 * Three sentences from this page's own copy rather than the backend's message,
 * and `link` is the one that carries the whole point: a used token, an expired
 * one, a malformed one and an account somebody has already claimed all arrive
 * here as one arm, and naming which would turn the page into a way to ask
 * whether an address has an account. See `readPasswordFailure`.
 */
function failureWording(failure: PasswordFailure, copy: PasswordPageCopy): string {
  if (failure.kind === "link") return copy.linkFailure;
  if (failure.kind === "rate-limited") return copy.rateLimited;

  return copy.unknownFailure;
}
