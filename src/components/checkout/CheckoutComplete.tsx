"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ReadingBackdrop } from "@/components/reading/ReadingBackdrop";
import { ButtonLink } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { checkoutCompleteCopy } from "@/content/checkout";
import { readingPageFor } from "@/content/reading-pages";
import { redeemCopy } from "@/content/redeem";
import {
  checkoutFor,
  forgetQuestion,
  redeemedParam,
  redemptionFor,
  type CheckoutRecord,
  type RedemptionRecord,
  walletCheckoutFor,
} from "@/lib/checkout-session";
import { fetchPaymentStatus } from "@/lib/orders";
import { isRecognisedStatus, outcomeFor, type PaymentOutcome } from "@/lib/payment-outcome";
import { formatPrice, type Money } from "@/lib/price";

/**
 * The **confirmation**: where a paid-for checkout lands, by either road.
 *
 * ## ~~Two~~ **three** roads arrive here, and they are told apart by the address
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
 * ## The third road is not a payment at all
 *
 * **From 3 September 2026** (#82) `/redeem/` sends a querent here with
 * `redeemed` in the address, naming a `RedemptionRecord` the tab holds. Two
 * roads through one shop ended in two different rooms — a buyer's confirmation
 * was a page and a querent's was a panel inside the reading page they were
 * given — and the client's answer was that they should end in the same one.
 *
 * **Nothing on it is about money, and it is the first branch for that reason.**
 * It asks the backend nothing: `POST /orders/status` reports a payment, and the
 * payment behind a redeemed gift happened months earlier to somebody else, so
 * there is no second call to make and nothing to verify. It paints no amount —
 * there is none this querent paid — and none of the seven payment outcomes is
 * reachable through it. What it draws is the answer that spent the code, which
 * `/redeem/` wrote down before it replaced the address.
 *
 * **The record is the whole input, so a lost one has its own sentence.**
 * `sessionStorage` dies with the tab: a reload is fine and a link opened
 * somewhere else is not. `unknown` below says the **receipt** is the record
 * that counts, which is true of a payment and false of a redemption — nobody
 * sent a querent a receipt. `redeemCopy.lost` points at the mail instead.
 *
 * ## It reports a payment, and on one screen of seven a fulfilment as well
 *
 * **Everything in this section and the two below it is about the two payment
 * roads.** The redemption above is outside all of it: it reports no payment,
 * and the promise it makes is the querent's own, argued in `content/redeem.ts`.
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
 * Eighth of the payment roads' own, which is the count this section keeps. The
 * redemption road added two more to the file on 3 September 2026 and neither is
 * about a payment, so neither is in this arithmetic.
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
  | { state: "known"; outcome: PaymentOutcome; money: Money | null; gift: boolean; named: string }
  /**
   * The redemption road, which carries its own record rather than an outcome:
   * there is no payment here to have an outcome about.
   */
  | { state: "redeemed"; asked: RedemptionRecord }
  /**
   * A redemption handle this tab holds no record for — a link opened somewhere
   * else, or a tab closed since. It is `unknown`'s counterpart on a road with
   * no receipt to point at, and it is a state of its own for exactly that
   * reason.
   */
  | { state: "forgotten" };

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
  /*
    The third road's handle. Ours rather than Stripe's, which is why it is
    spelled in `lib/checkout-session.ts` and read from there: the page that
    builds this address and the screen that reads it are one contract, and a
    contract with two spellings is one spelling away from drifting.
  */
  const redeemed = searchParams.get(redeemedParam);

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
        **The redemption road first, and it returns.** Nothing below it applies:
        there is no payment to identify, no amount to restate and no status to
        ask for. **The address is the whole signal**, and it has to be: one tab
        can hold both records — somebody who bought a gift and then redeemed one
        of their own — and which of them this screen is looking at is a question
        only the address answers.
      */
      if (redeemed !== null) {
        const asked = redemptionFor(redeemed);

        if (live) setResult(asked ? { state: "redeemed", asked } : { state: "forgotten" });

        return;
      }

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
  }, [sessionId, paymentIntentId, redeemed]);

  if (result.state === "checking") {
    return (
      <Panel>
        <Heading>{checkoutCompleteCopy.checkingHeading}</Heading>
      </Panel>
    );
  }

  /*
    The redemption road's two screens, above the payment ones and never falling
    through to them. Six of those seven say something about money that is not
    true here, and the seventh is about a payment this querent did not make.
  */
  if (result.state === "redeemed") {
    const { asked } = result;
    const page = readingPageFor(asked.productKey);

    return (
      <Panel>
        <Heading>{redeemCopy.asked.heading}</Heading>

        {/*
          **No amount above this**, which is the one line every other state on
          this screen has and this road may not: nothing was paid here, and the
          payment behind the gift was somebody else's, months ago.
        */}
        <p className={`mt-4 ${BODY}`}>{redeemCopy.asked.body(titleOf(asked.productKey), asked.querentEmail)}</p>

        {/*
          The reading's own line, stated as a property of the reading rather
          than as a promise this screen makes — the rule `API_CONTRACT.md` sets
          for anything shown against `asked_at`, which is on the record for
          exactly that reason. Absent on a product this build has no page for,
          because there is then no such line to state.
        */}
        {page ? <p className={`mt-4 ${BODY}`}>{page.delivery}</p> : null}

        <p className={`mt-8 ${BODY}`}>{redeemCopy.asked.asking}</p>

        {/*
          The class list written out rather than `BODY` with a colour beside it:
          `cn` in this repo is a plain join, so two competing colours are
          settled by the order of the stylesheet and not of the class list. The
          question is the one thing on this screen in cream — it is what the
          querent wrote, and the rest is what we are telling them.
        */}
        <blockquote className="mt-2 font-serif text-body leading-[1.19] tracking-[-0.01em] text-cream">
          {asked.question}
        </blockquote>

        <Back />
      </Panel>
    );
  }

  if (result.state === "forgotten") {
    return (
      <Panel>
        <Heading>{redeemCopy.lost.heading}</Heading>
        <p className={`mt-4 ${BODY}`}>{redeemCopy.lost.body}</p>
        <Back />
      </Panel>
    );
  }

  if (result.state === "unknown") {
    return (
      <Panel>
        <Heading>{checkoutCompleteCopy.unknownHeading}</Heading>
        <p className={`mt-4 ${BODY}`}>{checkoutCompleteCopy.unknownBody}</p>
        <Back />
      </Panel>
    );
  }

  if (result.state === "unreadable") {
    return (
      <Panel>
        <Heading>{checkoutCompleteCopy.errorHeading}</Heading>
        <p className={`mt-4 ${BODY}`}>{checkoutCompleteCopy.errorBody}</p>
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
      <Heading>{copy.heading}</Heading>

      {/*
        Above the sentence, where it has always been: it is the payment half of
        a screen whose heading is now about the reading, and a customer looking
        for what they were charged should not have to read past a paragraph to
        find it. The amount itself stays a shade brighter than the line it sits
        in — champagne is the one lift `CodeEntry` uses on this ground.
      */}
      {result.money ? (
        <p className={`mt-6 ${BODY}`}>
          {copy.amountLabel} <span className="text-champagne">{formatPrice(result.money)}</span>
        </p>
      ) : null}

      <p className={`mt-4 ${BODY}`}>{copy.body(result.named)}</p>

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

  return titleOf(record.productKey);
}

/**
 * What a **product key** is called on this screen, or the word that stands in
 * for a key this build has drawn no page for.
 *
 * Its own function because two roads name a reading now and they must name it
 * the same way: a self-purchase through `subjectOf`, and a redemption from the
 * record `/redeem/` left in the tab. The key is the backend's name and no
 * customer's, so it is turned into a title or into `unnamedReading` — never
 * rendered, and never guessed at.
 */
function titleOf(productKey: string): string {
  return readingPageFor(productKey)?.title ?? checkoutCompleteCopy.unnamedReading;
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

/**
 * The column every state of this screen is painted in, and the sky behind it.
 *
 * **`/redeem/`'s ground, measure and rhythm**, down to the class list: the two
 * are the pages a stranger is handed a link to — one straight from a payment,
 * one out of a gift mail — and until 3 September 2026 only one of them drew any
 * artwork at all. Every other page on the site renders a `PageAtmosphere` as
 * its first element (`src/app/(site)/layout.tsx` says why the column is the box
 * it fills); this one stood on flat colour.
 *
 * `ReadingBackdrop` rather than a `PageAtmosphere` of its own, because the
 * `-top-20` inside it is tuned to `SiteHeader`'s padding and has to move when
 * the header does. That component exists to be the one place it moves.
 *
 * The measure is still the password pages' — `FormPanel`'s `Panel` is the same
 * `max-w-[36.25rem] px-6 py-24` column — but nothing else is any more: they are
 * left aligned and stand on flat colour, and this screen is centred under the
 * observatory.
 *
 * **`aria-live` is load-bearing and predates all of this.** The card road
 * paints `received` and may correct itself under somebody already reading it;
 * this attribute is the only reason a screen reader hears the correction.
 */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <ReadingBackdrop>
      <section
        className="mx-auto w-full max-w-[36.25rem] px-6 py-24 text-center"
        aria-live="polite"
      >
        {children}
      </section>
    </ReadingBackdrop>
  );
}

