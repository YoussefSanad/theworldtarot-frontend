/**
 * The Viewing Room's words (Figma `384:2`, "VIEWING ROOM 10_16").
 *
 * **The copy is the client's, transcribed from her frame.** Two artefacts are
 * corrected deliberately and both are layout rather than language: she writes
 * "GET A  READING" with a double space, and her closing line carries a `~`
 * where the line breaks. Neither is a character anybody is meant to read.
 *
 * ## The deck is not here any more
 *
 * It was, through phase one: derived from `content/library.ts` with three
 * cards marked unplayable by hand, so the room and its coming-soon treatment
 * could be reviewed before anything was wired. **The backend is the only
 * source now** — `GET /{locale}/cards` says which cards are on the website,
 * what they are called, what they look like and which of them have films, and
 * a list kept here beside it would be a second place for a card to be called
 * something. `lib/viewing-room-deck.ts` is where it comes from.
 *
 * `ViewingRoomCard` stays in this file because it is the shape the page's
 * components are written against, and they import their words from here
 * already.
 */

/**
 * One card as the Viewing Room needs it.
 *
 * `number` and `numeral` are both here and are not redundant: the integer is
 * what the deck sorts by, the Roman numeral is what the artwork's roundel
 * draws. `TarotCard` in `content/cards.ts` carries only the numeral as its
 * `number`, which is why this page does not reuse that type.
 */
export type ViewingRoomCard = {
  /**
   * **The backend's integer id**, and the thing `/cards/{id}/video` is
   * addressed with.
   *
   * It was the Library's slug through phase one, when the deck was bundled.
   * The contract is explicit that a card has no slug — "a card is never
   * reached by a URL a person reads" — so the integer is the only handle the
   * backend offers, and carrying a slug beside it would mean two identities
   * for one card and a join to keep in step.
   */
  readonly id: number;
  /** The number on the card, 0–21, and the order the deck is shown in. */
  readonly number: number;
  /** Roman numeral, as the roundel draws it. The Fool's is "0". */
  readonly numeral: string;
  readonly name: string;
  readonly image: { readonly src: string; readonly width?: number; readonly height?: number };
  /**
   * Whether there is a film to watch.
   *
   * **Not an access check**, which is the distinction `API_CONTRACT.md` is
   * emphatic about: it says a film exists, never that this visitor may watch
   * it. False means the film is still being prepared, and the card is shown as
   * coming soon rather than hidden or errored.
   */
  readonly inViewingRoom: boolean;
};

export const viewingRoom = {
  title: "The Living Tarot",
  subtitle: "CINEMATIC TAROT CARDS AS MOVING ART",
  carouselHint: "Click any card to experience the Living Tarot",

  panel: {
    heading: "Unlock the Viewing Room",
    body: "Enter a private viewing room for The Living Tarot — a cinematic art collection bringing all 22 Major Arcana to life through motion, atmosphere, light, and sound.",
    /** Three captions under three icons, each broken as her frame breaks it. */
    benefits: [
      { lines: ["ALL 22", "MAJOR ARCANA"] },
      { lines: ["LIFETIME", "ACCESS"] },
      { lines: ["MOTION,", "LIGHT & SOUND"] },
    ],
    action: "ENTER THE VIEWING ROOM",
    /**
     * The price line, carried as two pieces because only the first is ours to
     * replace.
     *
     * The panel prints `price + priceNote`, with `price` swapped for whatever
     * the backend holds for `viewing-room-pass` in the visitor's currency as
     * soon as it answers — see `lib/pass-price.ts`. The bundled `$29` is
     * fallback copy and never funds a payment: it is what the exported HTML
     * ships and what stays on screen if the API cannot be reached.
     *
     * Kept apart rather than templated into one string because the suffix is
     * the client's wording and the number is not, and a `{price}` placeholder
     * in copy she proofreads is a thing to get wrong.
     */
    price: "$29",
    priceNote: " — One-time payment",
    /** Two clauses because only the second is the link. */
    signIn: { lead: "Already Have Access? ", link: "Sign in Here." },

    /**
     * The switch-account line, for a visitor signed in **without** the pass.
     *
     * Not in her frame. `API_CONTRACT.md` warns that people pay under one
     * address and sign in as another, and this state is where that person
     * lands; a panel that only says "buy it" sends them to a 422.
     */
    account: { signedInAs: "Signed in as", switch: "Sign out / switch account" },

    /** Screen two, which her frame does not draw. See `PaymentPanel`. */
    payment: {
      back: "Back",
      loading: "Checking the price…",
      unavailable: "The pass cannot be bought right now. Please try again shortly.",
    },
  },

  /** The player's own states, which carry no words in her frame. */
  player: {
    play: "Play this film",
    resume: "Resume this film",
    replay: "Play this film again",
    retry: "Try again",
    loading: "Starting the film…",
    error: "This film could not be played.",
  },

  carousel: {
    /**
     * Her knob (`384:20`), which is a scrubber rather than two buttons — so
     * the label names the whole deck, and the control announces its own
     * position within it through `aria-valuenow`.
     */
    knob: "Move through the deck",
  },

  /**
   * The deck's own states, which her frame does not draw because it draws a
   * deck that is simply there.
   *
   * It is fetched in the browser now — the backend says which films exist, and
   * a static export cannot ask at build time — so there is a moment before it
   * arrives and a case where it never does. Both are words rather than a blank
   * band: a carousel that is empty for a second and a carousel that is empty
   * for good look identical, and only one of them is worth waiting through.
   */
  deck: {
    loading: "Summoning the deck…",
    /**
     * The backend answered, and has nothing on the website in this language
     * yet. A real state, not a failure — a freshly seeded site reaches it.
     */
    empty: "The deck is being prepared.",
    unreachable: "The deck could not be loaded.",
    retry: "Try again",
  },

  closing: {
    /**
     * Her two lines. The `~` in the frame is the break, not a character —
     * `Phrase` breaks between parts rather than inside them, so these are the
     * parts. Same treatment as the card pages' closing line.
     */
    lines: ["The cards can tell stories.", "now let them tell yours."],
    action: "GET A READING",
  },
} as const;
