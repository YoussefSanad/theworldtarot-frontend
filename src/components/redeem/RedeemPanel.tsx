"use client";

import { CountedField } from "@/components/reading/CountedField";
import { FieldBox } from "@/components/reading/FieldBox";
import { PanelHeading } from "@/components/reading/PanelHeading";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Phrase } from "@/components/ui/Phrase";
import { questionLimit, readingPageChrome } from "@/content/reading-pages";
import { redeemCopy } from "@/content/redeem";
import { redeemedOn, type Asking, type Gift } from "@/lib/gifts";
import { currentLocale } from "@/lib/locale";
import { textIn } from "@/lib/order-note";

const { ask, spent } = redeemCopy;

/**
 * What stands where the commerce goes on `/redeem/`: the code's state, and the
 * question.
 *
 * **This is the `commerce` slot of `ReadingPresentation`**, which is the seam
 * F1 cut and the reason this page is a reading page at all rather than a bare
 * question box. Everything above the seam — the name, the artwork, what
 * arrives, the testimonial, the props — is inherited untouched, and what is
 * gone is everything that sells: no price, no wallet row, no checkout button,
 * no `Gift a Reading`. See `docs/adr/0003-redemption-is-a-page-of-its-own.md`.
 *
 * **It owns the anchor**, which is the one thing `ReadingPresentation` asks of
 * whatever fills its slot: the closing call to action at the foot of the page
 * scrolls to `readingPageChrome.checkout.anchor`, and a slot that did not carry
 * it would leave that button pointing at an element not in the document.
 *
 * ## Two states, and the ones that are somewhere else
 *
 * **Ask** and **already redeemed** — a code that resolved, and one that was
 * already spent. There is no expired state: gift codes do not expire, and the
 * concept does not enter the product through a screen. See `content/redeem.ts`.
 *
 * ~~**Asked**, the confirmation this page drew from the answer that spent the
 * code.~~ **Struck 3 September 2026** (#82): a redemption now lands on
 * `/checkout/complete/`, where a buyer's confirmation already was. The words
 * did not change and are still `redeemCopy.asked`; the screen they are read on
 * did. With them went `delivery`, which was passed in for that state alone —
 * the confirmation states the reading's window from the **product key** on the
 * record it is handed, which is the same rule read at the other end.
 *
 * The unknown code and the unreachable backend are not here either, because in
 * neither case is there a reading to draw a page of. They live on `CodeEntry`.
 *
 * ## Spending happens here and only on submit
 *
 * The lookup that produced `gift` did not spend it, and nothing on the way into
 * this component does either. Email scanners and link prefetchers follow links,
 * so a page that redeemed on arrival would hand a present to whatever opened
 * the mail first — and there is no expiry to reclaim it with and no refund.
 */
export function RedeemPanel({
  gift,
  asking,
  failed,
  onAsk,
}: {
  gift: Gift;
  /** A submit in flight, which holds the button's label across the round trip. */
  asking: boolean;
  /** The last submit was refused by something that was not about the code. */
  failed: boolean;
  /**
   * Runs the redemption. It answers rather than throws for the two states that
   * are about the code, and throws for everything that is not — see
   * `lib/gifts.ts`. The state machine is the page's, not this component's —
   * and on the one answer that succeeds, so is the navigation.
   */
  onAsk: (asking: Asking) => Promise<void>;
}) {
  return (
    /*
      The anchor sits on the wrapper rather than on any one state's section, so
      the closing call to action lands on this panel whichever of the two is
      rendered — exactly as `ReadingOrder` puts it on its own wrapper so a
      withdrawn product does not leave the button pointing at nothing.
    */
    <div id={readingPageChrome.checkout.anchor}>
      {gift.redeemed ? (
        <Spent gift={gift} />
      ) : (
        <AskForReading gift={gift} asking={asking} failed={failed} onAsk={onAsk} />
      )}
    </div>
  );
}

/**
 * The question, the address it goes to, and the name that is optional.
 *
 * **A real `<form>` with a real submit**, unlike the reading page's, which has
 * neither — its two payment controls place an order instead, and the browser's
 * own validation had to be triggered by hand there (`orderFormAccepts`).
 * Nothing of that kind is needed here: a submit button in a form is what the
 * `required` attributes and the `type="email"` are already wired to.
 */
