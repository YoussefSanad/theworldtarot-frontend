import { readingPageArtwork, videoPosters, videos, type ImageAsset } from "@/lib/assets";

/**
 * A written reading's own page — the template behind `/readings/month-ahead`,
 * built from the client's frame `329:496` (`month-ahead-reading-page`, 1920x3191).
 *
 * **Three products share this one page**, and all three are built: Three Card,
 * Month Ahead and In-Depth are the same purchase and the same fulfilment — the
 * site takes an optional question and a payment, the client writes the reading
 * offline and emails a PDF — so spread, card count and price are copy, never
 * branching. See the workflow note in [`./README.md`](./README.md). A fourth
 * would be a `ReadingPage` here, **an entry in `readingPages` at the foot of
 * this file**, and a route beside
 * `src/app/(site)/readings/month-ahead/page.tsx` that differs from it only in
 * which constant it imports; there would be nothing else to build for it.
 *
 * The middle one is the one that fails quietly. A `ReadingPage` that is never
 * registered still renders its own page perfectly and still sells, and the only
 * thing that goes wrong is a confirmation screen that cannot name what was
 * bought — a plainer sentence rather than a broken one, which is exactly the
 * kind of wrong that ships. See `readingPageFor`.
 *
 * **The three frames are three PSDs, not one with the copy swapped.** Month
 * Ahead came first (`329:496`); Three Card and In-Depth arrived on 2 September
 * 2026 drawn from it. Nothing structural moved between them — same panels, same
 * ornament, same controls in the same order — so they are the same route three
 * times over. Where a later frame contradicts copy that predates it, the
 * contradiction is noted against the entry and reproduced rather than
 * reconciled; see `threeCard`.
 *
 * That split is what `readingPageChrome` is: everything the three pages say
 * identically lives there once, and a `ReadingPage` holds only what changes.
 *
 * Line breaks follow the same rule as the readings index — see the note at the
 * top of [`./readings.ts`](./readings.ts). An array is a list of *phrases*
 * rendered by `<Phrase>`, riding one line where there is room and breaking at
 * the client's chosen point where there isn't; a paragraph left to wrap to its
 * measure is one string.
 */

