/**
 * The Viewing Room's words and its deck (Figma `384:2`, "VIEWING ROOM 10_16").
 *
 * **The copy is the client's, transcribed from her frame.** Two artefacts are
 * corrected deliberately and both are layout rather than language: she writes
 * "GET A  READING" with a double space, and her closing line carries a `~`
 * where the line breaks. Neither is a character anybody is meant to read.
 *
 * ## The deck is derived, not restated
 *
 * `content/library.ts` already holds all twenty-two in deck order with their
 * numerals, their names and their artwork — and those names are the client's
 * *with her typos corrected*, a history that file documents at length. A second
 * hand-written list here would be a second place for a card to be called
 * something, and the two would drift the first time she renames one.
 *
 * So this maps hers rather than repeating it. What this page adds is the one
 * fact the Library has no use for: whether a film exists yet.
 */

import { majorArcana } from "./library.ts";

/**
 * One card as the Viewing Room needs it.
 *
 * `number` and `numeral` are both here and are not redundant: the integer is
 * what the deck sorts by, the Roman numeral is what the artwork's roundel
 * draws. `TarotCard` in `content/cards.ts` carries only the numeral as its
 * `number`, which is why this page does not reuse that type.
 */
export type ViewingRoomCard = {
  /** The Library's slug. Opaque here — a handle for selection, nothing more. */
  readonly id: string;
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

/**
 * The cards whose films are not ready.
 *
 * **Scaffold data, and deliberately not empty.** Phase one has no backend to
 * say which films exist, and a deck where every card is playable leaves the
 * coming-soon treatment unreviewed until after it is wired — which is exactly
 * the state nobody looks at and everybody ships. Three of them, spread through
 * the deck rather than bunched at the end, so the carousel shows the state in
 * passing rather than only at one edge.
 *
 * Deleted in phase two, when `in_viewing_room` arrives from the API.
 */
const FILMS_NOT_READY: ReadonlySet<string> = new Set(["the-hangman", "the-tower", "judgement"]);

export const viewingRoomDeck: readonly ViewingRoomCard[] = majorArcana.map((card, index) => ({
  id: card.slug,
  // The Library lists the deck in order and draws its own numerals, so position
  // is the number. Taken from the index rather than parsed back out of the
  // Roman numeral, which would be arithmetic to recover something already known.
  number: index,
  numeral: card.numeral,
  name: card.name,
  image: card.image,
  inViewingRoom: !FILMS_NOT_READY.has(card.slug),
}));

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
    price: "$29 — One-time payment",
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
    first: "Jump to the first card",
    last: "Jump to the last card",
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
