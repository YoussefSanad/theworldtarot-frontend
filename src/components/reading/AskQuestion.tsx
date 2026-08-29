import { CountedField } from "@/components/reading/CountedField";
import { PanelHeading } from "@/components/reading/PanelHeading";
import { Phrase } from "@/components/ui/Phrase";
import { questionLimit, readingPageChrome } from "@/content/reading-pages";

const { question: copy } = readingPageChrome;

/**
 * The optional question that travels with the order.
 *
 * Optional is the backend's word for it, not a softening: `/products` carries
 * an `allows_question` flag per product and it is always optional (see
 * `ApiProduct` in `src/lib/api.ts`), which is why the field has no `required`
 * and the copy says so.
 *
 * **A purchaser buying this as a gift never sees this section at all** — the
 * recipient asks their own question after they redeem. `ReadingOrder` swaps it
 * for `RecipientDetails` rather than hiding it, so there is no question in the
 * form to be submitted either.
 *
 * The field is a `<textarea>` and not an `<input>` because she draws a 226px
 * box, and it carries its own border rather than an `OrnateFrame` so the gold
 * can answer focus — `.field` already owns that behaviour for the newsletter's
 * inputs.
 *
 * `question` is what a cancelled checkout puts back. It is the mounting value
 * and nothing more — see `ReadingOrder` for where it comes from and why it can
 * only come from the page it was typed on.
 */
export function AskQuestion({ question }: { question?: string }) {
  return (
    <section className="flex flex-col items-center text-center">
      <PanelHeading className="text-h2-md">{copy.heading}</PanelHeading>

      {/*
        Capped so the client's break lands. Her two phrases come to about 632px
        of the 626px column, which is close enough to the measure that they
        very nearly ride one line — and our Gill Sans renders a shade wider
        than the PSD's, so "very nearly" is not a thing to leave to the
        rendering. 480px of the 687px panel is comfortably over the 374px the
        longer phrase needs and comfortably under the pair, so it sets as the
        two lines she draws at every width. Same trap as the reading cards'
        seven-pixel window; see `src/content/readings.ts`.
      */}
      <p className="mt-[clamp(0.5rem,1.46vw,1.75rem)] max-w-[70cqw] font-light text-nav leading-[1.07] tracking-[0.01em] text-white">
        <Phrase parts={copy.body} />
      </p>

      {/*
        607px of the 687px panel, and 230px tall. `cqw` resolves against the
        panel rather than the column this sits in, so the width is the frame's
        own number and not a share of a share. The box wraps the counter too,
        so that lines up on the field's own right edge rather than the column's.
      */}
      <div className="mt-[clamp(0.75rem,1.56vw,1.875rem)] flex w-[88.35cqw] flex-col">
        <CountedField
          name="question"
          label={copy.label}
          placeholder={copy.placeholder}
          limit={questionLimit}
          rows={5}
          defaultValue={question}
          className="min-h-[clamp(7rem,11.98vw,14.375rem)]"
        />
      </div>
    </section>
  );
}
