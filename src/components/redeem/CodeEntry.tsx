"use client";

import { useId } from "react";

import { ReadingBackdrop } from "@/components/reading/ReadingBackdrop";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Phrase } from "@/components/ui/Phrase";
import { redeemCopy } from "@/content/redeem";

const { entry } = redeemCopy;

/**
 * `/redeem/` before there is a reading to draw a page of.
 *
 * Three ways to arrive here: no code in the address at all, a code that
 * resolved to nothing, and a lookup that could not be made. **None of them
 * knows which reading is involved**, so none of them can be a reading page —
 * which is why the presentation half is not mounted until a code resolves.
 *
 * **The code arrives as a query parameter and is typed here.** A static export
 * cannot pre-render a path segment per code, so the link in the recipient's
 * mail carries `?code=`; the same mail prints the characters underneath for
 * somebody who would rather type them, and this is the box they type them into.
 * See `docs/adr/0003-redemption-is-a-page-of-its-own.md`.
 *
 * **Forgiving, by not being strict.** The backend normalises before it looks
 * anything up — uppercased, non-alphanumerics stripped, `I`/`L` read as `1` and
 * `O` as `0` — so this field carries no `pattern`, no uppercasing and no
 * stripping of its own. `API_CONTRACT.md` asks us to be forgiving and *not* to
 * reproduce that rule, because a second implementation of an alphabet is a
 * second one to drift; the line under the field says so to the visitor.
 *
 * The measure the site's other standalone one-column pages reached from outside
 * are drawn in — the confirmation and the two password pages. **The
 * confirmation shares the rhythm and the ground as well**, from 3 September
 * 2026: it took this column, this heading, this divider and this backdrop
 * wholesale, because it is the other page a stranger arrives at from a link
 * they were sent. The password pages share the measure alone; they are left
 * aligned and stand on flat colour.
 *
 * The observatory behind it is the reading pages' own, so the page does not
 * change character the moment a code resolves.
 */
export function CodeEntry({
  code,
  said,
  looking,
  onLookUp,
}: {
  /** What the address carried, so a bad code is in the box to be corrected. */
  code: string;
  /** What went wrong last time, in the visitor's words. Absent on a first visit. */
  said: string | null;
  looking: boolean;
  onLookUp: (typed: string) => void;
}) {
  const id = useId();

  return (
    <ReadingBackdrop>
      <section className="mx-auto w-full max-w-[36.25rem] px-6 py-24 text-center">
        <h1 className="font-display text-h1 leading-none tracking-[-0.01em] text-cream">
          {entry.heading}
        </h1>

        <Divider variant="hero" className="mt-[clamp(0.125rem,0.16vw,0.1875rem)]" />

        <p className="mt-4 font-serif text-body leading-[1.19] tracking-[-0.01em] text-gold">
          <Phrase parts={entry.body} />
        </p>

        {/*
          `role="alert"` rather than a paragraph, because every sentence that
          reaches it appears in answer to something the visitor just did. They
          are three different things and the page must not collapse them: a code
          that does not exist, a backend that could not be asked, and a
          throttle. Only the first is about the code.
        */}
        {said ? (
          <p role="alert" className="mt-6 text-note leading-[1.3] text-champagne">
            {said}
          </p>
        ) : null}

        <form
          className="mt-8 flex flex-col items-stretch gap-3"
          onSubmit={(event) => {
            event.preventDefault();

            if (looking) return;

            onLookUp(new FormData(event.currentTarget).get("code") as string);
          }}
        >
          <label htmlFor={id} className="sr-only">
            {entry.label}
          </label>

          {/*
            `defaultValue` and not `value`: the field is uncontrolled, and what
            it starts with is whatever the address carried — so a code that did
            not resolve is sitting there to be corrected rather than cleared out
            from under somebody.

            **Keyed on the code by the caller**, because React applies a
            `defaultValue` at mount and ignores it on an update.

            `autoComplete="off"`: a browser's saved values for a box called
            `code` are one-time passwords and postcodes, and neither is this.
          */}
          <input
            id={id}
            name="code"
            type="text"
            defaultValue={code}
            required
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
            placeholder={entry.placeholder}
            /*
              `CountedField`'s own line, minus the counter. A code has a fixed
              length the visitor is copying rather than an allowance they are
              spending, so a running `0/64` under it would be counting something
              nobody is rationing — which is the one thing that component exists
              to do. Everything else is shared, corner included: the radius is
              the site's field token and not a number chosen for this box.
            */
            className="field rounded-[clamp(0.5rem,1.04vw,1.25rem)] border-2 border-gold bg-ink/30 px-[1.35em] py-[0.9em] text-center font-light text-note tracking-[0.08em]"
          />

          <p className="text-fine leading-[1.2] font-light text-champagne/73">{entry.forgiving}</p>

          <Button type="submit" variant="ghost" size="md" aria-busy={looking} className="mt-2 self-center">
            {looking ? entry.looking : entry.submit}
          </Button>
        </form>

        <ButtonLink href={redeemCopy.backHref} variant="ghost" size="md" className="mt-8">
          {redeemCopy.backLabel}
        </ButtonLink>
      </section>
    </ReadingBackdrop>
  );
}
