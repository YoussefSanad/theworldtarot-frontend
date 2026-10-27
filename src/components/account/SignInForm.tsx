"use client";

import { useId, useState } from "react";

import { Field, fieldErrorsOf, Panel, Refusal } from "@/components/account/FormPanel";
import { useSignedIn } from "@/components/account/useSignedIn";
import { Button } from "@/components/ui/Button";
import { loginCopy } from "@/content/login";
import { cn } from "@/lib/cn";
import {
  type Customer,
  readSignInFailure,
  requestPasswordLink,
  signIn,
  type SignInFailure,
} from "@/lib/session";

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
/** Which box the form is being drawn in. Spacing and type scale, nothing else. */
export type SignInFormVariant = "page" | "compact";

export function SignInForm({
  onSignedIn,
  variant = "page",
}: {
  /**
   * Called once the session exists, with the customer it belongs to.
   *
   * **The form does not navigate, and must not learn to.** Its two callers want
   * opposite things from a success: the sign in page sends somebody onward by
   * the landing rule, and the masthead's dropdown deliberately stays put,
   * because somebody signing in from the header is already standing where they
   * chose to be. A form that pushed a route would be wrong for one of them
   * whichever route it chose.
   *
   * It also keeps `useSearchParams` out of here, which matters more than it
   * looks: the dropdown is rendered by `SiteHeader`, which is the root layout's
   * chrome on *every* route. A component reading the query string there would
   * either hold every route dynamic under `output: "export"` or need a Suspense
   * boundary in the masthead. Reading `next` belongs to the page, which is the
   * only caller that has one.
   */
  onSignedIn?: (customer: Customer) => void;
  variant?: SignInFormVariant;
}) {
  const { setCustomer } = useSignedIn();
  const fieldId = useId();
  const compact = variant === "compact";

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
        The store is told first, and that is what makes a success arrive
        everywhere at once: `SiteHeader` is rendered by the layout and survives
        a client-side route change, so nothing would make it read `/me` again
        on the other side — and the Viewing Room's paywall, which reads the same
        store, re-decides on the spot without a reload.
      */
      const customer = await signIn({ email, password });
      setCustomer(customer);
      onSignedIn?.(customer);
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
      <Panel bare={compact}>
        <Heading compact={compact}>{loginCopy.forgot.heading}</Heading>
        <p className={cn("text-note text-ash", compact ? "mt-2" : "mt-4")}>
          {loginCopy.forgot.sent}
        </p>
        <Prompt compact={compact} onClick={() => swapTo(false)}>
          {loginCopy.forgot.backPrompt}
        </Prompt>
      </Panel>
    );
  }

  return (
    <Panel bare={compact}>
      <Heading compact={compact}>{copy.heading}</Heading>
      <p className={cn("text-note text-ash", compact ? "mt-2" : "mt-4")}>{copy.intro}</p>

      <form
        className={cn("flex flex-col", compact ? "mt-5 gap-4" : "mt-8 gap-6")}
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

        <Button
          type="submit"
          /* `fluid` is the seam's own way of saying "the caller supplies the
             metrics"; there is no `sm`, and a dropdown wants a full-width
             button rather than `md`'s `w-fit`. */
          size={compact ? "fluid" : "md"}
          className={cn(
            "lowercase",
            compact
              ? "min-h-[44px] w-full justify-center px-[1em] py-[0.4em] text-nav-sm"
              : "self-start",
          )}
          busy={busy}
          busyLabel={copy.busyLabel}
        >
          {copy.submitLabel}
        </Button>
      </form>

      <Refusal compact={compact} failure={failure} wording={(refusal) => failureWording(refusal, asking)} />

      <Prompt compact={compact} onClick={() => swapTo(!asking)}>
        {asking ? loginCopy.forgot.backPrompt : loginCopy.forgotPrompt}
      </Prompt>
    </Panel>
  );
}

/**
 * The panel's own heading.
 *
 * `h1` on the page, where it is the page's subject. `h2` in the dropdown, which
 * hangs off a page that already has an `h1` of its own — a second `h1` in a
 * popover would tell a screen reader the page had changed subject.
 */
function Heading({ compact, children }: { compact: boolean; children: React.ReactNode }) {
  if (compact) {
    /* `text-h3` is the smallest heading step this site defines; there is no
       `h4` token to reach for. */
    return <h2 className="font-display text-h3 text-champagne">{children}</h2>;
  }

  return <h1 className="font-display text-h2 text-champagne">{children}</h1>;
}

/** The quiet control that swaps the panel for the other half of the errand. */
function Prompt({
  compact,
  onClick,
  children,
}: {
  compact: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block cursor-pointer text-note text-champagne underline underline-offset-4 transition-colors hover:text-gold",
        compact ? "mt-4" : "mt-6",
      )}
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
