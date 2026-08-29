"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { checkoutCompleteCopy } from "@/content/checkout";
import { checkoutFor } from "@/lib/checkout-session";
import { fetchPaymentStatus } from "@/lib/orders";
import { isRecognisedStatus, outcomeFor, type PaymentOutcome } from "@/lib/payment-outcome";
import { formatPrice, type Money } from "@/lib/price";

/**
 * The **confirmation**: where a paid-for checkout lands on its way back from the
 * **hosted page**.
 *
 * ## It reports a payment, never a fulfilment
 *
 * There is no endpoint that reads an **order** back, and this screen does not
 * want one. It says what Stripe says about the payment, by way of our own
 * backend. Only the backend **settles** an order, on a verified webhook, and
 * that has quite possibly not happened while this is on screen — so nothing
 * here claims a reading has been sent. See `CONTEXT.md`.
 *
 * ## Why it no longer asks Stripe
 *
 * Stripe used to put `payment_intent_client_secret` in the return URL, and a
 * client secret is a bearer credential scoped to one intent — which is why
 * `retrievePaymentIntent` worked with a publishable key. `success_url` gives
 * `{CHECKOUT_SESSION_ID}` instead. That is an **opaque id**: retrieving a
 * Session is a secret-key call and Stripe.js has no client-side equivalent. The
 * browser lands holding a string it cannot resolve, so the only party that can
 * answer is our own backend — `POST /orders/status`, which takes the **pay
 * token** out of the record and never the id out of the address.
 *
 * ## It paints first and verifies second
 *
 * `success_url` is reached only after Stripe has taken the payment; a declined
 * card keeps the customer on Stripe's page to retry. So where the address
 * carries a `session_id` **and** the tab holds the matching record, this paints
 * `received` with the Money at once and verifies in the background, correcting
 * only on disagreement. **There is no spinner in front of a payment that has
 * already happened.**
 *
 * An address with neither falls to `unknown`, which is also where a customer
 * lands whose tab lost the record — a browser with storage off, or a link
 * opened somewhere else. `unknownBody` is written for exactly that: the receipt
 * is the record that counts.
 *
 * ## It verifies once and does not poll, and this diverges from the contract
 *
 * `API_CONTRACT.md` says of `POST /orders/status`: *"This is a poll, so poll it
 * politely."* **This screen does not poll, and that is a decision rather than an
 * oversight.** The contract's advice is written for a screen that starts at "we
 * do not know". This one starts at `received`, so a poll could only confirm
 * what is already on screen or mutate a message underneath somebody reading it,
 * and the **receipt** is already the channel for fulfilment.
 *
 * **On a 503, or a status this build has never heard of, the optimistic paint
 * stands.** That is the contract's "we do not know yet" arriving at a screen
 * that already has something honest to show; replacing `received` with a hedge
 * on the strength of not knowing would be the worst of both.
 *
 * ## The stale-result guard
 *
 * The Session id is what stops a second purchase in the same tab from landing
 * on the first one's result. A second purchase overwrites the record, so a
 * record naming a different Session than the address does describes some other
 * purchase, and none of it may be shown. The guard is `checkoutFor` in
 * `lib/checkout-session.ts`: this screen asks for the record that applies to
 * the payment it is displaying and is handed nothing when none does.
 *
 * ## Reload is safe
 *
 * The record is not erased when this renders. sessionStorage dies with the tab,
 * not with the screen, and the query string survives a reload on its own. Both
 * halves are still there, so a reload says the same thing.
 */

/** What we are looking at, once we know. */
type Result =
  | { state: "checking" }
  /**
   * No Session in the address, or no record for the one that is there. Nothing
   * to show, and nothing to confirm.
   *
   * There is no `error` state on this road. The screen never asks a question it
   * has no honest answer to: it either has the record — in which case the money
   * moved and it says so — or it has nothing, which is what this is. The
   * wallet road, which retrieves an intent from Stripe and can be refused, is
   * what `errorHeading` and `errorBody` are still in `content/checkout.ts` for.
   */
  | { state: "unknown" }
  | { state: "known"; outcome: PaymentOutcome; money: Money | null };

export function CheckoutComplete() {
  const searchParams = useSearchParams();
  /*
    Read once into a plain string rather than passing the params object to the
    effect: `useSearchParams` returns a new object per render, which would
    re-run the verification — and each run is a request.
  */
  const sessionId = searchParams.get("session_id");

  const [result, setResult] = useState<Result>({ state: "checking" });

  useEffect(() => {
    let live = true;

    /*
      Everything happens inside this one pass, including the two answers that
      need no network.

      Storage is read here rather than during render because this is a static
      export: the HTML is built on a machine with no sessionStorage, so reading
      it in the render body would both fail the build and hydrate a page whose
      first paint disagrees with its second. It is still read before anything is
      awaited, so `received` is painted without a request standing between the
      customer and it.
    */
    void (async () => {
      const record = checkoutFor(sessionId);

      if (!record) {
        if (live) setResult({ state: "unknown" });
        return;
      }

      setResult({ state: "known", outcome: "received", money: record.money });

      try {
        const status = await fetchPaymentStatus(record.payToken);

        if (!live) return;

        /*
          Two answers that are not corrections. A status this build has never
          heard of is the contract's own "we do not know yet", and `received`
          is what is already on screen — so both leave it alone rather than
          replacing something true with a hedge.
        */
        if (!isRecognisedStatus(status)) return;

        const outcome = outcomeFor(status);

        if (outcome === "received") return;

        setResult({ state: "known", outcome, money: record.money });
      } catch {
        /*
          A 503 — Stripe unreachable from the backend — or a network failure
          here. Both say exactly nothing about the payment, and the payment is
          one Stripe had already taken before it sent the customer to this
          address. The paint stands.
        */
      }
    })();

    return () => {
      live = false;
    };
  }, [sessionId]);

  if (result.state === "checking") {
    return (
      <Panel>
        <h1 className="font-display text-h2 text-champagne">{checkoutCompleteCopy.checkingHeading}</h1>
      </Panel>
    );
  }

  if (result.state === "unknown") {
    return (
      <Panel>
        <h1 className="font-display text-h2 text-champagne">{checkoutCompleteCopy.unknownHeading}</h1>
        <p className="mt-4 text-note text-ash">{checkoutCompleteCopy.unknownBody}</p>
        <Back />
      </Panel>
    );
  }

  const copy = checkoutCompleteCopy.outcomes[result.outcome];

  return (
    <Panel>
      <h1 className="font-display text-h2 text-champagne">{copy.heading}</h1>

      {result.money ? (
        <p className="mt-6 text-note text-ash">
          {copy.amountLabel}{" "}
          <span className="text-champagne">{formatPrice(result.money)}</span>
        </p>
      ) : null}

      <p className="mt-4 text-note text-ash">{copy.body}</p>

      <Back />
    </Panel>
  );
}

function Back() {
  return (
    <ButtonLink href={checkoutCompleteCopy.backHref} variant="ghost" size="md" className="mt-8 lowercase">
      {checkoutCompleteCopy.backLabel}
    </ButtonLink>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  /*
    The same measure and rhythm as the password pages, which are the site's
    other two standalone one-column pages reached from outside.
  */
  return (
    <section className="mx-auto w-full max-w-[36.25rem] px-6 py-24" aria-live="polite">
      {children}
    </section>
  );
}
