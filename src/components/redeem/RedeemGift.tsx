"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ReadingPresentation } from "@/components/reading/ReadingPresentation";
import { CodeEntry } from "@/components/redeem/CodeEntry";
import { PlainReading } from "@/components/redeem/PlainReading";
import { RedeemPanel } from "@/components/redeem/RedeemPanel";
import { readingPageFor } from "@/content/reading-pages";
import { redeemCopy } from "@/content/redeem";
import { ApiRateLimitError } from "@/lib/api-write";
import { lookUpGift, redeemGift, type AskedReading, type Asking, type Gift } from "@/lib/gifts";
import { currentLocale } from "@/lib/locale";

/**
 * `/redeem/` — where a **gift code** becomes a **reading**.
 *
 * **One page for every reading rather than one per reading.** The recipient
 * does not know which reading they were given; they have an email. So the link
 * has to resolve the code before it can choose a page, and once something is
 * resolving the code, landing them on `/readings/three-card/` buys nothing that
 * landing them here does not. See
 * `docs/adr/0003-redemption-is-a-page-of-its-own.md`, which decides all of this
 * and is not re-argued in these files.
 *
 * ## It is a reading page with the commerce taken out
 *
 * Once a code resolves, this mounts `ReadingPresentation` — the seam F1 cut —
 * with `RedeemPanel` in the `commerce` slot. Everything above the seam is
 * inherited untouched: the name, the artwork, what arrives, the testimonial,
 * the props, the closing line. What is gone is everything that sells.
 *
 * **The querent is the one person in this flow who never chose the reading they
 * are holding**, which is the argument for keeping all of that rather than
 * shipping the bare question box the client's walkthrough draws: a paying
 * customer arrives having read what a reading is, and a recipient is handed the
 * name of a thing and asked to spend their question on it.
 *
 * ## The code arrives in a query string, and is spent on submit
 *
 * This is a static export on Cloudflare, so `/redeem/{code}/` would need every
 * code pre-rendered at build time, which is not a thing codes can be. The code
 * is a parameter and `CodeEntry` takes it by hand for somebody typing it off
 * the mail.
 *
 * **Arrival looks it up and never spends it.** Email scanners and link
 * prefetchers follow links, and a gift spent by a scanner is unrecoverable —
 * there is no expiry to reclaim it with and no refund. `redeemGift` runs from
 * the form's submit and from nowhere else.
 *
 * **A typed code is not written into the address.** The link's own `?code=` is
 * a cost the ADR accepts for a credential that has to travel in a link anyway;
 * putting a hand-typed one there as well would be adding a browser history
 * entry and a `Referer` nobody asked for.
 *
 * ## Three states, and no expired one
 *
 * Valid, already redeemed, unknown. **There is no expired state** — gift codes
 * do not expire, and building the state is how the concept gets into a product
 * that decided against it. See the backend's
 * `docs/adr/0005-gift-codes-do-not-expire.md`.
 *
 * The two states that are *not* about the code — a backend that could not be
 * reached, and a throttle — say so in their own words rather than borrowing the
 * unknown code's. Telling somebody their present does not exist because a
 * server was down is the one thing this page must not do.
 *
 * ## What is deliberately not here
 *
 * **No account, and nothing that signs anybody in.** A querent gets no customer
 * row; they have a code and an address, and that is the whole of their
 * identity here.
 *
 * **Nothing that names the buyer.** The lookup does not answer the **gift
 * signature** and this page could not render it if it did: the endpoint answers
 * to anybody holding a bearer credential, which is not necessarily the person
 * the mail was sent to.
 */

/** What the page knows, and therefore what it draws. */
type State =
  /** No code to look up, or one that has just been corrected. */
  | { state: "entering" }
  /** A lookup in flight. The address had a code, or somebody pressed the button. */
  | { state: "looking" }
  /**
   * The code resolved. `gift.redeemed` decides whether the panel asks for a
   * question or says the present has already been opened — one state rather
   * than two, because the page is the same page either way and the difference
   * is a sentence inside the panel.
   */
  | { state: "found"; gift: Gift }
  /** The code resolved and this page has just spent it. */
  | { state: "asked"; gift: Gift; reading: AskedReading }
  /** The code resolved to nothing, the backend could not be asked, or a throttle. */
  | { state: "refused"; said: string };

