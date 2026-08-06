"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { defaultRevealCard, findCard, type TarotCard } from "@/content/cards";
import { drawCard, fetchCard } from "@/lib/api";
import { createSessionValue } from "@/lib/session-value";
import { shouldWarm } from "@/lib/video-source";

/**
 * Shared state for the card reveal.
 *
 * The trigger and the card sit in different columns of the hero, and the
 * One-Card Experience will arrange them differently again, so the interaction
 * lives in context rather than in a single self-contained widget.
 */

export type RevealStatus = "idle" | "revealing" | "revealed";

/** Card face crossfade duration. */
export const REVEAL_CROSSFADE_SECONDS = 1.4;

type RevealContextValue = {
  status: RevealStatus;
  card: TarotCard;
  /** True when the card was carried over from earlier in the visit. */
  restored: boolean;
  /**
   * False until the client has hydrated (when `oncePerVisit`).
   * The CTA should not paint the idle button until then, to avoid a flash
   * when a card was already revealed this visit.
   */
  ready: boolean;
  reveal: () => void;
  /**
   * The visitor looks like they are about to press the button. Starts fetching
   * the film so the crossfade does not land on the lowest rendition.
   *
   * Separate from `reveal` because intent arrives before the click, and the few
   * hundred milliseconds between the two is the whole difference. Idempotent.
   */
  warm: () => void;
  /** True once warming has been asked for. `RevealStage` attaches on this. */
  warming: boolean;
  onRevealComplete: () => void;
};

const RevealContext = createContext<RevealContextValue | null>(null);

const revealedCard = createSessionValue("wt.reveal.card");

const serverSnapshot = () => null;

/** Sync client/hydration flag — no useEffect delay after first paint. */
const subscribeHydration = () => () => {};
const getHydrated = () => true;
const getServerHydrated = () => false;

export function RevealProvider({
  children,
  card = defaultRevealCard,
  /** The homepage allows one reveal per visit; the paid experience does not. */
  oncePerVisit = false,
  onRevealed,
}: {
  children: ReactNode;
  card?: TarotCard;
  oncePerVisit?: boolean;
  onRevealed?: (card: TarotCard) => void;
}) {
  const [interaction, setInteraction] = useState<RevealStatus>("idle");
  const storedId = useSyncExternalStore(revealedCard.subscribe, revealedCard.get, serverSnapshot);
  const hydrated = useSyncExternalStore(subscribeHydration, getHydrated, getServerHydrated);

  // The card the backend chose, and the one being restored from earlier in the
  // visit. Only one of the two is ever fetched, decided by whether this visitor
  // already has a card in session storage.
  const [drawn, setDrawn] = useState<TarotCard | null>(null);
  const [restoredCard, setRestoredCard] = useState<TarotCard | null>(null);
  const [restoreSettled, setRestoreSettled] = useState(false);

  // The idle button must not paint for somebody who already has a card, or it
  // flashes and swaps. Hydration alone used to answer that, because the stored
  // card was found synchronously. It now takes a request, so a visitor with a
  // stored id waits for it. A first-time visitor does not, and the hero's
  // primary ask still paints immediately.
  const ready = oncePerVisit ? hydrated && (!storedId || restoreSettled) : true;

  /**
   * **This runs in the browser and must keep doing so.** The film's URL is
   * signed against the address the request came from, so drawing on a server or
   * at build time would bind it to that machine and refuse every real visitor.
   * A static export has no server, which is what makes it true today. See
   * `@/lib/api`.
   */
  useEffect(() => {
    const controller = new AbortController();

    // The homepage draws once per visit. Anywhere else, every mount is a fresh
    // card, so there is nothing to restore.
    const seen = oncePerVisit ? revealedCard.get() : null;

    const request = seen
      ? fetchCard(seen, { signal: controller.signal }).then(setRestoredCard)
      : drawCard({ signal: controller.signal }).then((card) => {
          setDrawn(card);

          // Null is the backend saying no card has both a finished film and a
          // poster frame yet. A real state rather than a fault, and worth
          // separating from a broken API, because the two want very different
          // responses from whoever reads this.
          if (!card) {
            console.info("No card has a film to draw yet, showing the bundled card.");
          }
        });

    request
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        // Loud here and invisible to the visitor: the bundled card takes over
        // below, so a broken API looks like a working homepage. Without this
        // line it would also look like one to us.
        console.error("The reveal could not reach the API, falling back to the bundled card.", error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setRestoreSettled(true);
      });

    return () => controller.abort();
  }, [oncePerVisit]);

  const seenThisVisit = oncePerVisit
    ? (restoredCard ?? findCard(storedId))
    : undefined;
  // A stored card only takes over before the visitor interacts; once they have
  // pressed the trigger, this render's own state is what counts.
  const restored = interaction === "idle" && Boolean(seenThisVisit);

  // The card the backend drew, or the bundled one when it could not be reached.
  // The fallback is the reason the homepage cannot break: the backend has none
  // of its own and 404s until a card has both a finished film and a poster, so
  // without this the hero of the site would be an error state until Jennifer's
  // content lands.
  const activeCard = seenThisVisit ?? drawn ?? card;

  const [warming, setWarming] = useState(false);

  const warm = useCallback(() => {
    // Data Saver, or a connection slow enough that spending bandwidth on a
    // maybe would make the page worse rather than better.
    if (!shouldWarm()) return;

    setWarming(true);
  }, []);

  const reveal = useCallback(() => {
    // A click with no hover, from a touch screen or the keyboard. Warming now is
    // late but not useless: it still removes a round trip from the click path.
    setWarming(true);
    setInteraction((current) => (current === "idle" ? "revealing" : current));
  }, []);

  const onRevealComplete = useCallback(() => {
    setInteraction("revealed");
    if (oncePerVisit) revealedCard.set(activeCard.id);
    onRevealed?.(activeCard);
  }, [activeCard, oncePerVisit, onRevealed]);

  const value = useMemo(
    () => ({
      status: restored ? ("revealed" as const) : interaction,
      card: activeCard,
      restored,
      ready,
      reveal,
      warm,
      warming,
      onRevealComplete,
    }),
    [restored, interaction, activeCard, ready, reveal, warm, warming, onRevealComplete],
  );

  return <RevealContext.Provider value={value}>{children}</RevealContext.Provider>;
}

export function useReveal(): RevealContextValue {
  const context = useContext(RevealContext);
  if (!context) throw new Error("useReveal must be used inside a RevealProvider");
  return context;
}
