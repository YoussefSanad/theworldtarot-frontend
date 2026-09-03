"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { checkoutCompleteCopy } from "@/content/checkout";
import { readingPageFor } from "@/content/reading-pages";
import { checkoutFor, forgetQuestion, type CheckoutRecord, walletCheckoutFor } from "@/lib/checkout-session";
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
 * ## It reports a payment, and on one screen of seven a fulfilment as well
 *
 * There is no endpoint that reads an **order** back, and this screen does not
 * want one. It says what Stripe says about the payment, by way of our own
 * backend. Only the backend **settles** an order, on a verified webhook, and
 * that has quite possibly not happened while this is on screen.
 *
 * ~~So nothing here claims a reading has been sent.~~ **`received` does, from
 * 30 August 2026**, because the client took that promise on herself — the
 * reasoning is at the top of `content/checkout.ts` and the decision is on #51.
 * The other six still may not, and four of them say no money was taken at all.
 * Nothing else about this screen moved: it still reports what the backend says
 * about the payment and still has no way to ask about an order. See
 * `CONTEXT.md`.
 *
 * ## Naming the reading costs nothing across the redirect
 *
 * `received` names the product, and the name is not on the payment. It comes
 * from the **product key** on the record in the tab — which has been there
 * since the record was written, for the cancel-and-restore guard — resolved
 * through `readingPageFor`. A key with no page here resolves to nothing and the
 * sentence names no product, which is the right answer for a backend catalogue
 * that can hold a reading this build has never drawn a page for.
 *
 * ## A gift is the eighth screen, and it promises nothing
 *
 * **`received` has two forms and the other six outcomes have one.** A gift
 * buyer paid for a present rather than for a reading: nobody has asked
 * anything, no reading exists, and the sentence the client took on herself on
 * #51 has no counterpart to make. So the gift form of `received` says what did
 * happen — the gift has been sent, and to whom — and stops there. See
 * `giftReceived` in `content/checkout.ts`.
 *
 * **The address comes off the record and never out of the note.** `question`
 * on a gift order is prose composed for Jennifer, and parsing an address back
 * out of it would be the inference `lib/buy.ts` refuses by name — with more at
 * stake here, since what a mis-parse produces is a screen telling somebody the
 * wrong address for their present. `giftRecipient` is the field, written
 * before the browser left, and it outlives `forgetQuestion`.
 *
 * **The other six are untouched.** Four of them say no money was taken, and a
 * screen hedging about a payment has nothing to add about a present.
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
 * **That optimism got more expensive on 30 August 2026 and did not change.**
 * The first paint is now a promise about the reading rather than about the
 * money, so an arrival that verifies to `unpaid` is told their reading is on
 * its way and then told no payment was taken. The road it happens on is the one
 * Stripe reaches only after taking the payment, so it is an anomaly rather than
 * a path — and the alternative is a spinner in front of every customer whose
 * payment was fine, which is the trade this whole section exists to refuse.
 * `check:confirmation` asserts the sequence in both directions on the `unpaid`
 * run, so it is measured rather than assumed; whether the promise should wait
 * for the verification on this road is the open question, and it belongs to #51
 * rather than to whoever next reads this file.
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
  /**
   * `named` is the noun phrase the `received` screen interpolates, carried on
   * every outcome rather than on that one: the outcome is the backend's answer
   * and can change under a screen already painted, and a field that appeared
   * with it would be a second thing to remember to set at each of the two
   * places this is built.
   *
   * **What it names depends on `gift`**, which is the same record read twice.
   * A self-purchase names the reading that was bought; a gift names the address
   * it was sent to, because a gift has no reading to name until somebody
   * redeems it. `subjectOf` decides, once, so the two builds below cannot
   * disagree — and the six outcomes that are about unfinished money ignore the
   * string entirely, their `body` taking no argument.
   */
  | { state: "known"; outcome: PaymentOutcome; money: Money | null; gift: boolean; named: string };

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
      if (card) {
        setResult({
          state: "known",
          outcome: "received",
          money: card.money,
          gift: card.gift ?? false,
          named: subjectOf(card),
        });
      }

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

        setResult({
          state: "known",
          outcome,
          money: record.money,
          gift: record.gift ?? false,
          named: subjectOf(record),
        });
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

  /*
    **The gift variant is `received`'s alone.** The other six report unfinished
    money and have nothing gift-shaped to say — four of them say no payment was
    taken, and hedging about a payment while naming who a present went to is
    two screens in one. So the branch is here, at the one outcome it applies to,
    rather than a second `outcomes` table keyed by mode.
  */
  const copy =
    result.gift && result.outcome === "received"
      ? checkoutCompleteCopy.giftReceived
      : checkoutCompleteCopy.outcomes[result.outcome];

  return (
    <Panel>
      <h1 className="font-display text-h2 text-champagne">{copy.heading}</h1>

      {result.money ? (
        <p className="mt-6 text-note text-ash">
          {copy.amountLabel}{" "}
          <span className="text-champagne">{formatPrice(result.money)}</span>
        </p>
      ) : null}

      <p className="mt-4 text-note text-ash">{copy.body(result.named)}</p>

      <Back />
    </Panel>
  );
}

/**
 * The one noun the received screen interpolates, which is a different thing on
 * each side of the gift flag.
 *
 * **A self-purchase names the reading.** The record's product key is the
 * backend's name for it and no customer's, so it is never rendered — it is
 * turned into a title or into nothing. The fallback is copy rather than a
 * literal here, because it is a word a customer reads.
 *
 * **A gift names the address it went to**, because a gift has no reading to
 * name: nobody has asked anything yet, and the product on the record is what
 * the recipient will be able to redeem rather than something on its way to
 * anybody. The address is the one detail the buyer can still have got wrong,
 * and this screen is the last place they will see it.
 *
 * One function for both, so the branch is here rather than at the two places
 * the result is built — where a gift painted optimistically and a gift painted
 * after verification could otherwise name two different things.
 */
function subjectOf(record: CheckoutRecord): string {
  if (record.gift) {
    return record.giftRecipient ?? checkoutCompleteCopy.unnamedRecipient;
  }

  return readingPageFor(record.productKey)?.title ?? checkoutCompleteCopy.unnamedReading;
}

function Back() {
  /*
    No `lowercase` here. It was on this button to render "Back to the readings"
    in lower case, and the label is set in the client's capitals from 30 August
    2026 — left in place the class would swallow them and the copy change would
    paint as though it had never landed.
  */
  return (
    <ButtonLink href={checkoutCompleteCopy.backHref} variant="ghost" size="md" className="mt-8">
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