export function RedeemGift() {
  const searchParams = useSearchParams();
  /*
    Read once into a plain string. `useSearchParams` answers a new object per
    render, and passing that to the effect below would re-run the lookup — which
    on this page is a request against a throttle of ten a minute.
  */
  const linked = searchParams.get("code") ?? "";

  const [result, setResult] = useState<State>(linked === "" ? { state: "entering" } : { state: "looking" });
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  /**
   * The code the page is working with, which is the link's until somebody types
   * over it. Held rather than derived because the second lookup's code is not
   * in the address and never will be — see the header.
   */
  const [code, setCode] = useState(linked);
  /** The address this state was built from, so a new one can reset it. */
  const [addressed, setAddressed] = useState(linked);

  /*
    A ref rather than state: it exists to keep an answer from a lookup the
    visitor has moved on from setting the screen, and nothing renders from it.
    Bumped on every lookup, and an answer whose ticket is stale is dropped.
  */
  const attempt = useRef(0);

  /*
    **Adjusted during render rather than in an effect**, which is React's own
    answer for state that has to reset when an input changes: an effect would
    paint the previous code's screen once against the new address before
    correcting itself, and setting state in one is a cascade the linter refuses
    on principle.

    What it covers is a second `?code=` arriving without a remount. That is not
    a journey this site offers today — nothing links here with a code, so the
    address only ever changes on a full load — and it is written this way
    because the alternative fails silently when it does: a stale gift on screen
    against a different code in the address, with the submit spending the wrong
    one.
  */
  if (addressed !== linked) {
    setAddressed(linked);
    setCode(linked);
    setResult(linked === "" ? { state: "entering" } : { state: "looking" });
  }

  /**
   * The lookup itself, with everything that touches the screen inside a
   * callback rather than in the calling frame.
   *
   * `useCallback` with no dependencies: it closes over the setters and the ref,
   * all of which are stable for the life of the component, so the effect below
   * can name it as a dependency and never re-run for it.
   */
  const look = useCallback((typed: string) => {
    const ticket = ++attempt.current;

    lookUpGift(typed, { locale: currentLocale() })
      .then((answer) => {
        if (attempt.current !== ticket) return;

        setResult(
          answer.state === "found"
            ? { state: "found", gift: answer.gift }
            : { state: "refused", said: redeemCopy.unknown },
        );
      })
      .catch((cause: unknown) => {
        if (attempt.current !== ticket) return;

        /*
          Loud here and one sentence on the page. From the outside a throttled
          lookup and a backend that is down look identical, and they need
          telling apart from in here — the code itself is never logged, being
          the whole authority to spend the gift.
        */
        console.error("The gift code could not be looked up.", cause);

        setResult({
          state: "refused",
          said: cause instanceof ApiRateLimitError ? redeemCopy.throttled : redeemCopy.unreachable,
        });
      });
  }, []);

  /** What a press does: the screen first, then the request. */
  function lookUp(typed: string): void {
    const trimmed = typed.trim();

    if (trimmed === "") return;

    setCode(trimmed);
    setResult({ state: "looking" });
    look(trimmed);
  }

  /*
    The one lookup that is not a press: the address carried a code. It runs once
    per code in the address — `linked` is a string, so a re-render with the same
    address does not ask again — and it is the only thing on this page that
    happens without somebody doing something. The `looking` screen it belongs
    with is already on, set above or by the initial state, so nothing here
    touches state before the answer does.

    It cannot spend anything. That is the whole reason lookup and redeem are two
    calls; see the header.
  */
  useEffect(() => {
    if (linked === "") return;

    look(linked);
  }, [linked, look]);

  async function ask(asked: Asking) {
    if (asking || (result.state !== "found" && result.state !== "asked")) return;

    setAsking(true);
    setFailed(false);

    try {
      // The code is the page's and the rest is the form's, which is the one
      // place those two become a request. See `Asking` in `lib/gifts.ts`.
      const answer = await redeemGift({ ...asked, code }, { locale: currentLocale() });

      if (answer.state === "asked") {
        setResult({ state: "asked", gift: result.gift, reading: answer.reading });
      } else if (answer.state === "spent") {
        /*
          **Lost the race, and the querent has to be told which race it was.**
          The code was good when this page looked it up and was spent in
          between — a second tab, or somebody the mail was forwarded to.
          Redemption is atomic against a row lock, so exactly one submit wins
          and this is the loser being told plainly rather than being shown a
          generic failure.
        */
        setResult({ state: "found", gift: { ...result.gift, redeemed: true, redeemedAt: null } });
      } else {
        setResult({ state: "refused", said: redeemCopy.unknown });
      }
    } catch (cause: unknown) {
      // A 422, a throttle, a 5xx, a network failure. **Nothing was spent in any
      // of them** — the refusal happens before the row is locked or because the
      // request never arrived — which is what the sentence under the button
      // says, and it is the half that matters to somebody holding a
      // non-expiring credential.
      console.error("The gift could not be redeemed.", cause);

      setFailed(true);
    } finally {
      setAsking(false);
    }
  }

  if (result.state === "found" || result.state === "asked") {
    const gift = result.gift;
    const reading = result.state === "asked" ? result.reading : null;
    /*
      The page this build has drawn for that product, or nothing. `undefined` is
      the ordinary answer for a reading the backend's catalogue holds and this
      one has never drawn — and for a withdrawn one, which still redeems because
      the person paid.
    */
    const page = readingPageFor(gift.productKey);

    const panel = (
      <RedeemPanel
        gift={gift}
        reading={reading}
        delivery={page?.delivery}
        asking={asking}
        failed={failed}
        onAsk={ask}
      />
    );

    if (page) {
      /*
        The seam, used for the second time and for the reason it was cut: this
        is `ReadingPresentation` with the commerce swapped out, not a page that
        hides half of itself in one mode.
      */
      return <ReadingPresentation reading={page} commerce={panel} />;
    }

    return (
      <PlainReading name={gift.name} description={gift.longDescription}>
        {panel}
      </PlainReading>
    );
  }

  return (
    <CodeEntry
      /*
        Remounted when the code changes, because the field is uncontrolled and
        React applies a `defaultValue` at mount and ignores it on an update. A
        code that did not resolve is what is in the box to be corrected.
      */
      key={code}
      code={code}
      said={result.state === "refused" ? result.said : null}
      looking={result.state === "looking"}
      onLookUp={lookUp}
    />
  );
}
