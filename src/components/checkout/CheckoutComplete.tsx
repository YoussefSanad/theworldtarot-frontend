"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { checkoutCompleteCopy } from "@/content/checkout";
import { checkoutFor, forgetQuestion, walletCheckoutFor } from "@/lib/checkout-session";
import { fetchPaymentStatus } from "@/lib/orders";
import { isRecognisedStatus, outcomeFor, type PaymentOutcome } from "@/lib/payment-outcome";
import { formatPrice, type Money } from "@/lib/price";

/**
 * The **confirmation**: where a paid-for checkout lands, by either road.
 *
 * ## Two roads arrive here, and they are told apart by the address
 *
 * The card road returns from Stripe's **hosted page** with `session_id` in the
 * address and a record holding a Session id. The wallet road returns from
 * `stripe.confirmPayment` — from 3D Secure, or straight away — with
 * `payment_intent` in the address and a record holding a client secret. Each
 * has its own guard in `lib/checkout-session.ts`, and each refuses the other's
 * record, so neither branch has to know the other exists.
 *
 * **They do not paint the same way, and that is the whole of the difference.**
 * See below.
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
 * ## The card road paints first and verifies second
 *
 * `success_url` is reached only after Stripe has taken the payment; a declined
 * card keeps the customer on Stripe's page to retry. So where the address
 * carries a `session_id` **and** the tab holds the matching record, this paints
 * `received` with the Money at once and verifies in the background, correcting
 * only on disagreement. **There is no spinner in front of a payment that has
 * already happened.**
 *
 * ## The wallet road may not, and this is the one asymmetry on this screen
 *
 * `return_url` is reached **whatever happened**. Stripe sends the browser there
 * on a declined wallet card and on an abandoned 3D Secure step exactly as it
 * does on a success, with `redirect_status` naming which — so a customer can
 * genuinely arrive here having failed. Painting `received` first on this road
 * would show a green tick to somebody who was never charged, which is the one
 * thing a payment surface may never do, and taking it back a second later is
 * worse rather than better.
 *
 * So this road **asks before it says anything**: `checking` until the backend
 * answers, then the outcome it gave. `redirect_status` in the address is not
 * what it reads — that is Stripe telling the browser what happened, and this
 * screen already has a channel to our own backend, which is the party that
 * settles the order and the only one it trusts about money.
 *
 * **And a failure to reach that answer is a hedge here, not a paint.** Where
 * the card road stands its ground on a 503 — it has something true on screen
 * already — this road has nothing true to stand on, so it says so:
 * `errorHeading` and `errorBody`, which have been in `content/checkout.ts`
 * waiting for exactly this road.
 *
 * An address with neither id falls to `unknown`, which is also where a customer
 * lands whose tab lost the record — a browser with storage off, or a link
 * opened somewhere else. `unknownBody` is written for exactly that: the receipt
 * is the record that counts.
 *
 * ## It verifies once and does not poll, and this diverges from the contract
 *
 * `API_CONTRACT.md` says of `POST /orders/status`: *"This is a poll, so poll it
 * politely."* **This screen does not poll, and that is a decision rather than an
 * oversight.** The contract's advice is written for a screen that starts at "we
 * do not know". The **card** road does not: it starts at `received`, so a poll
 * could only confirm what is already on screen or mutate a message underneath
 * somebody reading it, and the **receipt** is already the channel for
 * fulfilment.
 *
 * **That argument does not cover the wallet road, and saying so is the point of
 * this paragraph.** ~~This one starts at `received`~~ — that road starts at
 * exactly the "we do not know" the contract is written for, which is the whole
 * reason it paints nothing until the backend answers. So a `processing`, a
 * `requires_action` or a status this build has never heard of becomes a
 * terminal screen there with no second look, and the contract's advice applies
 * to it unanswered.
 *
 * It ships that way rather than being fixed quietly, because the fix is a
 * judgement about what a customer should watch change under them and not a
 * detail: all three of those screens are honest and actionable as they stand —
 * `pending` says a mail will come, `unfinished` says to start again — so this is
 * a screen that could be better rather than one that is wrong. Recorded on #48
 * at review, 29 August 2026.
 *
 * **On a 503, or a status this build has never heard of, the optimistic paint
 * stands** — on the card road, which is the only road that has one. That is the
 * contract's "we do not know yet" arriving at a screen that already has
 * something honest to show; replacing `received` with a hedge on the strength
 * of not knowing would be the worst of both. On the wallet road there is no
 * paint to stand, and the two cases part company: a 503 becomes `unreadable`
 * and an unrecognised status becomes `unfinished`.
 *
 * ## The stale-result guard
 *
 * The id in the address is what stops a second purchase in the same tab from
 * landing on the first one's result. A second purchase overwrites the record,
 * so a record naming a different payment than the address does describes some
 * other purchase, and none of it may be shown. The guards are `checkoutFor` and
 * `walletCheckoutFor` in `lib/checkout-session.ts`: this screen asks for the
 * record that applies to the payment it is displaying and is handed nothing
 * when none does.
 *
 * ## It spends the question, and only that
 *
 * Once the backend has said the money moved, the question is dropped from the
 * record — see `forgetQuestion`. This is the only screen that knows a payment
 * happened, and the reading page a cancelled checkout returns to cannot tell
 * cancel from success. Everything else in the record stays, which is what keeps
 * the reload below safe.
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
   * No id in the address, or no record for the one that is there. Nothing to
   * show, and nothing to confirm.
   *
   * On the card road this is the only way to have nothing: the screen either
   * has the record — in which case the money moved and it says so — or it has
   * nothing, which is this.
   */
  | { state: "unknown" }
  /**
   * The wallet road, having asked and got no answer. A 503 from our backend, or
   * a network failure here.
   *
   * **It exists on this road and not the other**, and the asymmetry is the
   * point. The card road has already painted something true and stands its
   * ground; this road has painted nothing, because `return_url` is reached
   * whatever happened, so it has nothing to stand on and says so instead.
   */
  | { state: "unreadable" }
  | { state: "known"; outcome: PaymentOutcome; money: Money | null };

