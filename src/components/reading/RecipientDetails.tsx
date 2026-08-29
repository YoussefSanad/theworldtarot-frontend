import { CountedField } from "@/components/reading/CountedField";
import { PanelHeading } from "@/components/reading/PanelHeading";
import { Phrase } from "@/components/ui/Phrase";
import { questionLimit, readingPageChrome } from "@/content/reading-pages";

const { gift } = readingPageChrome;

/**
 * What the page asks for instead of a question when the reading is a gift.
 *
 * Where it sits is the point. The client's design puts "gift a reading" at the
 * foot of the payment column, and the thing it changes is a section most of a
 * panel above it — so the button is only half of the interaction. The other
 * half is in `ReadingOrder`: entering gift mode moves focus into the email
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
 */
export function RecipientDetails() {
  return (
    <section className="flex flex-col items-center text-center">
      <PanelHeading className="text-h2-md">{gift.heading}</PanelHeading>

      <p className="mt-[clamp(0.5rem,1.46vw,1.75rem)] max-w-[70cqw] font-light text-nav leading-[1.07] tracking-[0.01em] text-white">
        <Phrase parts={gift.body} />
      </p>

      {/* The same 607px box the question field takes, so the panel does not shift. */}
      <div className="mt-[clamp(0.75rem,1.56vw,1.875rem)] flex w-[88.35cqw] flex-col">
        <CountedField
          name="recipientEmail"
          label={gift.email.label}
          placeholder={gift.email.placeholder}
          /* RFC 5321's maximum addressable length, as the newsletter uses. */
          limit={254}
          required
          autoFocusOnMount
          /*
            The address wanted here is the recipient's. Left alone, Chrome
            offers the purchaser their own — the one they have typed into every
            other email field on the web — which is a quiet way to send
            somebody a gift addressed to themselves.
          */
          suppressAutofill
        />
      </div>

      <div className="mt-[clamp(0.5rem,1.04vw,1.25rem)] flex w-[88.35cqw] flex-col">
        <CountedField
          name="giftMessage"
          label={gift.message.label}
          placeholder={gift.message.placeholder}
          limit={questionLimit}
          rows={3}
          className="min-h-[clamp(4.5rem,7.6vw,9.125rem)]"
        />
      </div>

      <p className="mt-[clamp(0.375rem,0.78vw,0.9375rem)] max-w-[70cqw] text-fine leading-[1.2] font-light text-champagne/73">
        {gift.note}
      </p>
    </section>
  );
}