/** Everything the three written readings' pages say the same way. */
export const readingPageChrome = {
  /**
   * The loop under the title. The client supplied one film for all three
   * readings — it is the deck, not the spread — so it lives here rather than
   * on a `ReadingPage`.
   */
  hero: {
    video: videos.readingCards,
    poster: videoPosters.readingCards,
    /** Read by anyone who gets the still rather than the film. */
    alt: "Tarot cards scattered around one lit from within by golden fire",
  },

  question: {
    heading: "Ask a Question",
    body: ["Begin your reading by entering", "an optional question."],
    /** The frame draws no label; screen readers get one. */
    label: "Your question",
    placeholder: "Enter your question…",
  },

  /**
   * Buying the reading for somebody else, which the page does **as a mode
   * rather than as a second page** — see `ReadingOrder`.
   *
   * The one hard rule is that the purchaser never sees a question field: the
   * recipient asks their own after they redeem. So this replaces `question`
   * outright rather than sitting beside it.
   */
  gift: {
    heading: "Recipient Details",
    body: ["Who should receive your gift?", "Add their email address and a personal message below."],
    /**
     * Two states of one control; the second is how a visitor gets back.
     *
     * ~~Both lowercase.~~ **Title case from 30 August 2026.** They were stored
     * lowercase because the frame was set in Cinzel, which has no lowercase and
     * drew small capitals in their place; the panel is Gill Sans Light now and
     * renders what is written here. See `.checkout-option` in `globals.css`.
     *
     * `leave` is not in the client's frame — the frame only shows the resting
     * state — and is re-cased with the rest because it is the same button, and
     * one lowercase label among three title-cased siblings is the worse of the
     * two mistakes.
     */
    enter: "Gift a Reading",
    leave: "A Reading for Myself",
    /**
     * The **gift signature** — the name the recipient is told the gift is from,
     * and the first field on the section from 3 September 2026 (#71).
     *
     * **It is labelled as who the gift is *from*, never "Your Name".** An order
     * may legitimately carry no name at all since #52; the card road collects
     * the buyer's identity on Stripe's page, after the order already exists;
     * and a wallet supplies a billing address rather than a contact. So the
     * name on the payment is neither reliably present nor the right answer:
     * "Mum" is a truer signature than whatever is on the card.
     *
     * **Required, which is a trust decision rather than a completeness one.**
     * An unsolicited mail carrying a code, from a brand the recipient may never
     * have heard of, is phishing-shaped. A name they recognise is the one
     * signal that separates it from one, which is why this field cannot be
     * optional even though the message below it is. See `CONTEXT.md`.
     */
    signature: { label: "Who the gift is from", placeholder: "Who the gift is from…" },
    email: { label: "Recipient's email address", placeholder: "Recipient’s email address…" },
    /**
     * The address a second time, because **the buyer never receives the code**.
     *
     * That is the whole argument and it is not a general preference for
     * confirm-fields. On an ordinary purchase a mistyped address costs the
     * buyer their receipt, which they can ask for again from an order they can
     * still see. Here the one mail that carries the gift code goes to an
     * address only the buyer knows, and a typo sends a paid, non-expiring
     * bearer credential to a stranger or to nobody — with no expiry to reclaim
     * it and nothing in the buyer's hands to resend. See the backend's
     * `docs/adr/0005-gift-codes-do-not-expire.md`.
     *
     * `mismatch` is written onto the field itself with `setCustomValidity` and
     * surfaces through the form's one `reportValidity()` call; nothing here
     * raises an error of its own. It reaches `src/lib`, which can import no
     * copy, on the field's own wrapper as `data-mismatch` — see
     * `markGiftAddresses` in `lib/order-note.ts` for why that is load-bearing
     * on the wallet road.
     */
    confirmation: {
      label: "Confirm the recipient's email address",
      placeholder: "Confirm the recipient’s email address…",
      mismatch: "These two email addresses do not match.",
    },
    message: { label: "Personal message (optional)", placeholder: "Write a personal message…" },
    /**
     * Said once, under the fields, because the flow is not the obvious one:
     * nothing is asked of the reading until it reaches the person it is for.
     *
     * ~~"They will choose their own question when they redeem it."~~
     * **Reworded on 30 August 2026**, in the change that made this panel take
     * money in gift mode. "Redeem" describes the code model, which is a
     * milestone nobody has started — and a mechanic named to a buyer who is
     * about to pay is a promise about how their gift arrives. What is true is
     * the part that survives either model: the recipient is asked, not the
     * buyer, which is why there is no question field on this section.
     */
    note: "They will choose their own question when the reading reaches them.",
  },

  checkout: {
    heading: "Get My Reading",
    /**
     * The anchor the page's closing call to action scrolls back to. The frame
     * draws the button and gives it nowhere to go; every other control on the
     * page is above it.
     */
    anchor: "get-my-reading",
    /** Apple Pay and Google Pay are marks, so only these two carry a label. */
    card: "Pay with Card",
    /**
     * The one control on this panel that takes money, and the whole of what
     * three of the client's five frames became for the length of the interim.
     *
     * It does not say "Pay with Card", and no label it has worn ever has. The
     * **hosted page** offers every method turned on in the Dashboard, and a
     * button that names one of them would be wrong the first time somebody pays
     * with anything else. "Pay Another Way" keeps that and says what the frame
     * is for besides: another way than the two wallet buttons above it.
     *
     * **It does not quote the price either.** ~~The amount was set beside it,
     * so the label could be a constant and the number the API's.~~ The panel
     * already states the price once, above these frames and in display type, and
     * a second telling at nav size was what made this label — the longest on the
     * panel — wrap onto two lines and stand taller than the frames beside it.
     * Removed 29 August 2026 at the client's request; see `HostedCheckoutButton`.
     *
     * ~~"Buy Now".~~ ~~"Continue to Checkout" from 29 August 2026.~~ **"Pay
     * Another Way" from 30 August 2026**, both at the client's request.
     *
     * The first reversal was about a promise the button does not keep: pressing
     * it buys nothing — it places a `pending` order and sends the browser to
     * Stripe, where the customer picks a method and pays, and the money is
     * collected on a page this one never sees. `buying` below has said "Taking
     * you to checkout…" all along, so the resting label was disagreeing with
     * its own pending state.
     *
     * The second is the client's wording and it does not take that back: this
     * is still the road that leaves, and "Pay Another Way" is read against the
     * wallet buttons directly above rather than on its own. It is also the
     * shortest label the frame has worn, which is what finally settles the wrap
     * `.checkout-option`'s padding was loosened for.
     *
     * **The card mark beside it is narrower than the road, and that is
     * accepted rather than missed.** `marks.card` is the client's own frame
     * icon, and the hosted page still takes Apple Pay and Google Pay — proved
     * by hand on 29 August 2026. What makes it defensible is the panel around
     * it: the wallets have their own buttons directly above, so by the time a
     * customer reaches this frame, card is what is left. The *label* still
     * names no method, which is what keeps the paragraph above true.
     */
    buy: "Pay Another Way",
    /**
     * Held across both round trips — the order, then the payment — because the
     * browser does not leave until the second one answers, and a button that
     * looks idle for a second and a half is a button pressed twice.
     */
    buying: "Taking you to checkout…",
    /**
     * Under the button in gift mode, where **both controls now take money** and
     * what is not yet built is the delivery behind them.
     *
     * ~~"Gifting is not open yet. A reading for yourself can be bought now."~~
     * ~~"Gifting is not open yet, so there is no way to pay for one. A reading
     * for yourself can be bought now."~~ **Rewritten on 30 August 2026, later
     * the same day**, when the client asked for the wallet row to stay on the
     * panel through the gift toggle and the checkout button was un-gated beside
     * it. Both
     * superseded strings say gifting cannot be paid for, and the moment either
     * control charged a card that stopped being true — a note contradicting the
     * button above it is worse than no note at all. Unlike the copy around it
     * this wording is ours and not the client's — gift mode has no frame in her
     * design — and it goes to her with the rest.
     *
     * **What it now has to say is that a person is in the loop.** `POST
     * /orders` still has no field for a recipient, so the gift's signature,
     * address and message ride to the backend on the order line as prose and a
     * human reads them there; see `lib/order-note.ts`. That is a real
     * difference from buying for yourself and the buyer is owed it before they
     * pay, because the reading does not simply arrive at the address they
     * typed.
     *
     * **It promises email rather than a timeframe.** Fulfilment is manual on
     * every order here, gift or not, so no sentence on this panel can honestly
     * quote a delay — and one that did would be a promise the panel has no way
     * of keeping.
     *
     * **It names no payment method, and that is the constraint that wrote it.**
     * This note is shown in gift mode on every device, including one with no
     * wallet where the row is collapsed to nothing — so copy naming Apple Pay
     * or Google Pay would describe a button that customer has never seen.
     * Naming neither is true on both, and it is what lets one note stand for
     * whichever controls are drawn.
     */
    giftingComing:
      "Gifting is still being set up, so we will arrange delivery with you by email once you have paid.",
    /**
     * A refused order, a refused payment, or an instruction this build cannot
     * act on. **It says nothing has been charged**, because nothing has: an
     * order is a record, and the money is collected on Stripe's page which the
     * customer never reached.
     */
    buyFailed: "We could not start the checkout, and nothing has been charged. Please try again.",
    /**
     * The wallet's "it did not happen" sentence, and **the one place two
     * channels share a form of words on purpose**.
     *
     * It is the message `paymentFailed()` writes into the wallet sheet when the
     * sheet is still open, and the message that lands under the row when the
     * confirmation refused the payment after Stripe had already closed it. The
     * customer's situation is identical in both — nothing was taken, and they
     * may press again — so a second wording would be a difference that says
     * nothing.
     */
    walletFailed: "We could not take this payment. Nothing has been charged.",
    /**
     * Written into the wallet sheet when the gift section refuses the press.
     *
     * **A separate sentence from `walletFailed`, because the customer can act
     * on this one.** "We could not take this payment" is true of both, and on
     * its own it would send somebody to try a second time at a form that will
     * refuse them identically. This says where to look.
     *
     * ~~"Please add the recipient's email address before paying for a gift."~~
     * **Widened on 3 September 2026** (#71), when the section grew a **gift
     * signature** and a confirm-address beside the one field it used to have.
     * Three different faults now reach this sentence — a missing signature, a
     * missing address, and two addresses that disagree — and copy naming only
     * the address would be wrong on two of them. It no longer names a field
     * because it can no longer know which one; `orderFormAccepts` marks and
     * focuses the offending field itself, and the browser's own message on it
     * is what says which.
     *
     * It reaches the sheet rather than the page because the sheet is where the
     * customer is: the check runs before `elements.submit()`, so no payment has
     * been submitted and `paymentFailed()` is still ours to call. The field is
     * marked and focused underneath by `orderFormAccepts`, for when Stripe
     * closes the sheet over it.
     */
    walletNeedsGiftDetails:
      "Please check the gift's details before paying. Nothing has been charged.",
    /**
     * Under the wallet row, after `stripe.confirmPayment` has already been
     * called and has come back wrong.
     *
     * **It does not say nothing was charged, and that is the whole reason it is
     * a second sentence rather than `buyFailed`.** By the time this is reached
     * a client secret exists and has been used; the request may have reached
     * Stripe and been acted on before the answer came back. A false claim about
     * a customer's money is worse than an unhelpful true one, so this points at
     * the receipt, which is the record that counts.
     *
     * It is on the page rather than in the wallet sheet because Stripe has
     * already closed the sheet by this point — see `ExpressCheckout.tsx`, where
     * calling `paymentFailed()` after a confirmation is the defect this copy
     * was added for on 29 August 2026.
     */
    walletUnresolved:
      "We could not complete this payment. If you were charged, your receipt will arrive by email.",
    /**
     * Read out where the price will be while the catalogue is being asked for
     * it. The resting state itself is a shape rather than words — the panel
     * holds its height and says nothing it might have to take back — so this is
     * the only description of it a screen reader gets.
     */
    pricePending: "Fetching the price",
    secure: "Secure checkout powered by Stripe",
  },

  included: { heading: "Your Reading" },

  gate: {
    heading: "Beyond the Gate",
    subtitle: "Your Journey Begins Here",
    image: readingPageArtwork.gate,
    imageAlt: "A lantern-lit stone archway on a mossy woodland path",
  },

  /** The three props under the panels, each opened by a compass. */
  features: [
    { title: "Led by the Cards", body: ["Each reading unfolds through the", "archetypes themselves"] },
    { title: "Composed with Intention", body: ["Original artwork paired with", "thoughtful interpretation"] },
    { title: "Clarity in Motion", body: ["Insight that illuminates your", "next chapter"] },
  ],

  closingAction: "GET MY READING",
} as const;

