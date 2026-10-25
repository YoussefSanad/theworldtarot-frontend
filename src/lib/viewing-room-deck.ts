"use client";

import { useEffect, useState } from "react";

import { type ApiCard, fetchCards } from "./api.ts";
import { currentLocale } from "./locale.ts";
import type { ViewingRoomCard } from "@/content/viewing-room";

/**
 * The Viewing Room's deck, read from the backend.
 *
 * **The API is the only source.** Phase one derived the deck from
 * `content/library.ts` with a hardcoded set of locked cards, so the room could
 * be reviewed before anything was wired. That list is gone: which cards are on
 * the website, what they are called, what they look like and which of them
 * have films are all the backend's to say, and a second list here would be a
 * second place for a card to be called something.
 *
 * ## Why this is a hook and not a server fetch
 *
 * `next.config` is `output: "export"`. There is no server at runtime, so there
 * is no server component and no middleware to fetch from — and a build-time
 * fetch would bake one morning's deck into the HTML, which is wrong for a list
 * whose whole purpose is to say which films are ready *today*. So the request
 * happens in the browser, after mount, and the room draws a loading state over
 * the carousel while it is in flight.
 *
 * The shape follows `lib/product.ts`'s `ProductOffer` deliberately: a
 * discriminated union, so `cards` exists on `live` and nowhere else and a room
 * built from a state with no deck will not compile.
 */

export type ViewingRoomDeck =
  /** The request is in flight. Draw the room's chrome, and a loading carousel. */
  | { status: "loading" }
  /**
   * The backend answered with cards. **`cards` is non-empty on this arm** —
   * an empty deck is `empty` below, because the two want different words on
   * screen and collapsing them would draw an empty carousel with no
   * explanation.
   */
  | { status: "live"; cards: readonly ViewingRoomCard[] }
  /**
   * The backend answered, and there is nothing on the website in this language
   * yet: a freshly seeded site, or no card finished. A real state, not a
   * failure, and the room says so rather than looking broken.
   */
  | { status: "empty" }
  /** The request threw: network, CORS, 5xx. Offer a retry. */
  | { status: "unreachable" };

/**
 * The deck is fixed at twenty-two, so a table beats arithmetic. The Fool is 0
 * and has no Roman numeral, which is why this starts with a character Roman
 * numerals do not have.
 *
 * The same table `api.ts` holds for the reveal. Duplicated rather than shared
 * because the two map to different shapes — `TarotCard` keeps only the numeral,
 * this keeps both — and a shared helper would have to answer both, which is
 * more coupling than twenty-two string literals are worth.
 */
const ROMAN = [
  "0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI",
] as const;

/**
 * One wire card as the room needs it.
 *
 * Exported apart from the hook so the mapping can be exercised without
 * mounting anything — it is the one piece of this file that is pure, and the
 * numeral lookup is the part most likely to be got quietly wrong.
 *
 * **The id stays the backend's integer.** It is what `/cards/{id}/video` is
 * addressed with, and carrying a slug beside it would mean two handles for one
 * card and a join to keep in step.
 */
export function toViewingRoomCard(card: ApiCard): ViewingRoomCard {
  return {
    id: card.id,
    number: card.number,
    // Falls back to the integer rather than throwing: a deck longer than
    // twenty-two is the backend's business, and a card drawn with "22" in its
    // roundel is better than a room that refuses to render.
    numeral: ROMAN[card.number] ?? String(card.number),
    name: card.name,
    // An absolute URL and never null, per the contract — a card is on the
    // website only once it has both its copy and its picture. No dimensions
    // come with it, and the carousel fixes its own aspect ratio.
    image: { src: card.image },
    inViewingRoom: card.in_viewing_room,
  };
}

/**
 * Sorted by `number`, because deck order is what the carousel means.
 *
 * The contract says the listing already arrives in deck order, so this is
 * belt-and-braces rather than a correction — but the carousel's whole
 * affordance is moving through the Major Arcana in sequence, and a backend
 * that reorders its listing one day would otherwise shuffle the deck silently.
 */
export function toViewingRoomDeck(cards: readonly ApiCard[]): readonly ViewingRoomCard[] {
  return cards.map(toViewingRoomCard).sort((a, b) => a.number - b.number);
}

/** Which state an answer — or the lack of one — puts the room in. Pure. */
export function resolveDeck(
  cards: readonly ViewingRoomCard[] | undefined,
  failed: boolean,
): ViewingRoomDeck {
  if (cards === undefined) return { status: failed ? "unreachable" : "loading" };
  if (cards.length === 0) return { status: "empty" };

  return { status: "live", cards };
}

/**
 * What the backend last said, and which attempt it said it on.
 *
 * **One piece of state rather than a deck beside a `failed` boolean**, so
 * there is no render in which the two disagree — and, just as practically, no
 * reason to reset a flag at the top of the effect. A synchronous `setState` in
 * an effect body cascades renders, and this repo's lint rules refuse it;
 * carrying the answer and the failure together means the effect only ever
 * writes once, when something has actually arrived.
 *
 * `attempt` is what makes a retry's answer distinguishable from the answer it
 * replaces, rather than something to clear in advance.
 */
type Answered = {
  attempt: number;
  cards: readonly ViewingRoomCard[] | undefined;
  failed: boolean;
};

export function useViewingRoomDeck(): ViewingRoomDeck & { retry: () => void } {
  /** Bumped by `retry`, which is the whole of the re-request mechanism. */
  const [attempt, setAttempt] = useState(0);
  const [answered, setAnswered] = useState<Answered>({
    attempt: 0,
    cards: undefined,
    failed: false,
  });

  useEffect(() => {
    const controller = new AbortController();

    fetchCards({ locale: currentLocale(), signal: controller.signal })
      .then((answer) => {
        if (controller.signal.aborted) return;
        setAnswered({ attempt, cards: toViewingRoomDeck(answer), failed: false });
      })
      .catch(() => {
        // An abort is the ordinary case — the visitor left — and is not a
        // failure anybody should be shown.
        if (controller.signal.aborted) return;
        setAnswered((previous) => ({ attempt, cards: previous.cards, failed: true }));
      });

    return () => controller.abort();
  }, [attempt]);

  /**
   * A fresh attempt with no answer yet is loading again, **except when there
   * is a deck to keep** — `resolveDeck` holds it, which is the rule a retry
   * must not break by blanking the room it was asked to repair.
   */
  const settled = answered.attempt === attempt;
  const cards = settled || answered.cards !== undefined ? answered.cards : undefined;
  const failed = settled && answered.failed;

  return {
    ...resolveDeck(cards, failed),
    /**
     * Asks again, and **keeps whatever is on screen while it does**.
     *
     * Clearing `cards` first would be the obvious thing and is wrong: a deck
     * already in hand outranks a later failure — the rule `lib/product.ts`
     * states for a price and `lib/catalogue.ts` for the catalogue — so a retry
     * that also fails must leave the carousel the visitor was using rather
     * than replacing it with the error they just asked to get past.
     *
     * In practice `retry` is only reachable from the unreachable state today,
     * where there is nothing in hand to keep. It is written this way so that
     * stays true if anything ever offers a refresh from the live state.
     */
    retry: () => setAttempt((previous) => previous + 1),
  };
}
