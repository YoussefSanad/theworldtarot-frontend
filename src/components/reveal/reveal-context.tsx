"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { defaultRevealCard, findCard, type TarotCard } from "@/content/cards";
import { createSessionValue } from "@/lib/session-value";

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
  const ready = oncePerVisit ? hydrated : true;

  const seenThisVisit = oncePerVisit ? findCard(storedId) : undefined;
  // A stored card only takes over before the visitor interacts; once they have
  // pressed the trigger, this render's own state is what counts.
  const restored = interaction === "idle" && Boolean(seenThisVisit);
  const activeCard = seenThisVisit ?? card;

  const reveal = useCallback(() => {
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
      onRevealComplete,
    }),
    [restored, interaction, activeCard, ready, reveal, onRevealComplete],
  );

  return <RevealContext.Provider value={value}>{children}</RevealContext.Provider>;
}

export function useReveal(): RevealContextValue {
  const context = useContext(RevealContext);
  if (!context) throw new Error("useReveal must be used inside a RevealProvider");
  return context;
}