/**
 * The rush upgrade, and the switch that decides whether it exists.
 *
 * **`enabled` is the CMS's, not the code's.** Off — which is the default and
 * the state that ships — a reading offers one delivery and simply states it,
 * exactly as the client's frame draws it. On, the same line becomes a choice
 * of two with standard still selected, so turning it on never changes what a
 * visitor gets by doing nothing.
 *
 * It is a plain `boolean` rather than a literal `false` on purpose: narrowed
 * to a constant, the branch that renders the choice would read as dead code to
 * everything that looks at this file.
 */
export const rushDelivery: { enabled: boolean; label: string; surcharge: string; standard: string } = {
  enabled: false,
  label: "24-Hour Rush",
  surcharge: "+$25",
  standard: "Standard Delivery",
};

/**
 * The most a question — or a gift message — may run to, with the counter under
 * the field written from it. Enforced on the field as well, so the limit is
 * the same number in both places.
 */
export const questionLimit = 500;

export type ReadingPage = {
  /** Matches the `Reading` of the same id on the readings index. */
  id: string;
  /**
   * The backend's permanent, untranslated identifier for the thing this page
   * sells — `month-ahead`, `three-card`, `in-depth`. It is what the price is
   * read by (`useProduct`) and what an order line will name.
   *
   * Spelled out rather than reusing `id`, which the two agree with today. `id`
   * exists to match the readings index, and a page that quotes a price off a
   * key must say which key it means rather than inherit one from a list of
   * artwork. See `docs/plans/reading-page-live-price.md`.
   */
  productKey: string;
  title: string;
  tagline: readonly string[];
  /**
   * **Copy, and only ever copy.** The price the site advertises when the API
   * cannot be reached, so the page does not go blank where the number was.
   *
   * It is not money and cannot become money: it carries no currency, and its
   * digits are a rendering rather than minor units. Nothing a payment is built
   * from may come from here — that is `Money`, from the product endpoint, and
   * a page with no live money offers no way to pay. See `lib/product.ts`.
   */
  price: string;
  /** Shown as drawn while `rushDelivery` is off, and as the standard option once it is on. */
  delivery: string;
  /** What Your Reading lists, one entry per medallion. */
  included: readonly (readonly string[])[];
  testimonial: { quote: readonly string[]; attribution: readonly string[] };
  /** The line the page closes on, above its last call to action. */
  closing: readonly string[];
};

