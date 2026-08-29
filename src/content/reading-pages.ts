import { readingPageArtwork, videoPosters, videos, type ImageAsset } from "@/lib/assets";

/**
 * A written reading's own page — the template behind `/readings/month-ahead`,
 * built from the client's frame `329:496` (`month-ahead-reading-page`, 1920x3191).
 *
 * **Three products share this one page.** Three Card, Month Ahead and a future
 * In-Depth reading are the same purchase and the same fulfilment — the site
 * takes an optional question and a payment, the client writes the reading
 * offline and emails a PDF — so spread, card count and price are copy, never
 * branching. See the workflow note in [`./README.md`](./README.md). Adding the
 * other two is a `ReadingPage` here and a five-line route beside
 * `src/app/(site)/readings/month-ahead/page.tsx`; there is nothing else to
 * build for them.
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
    body: ["Tell us where to send it, and", "what you would like it to say."],
    /** Two states of one control; the second is how a visitor gets back. */
    enter: "gift a reading",
    leave: "a reading for myself",
    email: { label: "Recipient's email address", placeholder: "Their email address…" },
    message: { label: "Personal message (optional)", placeholder: "Add a message to your gift…" },
    /**
     * Said once, under the fields, because the flow is not the obvious one:
     * nothing is asked of the reading until the recipient redeems it.
     */
    note: "They will choose their own question when they redeem it.",
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
     * It does not say "Pay with Card". The **hosted page** offers every method
     * turned on in the Dashboard, and a button that names one of them would be
     * wrong the first time somebody pays with anything else. The price is set
     * beside it rather than in it, so the label is a constant and the amount is
     * the API's.
     *
     * ~~"Buy Now".~~ **"Continue to Checkout" from 29 August 2026**, at the
     * client's request, because the old label promised something the button
     * does not do. Pressing it buys nothing: it places a `pending` order and
     * sends the browser to Stripe, where the customer picks a method and pays.
     * The money is collected on a page this one never sees. `buying` below has
     * said "Taking you to checkout…" all along, so the resting label was
     * disagreeing with its own pending state.
     *
     * **The card mark beside it is narrower than the road, and that is
     * accepted rather than missed.** `marks.card` is the client's own frame
     * icon, and the hosted page still takes Apple Pay and Google Pay — proved
     * by hand on 29 August 2026. What makes it defensible is the panel around
     * it: the wallets have their own buttons directly above, so by the time a
     * customer reaches this frame, card is what is left. The *label* still
     * names no method, which is what keeps the paragraph above true.
     */
    buy: "Continue to Checkout",
    /**
     * Held across both round trips — the order, then the payment — because the
     * browser does not leave until the second one answers, and a button that
     * looks idle for a second and a half is a button pressed twice.
     */
    buying: "Taking you to checkout…",
    /**
     * Under the button in gift mode, where the button is inert.
     *
     * `POST /orders` has no field for a recipient email or a gift message, so a
     * live button here would charge somebody for a gift delivered to
     * themselves. Gifting is the code model and a separate milestone: the buyer
     * names a recipient, the recipient redeems a code and writes their own
     * question.
     */
    giftingComing: "Gifting is not open yet. A reading for yourself can be bought now.",
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
    /**
     * Set in Cinzel in the frame, which renders lowercase as small capitals —
     * so this reads as REDEEM GIFT CODE on the page without the copy shouting
     * here.
     */
    redeem: "redeem gift code",
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
    /* The house name is set in the brand's own face here; see `<HouseName>`. */
    ["Presented on original World Tarot", "artwork"],
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
