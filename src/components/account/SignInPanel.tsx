"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { SignInForm } from "@/components/account/SignInForm";
import { useSignedIn } from "@/components/account/useSignedIn";
import { landingFor, readReturnPath } from "@/lib/return-path";
import type { Customer } from "@/lib/session";

/**
 * The sign in page's form, and the one thing the page knows that the dropdown
 * does not: where the visitor was trying to get to.
 *
 * A client component of its own rather than logic in `page.tsx`, because
 * reading the query string is client-only under a static export and the route
 * holds it behind a `Suspense` boundary. `SignInForm` itself stays free of
 * `useSearchParams` on purpose — it is rendered in the masthead on every route,
 * where that hook would cost either a dynamic route or a boundary in the
 * header. See its `onSignedIn` docblock.
 *
 * **Who lands where** is `lib/return-path.ts`'s, not this component's: a usable
 * `next` wins, then a pass holder goes to the Viewing Room, then the homepage.
 */
export function SignInPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customer } = useSignedIn();

  const next = readReturnPath(searchParams.get("next"));

  /*
    **Already signed in, and somebody sent them here to get somewhere.**

    Only with a `next`. A bare `/login/` while signed in is somebody who
    reached for the masthead deliberately, and the only reason to do that is to
    become a different person — so they get the form, not a bounce to a page
    they did not ask for.

    `replace` rather than `push`: this page was a step on the way and should not
    be something Back returns them to.

    `customer` is `undefined` until `/me` answers, which is why this is an
    effect and not a render-time redirect. The form shows during that beat. No
    spinner, for `useSignedIn`'s own reason — a visitor can act on a form and
    cannot act on a spinner.
  */
  useEffect(() => {
    if (customer && next) router.replace(next);
  }, [customer, next, router]);

  function onSignedIn(signedIn: Customer) {
    router.push(next ?? landingFor(signedIn));
  }

  return <SignInForm onSignedIn={onSignedIn} />;
}