/** Kept exported for the artwork type; the hero is chrome, the rest is copy. */
export type { ImageAsset };

/**
 * The frame the client delivered on 2 September 2026 alongside the In-Depth
 * one, drawn from the same 1920x3191 template as `month-ahead` and changing
 * nothing but the fields below.
 *
 * **Two things in it disagree with the readings index, and both are left
 * alone here.**
 *
 * The price is the loud one: the index and the homepage tile sell this at $52
 * and the new frame sets $75, which is also Month Ahead's price — the frame
 * looks copied from that one and not fully re-priced. It does not decide
 * anything, because `price` is the string shown only when the catalogue cannot
 * be reached; the money is the backend's, keyed on `productKey`. It is written
 * as drawn rather than reconciled, so the fallback quotes the client's own
 * latest frame and the two lists that predate it are hers to settle.
 *
 * The other is `included[1]`, which is Month Ahead's second bullet verbatim —
 * "the weeks ahead" is a forecast's promise rather than a past/present/future
 * spread's. Reproduced as drawn for the same reason.
 */
export const threeCard: ReadingPage = {
  id: "three-card",
  productKey: "three-card",
  title: "3 Card Reading",
  tagline: ["One Question. Three Cards.", "Your Path Illuminated."],
  price: "$75",
  delivery: "Delivery Time: within 24 hours",
  included: [
    ["A Three Card Reading", "focused on your path forward"],
    ["Prepare for the weeks ahead", "with insight"],
    ["Thoughtful written interpretation"],
    /* Three phrases for two drawn lines; see the note on `monthAhead`. */
    ["Presented on original", "World Tarot", "artwork"],
    ["Delivered by email within 24 hours"],
  ],
  testimonial: {
    /*
      Split at a sentence, not at the frame's rag. `ReadingTestimonial` sets
      each entry as its own block and balances it, so an entry is a chunk that
      wraps rather than a finished line — her three short rows stored literally
      would set three hard lines far inside a measure that holds more, and the
      quote would rag down the frame. Month Ahead's is broken the same way.
    */
    quote: [
      "“The past was remarkably accurate. The present offered clarity.",
      "Now I’m watching the future unfold with fresh eyes.”",
    ],
    attribution: ["NIKKI M.", "BURLINGTON, VT"],
  },
  closing: ["Every question has a story", "waiting to be told"],
};

