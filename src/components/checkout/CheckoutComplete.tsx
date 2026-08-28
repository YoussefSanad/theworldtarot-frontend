"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { checkoutCompleteCopy } from "@/content/checkout";
import { paymentIntentId, recallCheckout } from "@/lib/checkout-session";
import { outcomeFor, type PaymentOutcome } from "@/lib/payment-outcome";
import { formatPrice, type Money } from "@/lib/price";
import { getStripe } from "@/lib/stripe";

/**
 * The **confirmation**: where every payment path lands, and the return address a
 * card's 3D Secure challenge is given.
 *
 * ## It reports a payment, never a fulfilment
 *
 * There is no endpoint that reads an **order** back, and this screen does not
 * want one. It asks Stripe about the PaymentIntent with the publishable key
 * alone and says what Stripe says. Only the backend **settles** an order, on a
 * verified webhook, and that has quite possibly not happened while this is on
 * screen — so nothing here claims a reading has been sent. See `CONTEXT.md`.
 *
 * ## Two ways in, one screen
 *
 * A redirect return (3D Secure, and any method that leaves the page) comes back
 * with `payment_intent` and `payment_intent_client_secret` in the query string,
 * put there by Stripe. An in-place wallet payment never leaves the page and so
 * has no query string at all; it arrives with the record `rememberCheckout`
 * wrote before it confirmed. The URL wins where both exist, because it is the
 * payment the browser has just come back from.
 *
 * **The pay token is in neither URL.** It is a credential and lives only in the
 * record; nothing on this screen reads it.
 *
 * ## The stale-result guard
 *
 * The intent id is what stops a second purchase in the same tab from landing on
 * the first one's result. A second purchase overwrites the record, so a
 * session-only arrival is always the newest payment; and if the URL names one
 * intent while the record holds another — back-button onto an old confirmation,
 * mid-way through a fresh purchase — the record is discarded rather than
 * mixed in. What is displayed then comes wholly from the intent the URL names.
 *
 * ## Reload is safe
 *
 * The record is not erased when this renders. sessionStorage dies with the tab,
 * not with the screen, and a redirect return's query string survives a reload
 * on its own. Both paths retrieve the intent again and get the same answer, or
 * a better one if the payment has since moved on.
 */

/** What we are looking at, once we know. */
type Result =
  | { state: "checking" }
  /** No intent id anywhere: nothing to look up, and nothing to confirm. */
  | { state: "unknown" }
  /** Stripe refused the retrieval. Says nothing about whether money moved. */
  | { state: "error" }
  | { state: "known"; outcome: PaymentOutcome; money: Money | null };

export function CheckoutComplete() {
  const searchParams = useSearchParams();
  /*
    Read once into a plain string rather than passing the params object to the
    effect: `useSearchParams` returns a new object per render, which would
    re-run the retrieval — and each run is a network request to Stripe.
  */
  const urlSecret = searchParams.get("payment_intent_client_secret");
  const urlIntent = searchParams.get("payment_intent");

  const [result, setResult] = useState<Result>({ state: "checking" });

  useEffect(() => {
    let live = true;

    /*
      Everything happens inside this one async pass, including the cases that
      need no network. Storage is read here rather than during render because
      this is a static export: the HTML is built on a machine with no
      sessionStorage, so reading it in the render body would both fail the build
      and hydrate a page whose first paint disagrees with its second.
    */
    void (async () => {
      const record = recallCheckout();

      // The URL's own id, when Stripe put one there; otherwise the record's,
      // derived from the secret so the two can never disagree.
      const intentId = urlIntent ?? (record ? paymentIntentId(record.clientSecret) : null);
      const clientSecret = urlSecret ?? record?.clientSecret ?? null;

      if (!clientSecret || !intentId) {
        if (live) setResult({ state: "unknown" });
        return;
      }

      /*
        The guard. A record that names a different payment than the one being
        displayed describes some other purchase — almost always a newer one,
        made in this tab after the customer navigated back here — and none of it
        may be shown against this intent.
      */
      const recordApplies = record !== null && paymentIntentId(record.clientSecret) === intentId;

      const stripe = await getStripe();

      // No publishable key, or js.stripe.com unreachable. There is nothing
      // honest to say about the payment, which is what `error` says.
      if (!stripe) {
        if (live) setResult({ state: "error" });
        return;
      }

      const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

      if (!live) return;

      if (!paymentIntent) {
        setResult({ state: "error" });
        return;
      }

      setResult({
        state: "known",
        outcome: outcomeFor(paymentIntent.status),
        /*
          The intent's own amount first, because it is the payment being
          reported and cannot be the wrong purchase's money. The record is the
          fallback for a retrieval that came back without one, and only when it
          passes the id guard — a restated amount from the wrong purchase would
          be worse than no amount at all.
        */
        money:
          typeof paymentIntent.amount === "number"
            ? { currency: paymentIntent.currency.toUpperCase(), amount: paymentIntent.amount }
            : recordApplies
              ? record.money
              : null,
      });
    })();

    return () => {
      live = false;
    };
  }, [urlSecret, urlIntent]);

  if (result.state === "checking") {
    return (
      <Panel>
        <h1 className="font-display text-h2 text-champagne">{checkoutCompleteCopy.checkingHeading}</h1>
      </Panel>
    );
  }

  if (result.state === "unknown" || result.state === "error") {
    const unknown = result.state === "unknown";

    return (
      <Panel>
        <h1 className="font-display text-h2 text-champagne">
          {unknown ? checkoutCompleteCopy.unknownHeading : checkoutCompleteCopy.errorHeading}
        </h1>
        <p className="mt-4 text-note text-ash">
          {unknown ? checkoutCompleteCopy.unknownBody : checkoutCompleteCopy.errorBody}
        </p>
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