export function CheckoutComplete() {
  const searchParams = useSearchParams();
  /*
    Read once into a plain string rather than passing the params object to the
    effect: `useSearchParams` returns a new object per render, which would
    re-run the verification — and each run is a request.
  */
  const sessionId = searchParams.get("session_id");
  /*
    What `stripe.confirmPayment` appends to the `return_url` we handed it. The
    **id**, not the `payment_intent_client_secret` beside it: an id identifies
    the payment without being the authority to confirm it, and this screen needs
    only to know which payment it is looking at.
  */
  const paymentIntentId = searchParams.get("payment_intent");

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
      /*
        The card road first, and the two are asked in turn rather than chosen
        between: each guard refuses the other road's record, so at most one of
        them can answer. An address carrying both ids is not a case anybody can
        produce — Stripe appends one or the other — and if it ever were, the
        card road's optimism is the reading that would be wrong, so the road
        that paints nothing is the one that gets the second look.
      */
      const card = checkoutFor(sessionId);
      const wallet = card ? null : walletCheckoutFor(paymentIntentId);
      const record = card ?? wallet;

      if (!record) {
        if (live) setResult({ state: "unknown" });
        return;
      }

      /*
        **Only the card road paints before it asks.** `success_url` is reached
        only after Stripe has taken the payment. `return_url` is reached
        whatever happened, so on the wallet road there is nothing yet that is
        safe to say.
      */
      if (card) setResult({ state: "known", outcome: "received", money: card.money });

      try {
        const status = await fetchPaymentStatus(record.payToken);

        if (!live) return;

        /*
          Two answers that are not corrections. A status this build has never
          heard of is the contract's own "we do not know yet", and `received`
          is what is already on screen — so both leave it alone rather than
          replacing something true with a hedge.
        */
        /*
          A status this build has never heard of is the contract's own "we do
          not know yet". On the card road that leaves a true screen alone. On
          the wallet road there is no screen yet to leave alone, and
          `outcomeFor` maps it to `unfinished` — which says the payment is not
          finished and nothing has been charged **yet**, and claims nothing
          either way. That is the honest answer for a road that cannot assume.
        */
        if (!isRecognisedStatus(status) && card) return;

        const outcome = outcomeFor(status);

        /*
          The money moved, so the question that came with it is spent. It is
          dropped from the record here and nowhere else, because this is the
          only screen that knows a payment happened — the reading page a
          cancelled checkout returns to cannot tell the two apart, and would
          otherwise put a question about a reading already bought back in the
          box.

          Only on a status that says so. `unpaid` is a customer who has to try
          again, and taking their question away at the moment they need it would
          be the loss this whole record exists to prevent.
        */
        if (outcome === "received" || outcome === "pending") forgetQuestion(record);

        // Already on screen, on the card road only, and repainting it would
        // replace a rendered object with an identical one for nothing.
        if (outcome === "received" && card) return;

        setResult({ state: "known", outcome, money: record.money });
      } catch {
        if (!live) return;

        /*
          A 503 — Stripe unreachable from the backend — or a network failure
          here. Both say exactly nothing about the payment.

          On the card road the payment is one Stripe had already taken before it
          sent the customer here, and `received` is already on screen: the paint
          stands. On the wallet road nothing is on screen and nothing is known,
          so the screen says that rather than inventing either answer.
        */
        if (!card) setResult({ state: "unreadable" });
      }
    })();

    return () => {
      live = false;
    };
  }, [sessionId, paymentIntentId]);

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

  if (result.state === "unreadable") {
    return (
      <Panel>
        <h1 className="font-display text-h2 text-champagne">{checkoutCompleteCopy.errorHeading}</h1>
        <p className="mt-4 text-note text-ash">{checkoutCompleteCopy.errorBody}</p>
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