export const monthAhead: ReadingPage = {
  id: "month-ahead",
  productKey: "month-ahead",
  title: "Month Ahead Reading",
  /** One line in the frame; two phrases so it breaks where she breaks it. */
  tagline: ["One Month. Five Cards.", "a clear path ahead."],
  price: "$75",
  delivery: "Delivery Time: within 24 hours",
  included: [
    ["A Month-Ahead Reading", "focused on your path forward"],
    ["Prepare for the weeks ahead", "with insight"],
    ["Thoughtful written interpretation"],
    /*
      The house name is set in the brand's own face here; see `<HouseName>`.

      Three phrases for the two lines the frame draws, because at 1920 "artwork"
      is what will not fit and the break falls after the name either way —
      splitting a phrase only ever *adds* a place the line may break, it never
      moves one. The extra place is the one a phone needs: the whole of
      "Presented on original World Tarot" is wider than the measure a 375px
      panel leaves, and without a break inside it the line wraps mid-name and
      spills "artwork" onto a third row.
    */
    ["Presented on original", "World Tarot", "artwork"],
    ["Delivered by email within 24 hours"],
  ],
  testimonial: {
    quote: [
      "“It gave me a clearer sense of what to expect over the month ahead.",
      "By month’s end, I was amazed by how much had resonated.”",
    ],
    attribution: ["RILEY S", "PORTLAND, ME"],
  },
  closing: ["What is unfolding", "has already begun"],
};

