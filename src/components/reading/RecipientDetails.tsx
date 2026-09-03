import { CountedField } from "@/components/reading/CountedField";
import { FieldBox } from "@/components/reading/FieldBox";
import { PanelHeading } from "@/components/reading/PanelHeading";
import { Phrase } from "@/components/ui/Phrase";
import { questionLimit, readingPageChrome } from "@/content/reading-pages";

const { gift } = readingPageChrome;

/**
 * What the page asks for instead of a question when the reading is a gift.
 *
 * Where it sits is the point. The client's design puts "Gift a Reading" at the
 * foot of the payment column, and the thing it changes is a section most of a
 * panel above it — so the button is only half of the interaction. The other
 * half is in `ReadingOrder`: entering gift mode moves focus into the first
 * field, which brings the visitor to the part of the page that just became
 * different rather than leaving them looking at an unchanged button.
 *
 * The copy is ours, not the client's — her frame has no gift mode to draw. It
 * is written to the voice of the rest of the page and is the first thing to
 * hand her when she reviews this.
 *
 * The note under the fields is load-bearing rather than decorative: a
 * purchaser who has just been shown a question field on every other visit
 * needs telling *why* there isn't one now.
 *
 * ## Four fields, and why each of the two new ones is required
 *
 * **The signature comes first**, from 3 September 2026 (#71). It is the **gift
 * signature** — who the recipient is told the gift is from — and it is asked
 * for before the address because it is the thing the buyer is surest of. It is
 * not "Your Name": an order may carry no name at all since #52, the card road
 * collects the buyer's identity on Stripe's page after the order exists, and
 * "Mum" is a truer answer than what is on the card. Required, because an
 * unsolicited mail carrying a code from a brand the recipient has never heard
 * of is phishing-shaped, and a name they know is the one thing that separates
 * it from one.
 *
 * **The address is taken twice**, because the buyer never receives the code. A
 * typo on an ordinary purchase costs somebody a receipt they can ask for again;
 * a typo here sends a paid, non-expiring bearer credential to a stranger, and
 * there is nothing in the buyer's hands to resend.
 *
 * ## The disagreement is a state on a field, not an error raised here
 *
 * Nothing in this file compares the two addresses. `orderFormAccepts` does it
 * on its way past, writes the result on the **address confirmation** with
 * `setCustomValidity`, and the browser's own validity machinery carries it out
 * of the one `reportValidity()` both payment controls call — so there is one
 * place a press can be turned down and it is the same place the `required`s
 * come out of. A second refusal branch beside it is how a buyer authorises with
 * their face for a gift the form had already rejected.
 *
 * What this file owns is the **sentence**, hung on the confirmation's wrapper as
 * `data-mismatch`. Copy belongs here and `src/lib` cannot import it — see
 * `markGiftAddresses` — and an argument on `orderFormAccepts` would be a third
 * caller's to forget.
 *
 * ## What the two new fields cost the panel
 *
 * **The panel shifts on the toggle, and this unit widens the shift.** Measured
 * against the export at 1920px: the question section stands 431px and this one
 * stood 557px before #71 and stands 760px after. The two new boxes are 101px
 * each and their counters are in that; the message textarea gives 38px of it
 * back, dropping **3 rows to 2** with its `min-h` down from the 146px box to
 * the 100px one, because it is the only optional field on either section and a
 * shorter optional box is the cheaper of the two costs. It does not give back
 * anything like enough, and no rearrangement of four required boxes and a
 * textarea can: **the intent was a section that matched the question field's
 * 607px box in both directions, and only the width still does.**
 *
 * The width is not a leftover. It is what stops the panel changing shape as
 * well as size when the visitor toggles, and it is one number in one place —
 * `FieldBox`, which the question field and `/redeem/`'s panel stand in too.
 */
export function RecipientDetails() {
  return (
    <section className="flex flex-col items-center text-center">
      <PanelHeading className="text-h2-md">{gift.heading}</PanelHeading>

      <p className="mt-[clamp(0.5rem,1.46vw,1.75rem)] max-w-[70cqw] font-light text-nav leading-[1.07] tracking-[0.01em] text-white">
        <Phrase parts={gift.body} />
      </p>

      {/* The same 607px box the question field takes, which is the half of the
          not-shifting that this section still keeps. See the note above. */}
      <FieldBox className="mt-[clamp(0.75rem,1.56vw,1.875rem)]">
        <CountedField
          name="giftSignature"
          label={gift.signature.label}
          placeholder={gift.signature.placeholder}
          /*
            Room for a name and no more. The counter matters on this field in a
            way it does not on the two addresses: 50 characters is short enough
            to reach, and a limit that stops somebody typing without saying why
            reads as the keyboard breaking.
          */
          limit={50}
          type="text"
          required
          autoFocusOnMount
        />
      </FieldBox>

      <FieldBox className="mt-[clamp(0.5rem,1.04vw,1.25rem)]">
        <CountedField
          name="recipientEmail"
          label={gift.email.label}
          placeholder={gift.email.placeholder}
          /* RFC 5321's maximum addressable length, as the newsletter uses. */
          limit={254}
          required
          /*
            The address wanted here is the recipient's. Left alone, Chrome
            offers the purchaser their own — the one they have typed into every
            other email field on the web — which is a quiet way to send
            somebody a gift addressed to themselves.
          */
          suppressAutofill
        />
      </FieldBox>

      {/*
        The refusal's sentence, bound to the field it refuses rather than passed
        to the function that reads it. `orderFormAccepts` looks for it here; see
        `markGiftAddresses` in `lib/order-note.ts` for why it is not an import
        and not an argument.
      */}
      <FieldBox
        data-mismatch={gift.confirmation.mismatch}
        className="mt-[clamp(0.5rem,1.04vw,1.25rem)]"
      >
        <CountedField
          name="addressConfirmation"
          label={gift.confirmation.label}
          placeholder={gift.confirmation.placeholder}
          limit={254}
          required
          /*
            Suppressed for the reason the field above it is, and for one more:
            a confirmation the browser filled in has confirmed nothing. The
            point of the second box is that the address is typed twice by the
            person who knows it.
          */
          suppressAutofill
        />
      </FieldBox>

      <FieldBox className="mt-[clamp(0.5rem,1.04vw,1.25rem)]">
        <CountedField
          name="giftMessage"
          label={gift.message.label}
          placeholder={gift.message.placeholder}
          limit={questionLimit}
          /*
            Two rows rather than three, and the `min-h` is the two-row box —
            100px of the panel's 1920px frame against the 146px it used to hold.
            The field still scrolls and still resizes; what it gives up is the
            part of its resting height that the signature and the confirmation
            now need. See the note on this component.
          */
          rows={2}
          className="min-h-[clamp(3rem,5.2vw,6.25rem)]"
        />
      </FieldBox>

      <p className="mt-[clamp(0.375rem,0.78vw,0.9375rem)] max-w-[70cqw] text-fine leading-[1.2] font-light text-champagne/73">
        {gift.note}
      </p>
    </section>
  );
}