/**
 * What a screen says it is, under the hero rule that separates it from the rest
 * of the panel.
 *
 * **An `<h1>` on every state, which is not a detail.**
 * `scripts/check-confirmation.mjs` reads the heading by tag on every run, so a
 * state that demoted its own heading would go unread there rather than fail.
 *
 * One component for the pair rather than a heading class repeated at four call
 * sites: the divider is part of the treatment and not decoration beside it, and
 * a state that grew a heading without one would be the drift this replaces.
 */
function Heading({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 className="font-display text-h1 leading-none tracking-[-0.01em] text-cream">{children}</h1>

      <Divider variant="hero" className="mt-[clamp(0.125rem,0.16vw,0.1875rem)]" />
    </>
  );
}

/**
 * A sentence this screen says, in the redeem page's serif and gold.
 *
 * The typography only, with no margin in it. The four callers do not want the
 * same one — the amount line sits further from the divider than a paragraph
 * does — and a default here could not be overridden by adding a second `mt-`
 * beside it: `cn` in this repo is a plain join rather than a Tailwind merge, so
 * which of two competing margins wins is settled by the order of the stylesheet
 * and not of the class list. So each caller writes its own, and this constant
 * carries the half they share.
 */
const BODY = "font-serif text-body leading-[1.19] tracking-[-0.01em] text-gold";