/**
 * The second of the two frames delivered on 2 September 2026, and the only one
 * of the three written readings that is not a 24-hour delivery — 48 hours is
 * said twice on the panel, once as the delivery line under the price and once
 * as the last thing `included` lists, exactly as the client draws it.
 *
 * **Twelve cards here, where the readings index says Celtic Cross.** The index
 * sells this as "the complete picture through the Celtic Cross", which is a
 * ten-card spread; this frame's tagline and first bullet both say twelve. The
 * newer frame is reproduced as drawn and the index is left as it is — the card
 * count is copy either way and neither number reaches an order — but the two
 * are hers to settle.
 */
export const inDepth: ReadingPage = {
  id: "in-depth",
  productKey: "in-depth",
  title: "In-Depth Reading",
  tagline: ["One Question. Twelve Cards.", "A Deeper Story Revealed."],
  price: "$125",
  delivery: "Delivery Time: within 48 hours",
  included: [
    ["A twelve-card reading exploring your", "question in depth"],
    ["Insight into deeper patterns and themes", "shaping your story"],
    ["Clear guidance that brings perspective", "to complex situations"],
    ["Presented on original", "World Tarot", "artwork"],
    ["Delivered by email within 48 hours"],
  ],
  testimonial: {
    /* Chunked at the sentence, as on the other two; see `threeCard`. */
    quote: [
      "“This went so much deeper than I expected.",
      "It connected things I hadn’t seen before and gave me real clarity about how I got here—and where to go next.”",
    ],
    attribution: ["RACHEL T.", "SEDONA, AZ"],
  },
  closing: ["The deeper the journey,", "the richer the story"],
};

/**
 * Every reading with a page of its own, which is every reading that can be
 * bought.
 *
 * All three, from 3 September 2026. It is a list rather than the three exports
 * above because what wants it is a lookup by **product key** — the confirmation
 * screen, which is handed a key by the record a checkout left in the tab and has
 * to turn it into a name a customer recognises.
 *
 * Ordered as the readings index orders them, which is the order a visitor meets
 * them in. Nothing reads position — `readingPageFor` searches by key — so the
 * order is for whoever opens this file next.
 */
export const readingPages: readonly ReadingPage[] = [threeCard, monthAhead, inDepth];

/**
 * The page that sells one product key, or `undefined` for a key nothing here
 * sells.
 *
 * **The key, never the `id`.** They are the same three strings today and the
 * two fields exist separately for the reason `productKey` gives above: `id`
 * matches the readings index, which is a list of artwork, and a product key is
 * the backend's. Reading a name off the index by treating one as the other is
 * exactly the conflation that comment was written to prevent, and it would go
 * wrong silently the first time the backend named a product something the
 * artwork list spells differently.
 *
 * `undefined` is an ordinary answer rather than a fault. The backend's
 * catalogue is not this repository's, so it can hold a product this build has
 * never had a page for — and the caller wants a plainer sentence in that case,
 * not an error and not a guess.
 */
export function readingPageFor(productKey: string): ReadingPage | undefined {
  return readingPages.find((page) => page.productKey === productKey);
}
