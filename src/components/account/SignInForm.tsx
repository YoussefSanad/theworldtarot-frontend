"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Field, fieldErrorsOf, Panel, Refusal } from "@/components/account/FormPanel";
import { useSignedIn } from "@/components/account/useSignedIn";
import { Button } from "@/components/ui/Button";
import { afterSignIn, loginCopy } from "@/content/login";
import { readSignInFailure, requestPasswordLink, signIn, type SignInFailure } from "@/lib/session";

/**
 * Signing in, and asking for a link when that is not possible yet.
 *
 * **The two forms are one component and one email field**, because they are two
 * halves of the same errand: everybody who needs the second has just failed the
 * first, and has already typed the address it wants. Swapping the panel rather
 * than stacking two forms also means there is only ever one submit on screen,
 * so the browser cannot aim a return key at the wrong one.
 *
 * The **refusal is deliberately vague** and the wording is in `login.ts` with
 * the reason. Nothing here may narrow it: the backend answers a wrong password,
 * an unknown address and an unclaimed account identically, and a form that
 * separated them would answer a question about a customer that the API refuses
 * to.
 */
export function SignInForm() {
  const router = useRouter();
  const { setCustomer } = useSignedIn();
  const fieldId = useId();

  const [asking, setAsking] = useState(false);
  /* Shared across the swap. Somebody who has just been refused should not have
     to type their address a second time to ask for a link to it. */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState<SignInFailure | null>(null);
  const [asked, setAsked] = useState(false);
  const [busy, setBusy] = useState(false);

  function swapTo(next: boolean) {
    setAsking(next);
    setFailure(null);
    setAsked(false);
  }

  async function onSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setFailure(null);

    try {
      /*
        The header is told before the navigation, not after: `SiteHeader` is
        rendered by the layout and survives a client-side route change, so
        nothing would make it read `/me` again on the other side.
      */
      setCustomer(await signIn({ email, password }));
      router.push(afterSignIn);
    } catch (cause: unknown) {
      setFailure(readSignInFailure(cause));
      setBusy(false);
    }
  }

  async function onAskForLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setFailure(null);

    try {
      await requestPasswordLink(email);
      setAsked(true);
    } catch (cause: unknown) {
      setFailure(readSignInFailure(cause));
    } finally {
      setBusy(false);
    }
  }

  const copy = asking ? loginCopy.forgot : loginCopy;
  // Only the password can carry a field-keyed message here. Everything else the
  // backend keys in a 422 on this road is the vague refusal.
  const fieldErrors = fieldErrorsOf(failure);

  if (asking && asked) {
    return (
      <Panel>
        <h1 className="font-display text-h2 text-champagne">{loginCopy.forgot.heading}</h1>
        <p className="mt-4 text-note text-ash">{loginCopy.forgot.sent}</p>
        <Prompt onClick={() => swapTo(false)}>{loginCopy.forgot.backPrompt}</Prompt>
      </Panel>
    );
  }

  return (
    <Panel>
      <h1 className="font-display text-h2 text-champagne">{copy.heading}</h1>
      <p className="mt-4 text-note text-ash">{copy.intro}</p>

      <form
        className="mt-8 flex flex-col gap-6"
        onSubmit={asking ? onAskForLink : onSignIn}
        noValidate
      >
        <Field
          id={`${fieldId}-email`}
          label={copy.emailLabel}
          type="email"
          /* The backend's column, and the longest address it will store. */
          maxLength={255}
          value={email}
          onChange={setEmail}
          autoComplete="username"
          errors={fieldErrors.email}
        />

        {asking ? null : (
          <Field
            id={`${fieldId}-password`}
            label={loginCopy.passwordLabel}
            type="password"
            maxLength={72}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            errors={fieldErrors.password}
          />
        )}

        <Button type="submit" size="md" disabled={busy} className="self-start lowercase">
          {busy ? copy.busyLabel : copy.submitLabel}
        </Button>
      </form>

      <Refusal failure={failure} wording={(refusal) => failureWording(refusal, asking)} />

      <Prompt onClick={() => swapTo(!asking)}>
        {asking ? loginCopy.forgot.backPrompt : loginCopy.forgotPrompt}
      </Prompt>
    </Panel>
  );
}

/** The quiet control that swaps the panel for the other half of the errand. */
function Prompt({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 block text-note text-champagne underline underline-offset-4 transition-colors hover:text-gold"
    >
      {children}
    </button>
  );
}

/**
 * What a person reads for a failure that is not about one field.
 *
 * A 429 says how long to wait when the API said, and stays vague when it did
 * not — `Retry-After` is absent often enough that a sentence built around it
 * has to read properly without it.
 */
function failureWording(failure: SignInFailure, asking: boolean): string {
  const copy = asking ? loginCopy.forgot : loginCopy;

  if (failure.kind === "rate-limited") {
    const seconds = failure.retryAfterSeconds;

    return seconds === undefined || seconds <= 0
      ? copy.rateLimitedBriefly
      : copy.rateLimited.replace("{wait}", describeWait(seconds));
  }

  if (failure.kind === "unknown") return copy.unknownFailure;

  /*
    Asking for a link cannot be refused *for the address it names* — there is no
    `exists` rule on that endpoint — but it can still be refused for the address
    being unusable, and `noValidate` on the form above means the browser does not
    catch that first. `readSignInFailure` reads any 422 not keyed to `password`
    as `refused`, so without this arm a mistyped address printed the sign in's
    sentence on a panel with no password field, telling somebody to ask for the
    link they had just asked for.
  */
  if (asking) return loginCopy.forgot.invalidAddress;

  return loginCopy.refused;
}

/** Seconds as something a person would say. Rounded up: never early. */
function describeWait(seconds: number): string {
  const whole = Math.ceil(seconds);

  if (whole < 60) return whole === 1 ? "a second" : `${whole} seconds`;

  const minutes = Math.ceil(whole / 60);

  return minutes === 1 ? "a minute" : `${minutes} minutes`;
}