function AskForReading({
  gift,
  asking,
  failed,
  onAsk,
}: {
  gift: Gift;
  asking: boolean;
  failed: boolean;
  onAsk: (asking: Asking) => Promise<void>;
}) {
  return (
    <form
      className="mt-[clamp(2rem,5.63vw,6.75rem)] flex flex-col items-center text-center"
      onSubmit={(event) => {
        event.preventDefault();

        /*
          Read off the form at the moment of the press, the way the reading
          panel reads its own — which is what keeps `CountedField`
          uncontrolled. `textIn` rather than a reader of this panel's own:
          `data-field` is a contract and it is one reader, because the last
          time there were two, one of them drifted and it took four days and
          every gift order placed in them. The attribute is what it keys to
          because the fields that suppress autofill submit under an opaque id.
        */
        // A second press while the first is still in flight would place a
        // second redemption for a code the first one is spending. The backend
        // locks the row and refuses the loser, so this is a courtesy rather
        // than the guard — but the courtesy is what stops a querent being told
        // their own code has already been used.
        if (asking) return;

        const form = event.currentTarget;

        void onAsk({
          question: textIn(form, "question"),
          querentEmail: textIn(form, "querentEmail"),
          querentName: textIn(form, "querentName"),
        });
      }}
    >
      <PanelHeading className="text-h2-md">{ask.heading}</PanelHeading>

      <p className="mt-[clamp(0.5rem,1.46vw,1.75rem)] max-w-[70cqw] font-light text-nav leading-[1.07] tracking-[0.01em] text-white">
        <Phrase parts={ask.body} />
      </p>

      {/*
        The code in its printed form, so the visitor can see what was resolved
        from whatever they typed or whatever the link carried. It is the same
        bearer credential in a tidier shape — shown, never logged.
      */}
      <p className="mt-[clamp(0.5rem,1.04vw,1.25rem)] text-note leading-none font-light text-gold">
        {ask.codeLabel}: <span className="tracking-[0.08em] text-champagne">{gift.code}</span>
      </p>

      {/*
        The question field's own 607px box, which is what every field on the
        panel opposite is set to. `cqw` resolves against the panel rather than
        the column, so this is the frame's own number.
      */}
      <FieldBox className="mt-[clamp(0.75rem,1.56vw,1.875rem)]">
        <CountedField
          name="question"
          label={ask.question.label}
          placeholder={ask.question.placeholder}
          /*
            **The buyer's limit, not the backend's.** The API accepts 2000 here
            and on a purchase alike, and this site caps a buyer's question at
            `questionLimit` — so using the API's ceiling would be two screens
            telling one person two different things about the same field.
          */
          limit={questionLimit}
          rows={5}
          required
          className="min-h-[clamp(7rem,11.98vw,14.375rem)]"
        />
      </FieldBox>

      <FieldBox className="mt-[clamp(0.5rem,1.04vw,1.25rem)]">
        <CountedField
          name="querentEmail"
          label={ask.email.label}
          placeholder={ask.email.placeholder}
          /* RFC 5321's maximum addressable length, under the backend's 255. */
          limit={254}
          required
        />
      </FieldBox>

      <FieldBox className="mt-[clamp(0.5rem,1.04vw,1.25rem)]">
        <CountedField
          name="querentName"
          label={ask.name.label}
          placeholder={ask.name.placeholder}
          /*
            The backend's own ceiling, passed rather than shortened: a field
            that silently truncates what somebody typed is a refusal they
            cannot see the cause of.
          */
          limit={255}
          type="text"
        />
      </FieldBox>

      <Button
        type="submit"
        variant="ghost"
        size="fluid"
        aria-busy={asking}
        className="checkout-option mt-[clamp(0.75rem,1.56vw,1.875rem)] w-[72.49cqw]"
      >
        {asking ? ask.asking : ask.submit}
      </Button>

      {/*
        `role="alert"`, because it appears in answer to something the querent
        just did and they may be looking at the button rather than under it. The
        sentence says the code has not been used, which is the half that
        matters: an unclear refusal here leaves somebody unsure whether they
        have just spent their one non-expiring credential.
      */}
      {failed ? (
        <p role="alert" className="mt-[0.4em] max-w-[70cqw] text-fine leading-[1.2] font-light text-champagne/73">
          {ask.failed}
        </p>
      ) : null}
    </form>
  );
}

/**
 * A code somebody has already spent.
 *
 * **Said plainly rather than hidden**, which is the decision ADR 0003 records:
 * it cannot hide behind the answer an unknown code gets, because it is a state
 * the real recipient has to be told about. What closes the guessing oracle that
 * creates is the entropy in the code, plus the backend's throttle.
 *
 * The date is the fact that lets somebody work out whether it was them. Who
 * redeemed it and what they asked are not here: this endpoint answers to
 * anybody holding the code.
 */
function Spent({ gift }: { gift: Gift }) {
  const when = redeemedOn(gift.redeemedAt, currentLocale());

  return (
    <section className="mt-[clamp(2rem,5.63vw,6.75rem)] flex flex-col items-center text-center">
      <PanelHeading className="text-h2-md">{spent.heading}</PanelHeading>

      <p className="mt-[clamp(0.5rem,1.46vw,1.75rem)] max-w-[70cqw] font-light text-nav leading-[1.07] tracking-[0.01em] text-white">
        {when === null ? spent.undated : spent.body(when)}
      </p>

      {/*
        The way onward. A spent code is the one state on this page with nothing
        to do next, and a screen that ends on the refusal leaves somebody
        standing on a reading page with no control on it — so the shelf is one
        press away, at `backHref`, where every other exit from this page lands.
      */}
      <p className="mt-[clamp(0.75rem,1.87vw,2.25rem)] max-w-[70cqw] text-fine leading-[1.2] font-light text-champagne/73">
        {spent.invitation}
      </p>

      <ButtonLink
        href={redeemCopy.backHref}
        variant="ghost"
        size="md"
        className="mt-[clamp(0.75rem,1.56vw,1.875rem)]"
      >
        {spent.cta}
      </ButtonLink>
    </section>
  );
}
