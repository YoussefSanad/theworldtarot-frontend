"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { defaultRevealCard, findCard, type TarotCard } from "@/content/cards";
import { createSessionValue } from "@/lib/session-value";

/**
 * Concept-page reveal state. Separate session key from production home so the
 * two demos do not share a once-per-visit latch.
 */

export type RevealStatus = "idle" | "revealing" | "revealed";

export const REVEAL_CROSSFADE_SECONDS = 1.4;

type RevealContextValue = {
  status: RevealStatus;
  card: TarotCard;
  /**
   * True when this page load began with a card already stored for the visit.
   * The cinema still plays; the trigger stays out of the way.
   */
  restored: boolean;
  reveal: () => void;
  onRevealComplete: () => void;
  /** Fired by SunriseAtmosphere when the ambient dawn settles (or immediately if reduced motion). */
  onDawnSettled: () => void;
};

const RevealContext = createContext<RevealContextValue | null>(null);

const revealedCard = createSessionValue("wt.concept.reveal.card");

const serverSnapshot = () => null;

export function RevealProvider({
  children,
  card = defaultRevealCard,
  oncePerVisit = false,
  onRevealed,
}: {
  children: ReactNode;
  card?: TarotCard;
  oncePerVisit?: boolean;
  onRevealed?: (card: TarotCard) => void;
}) {
  const [interaction, setInteraction] = useState<RevealStatus>("idle");
  const [restoreSession, setRestoreSession] = useState(false);
  const storedId = useSyncExternalStore(revealedCard.subscribe, revealedCard.get, serverSnapshot);

  const seenThisVisit = oncePerVisit ? findCard(storedId) : undefined;
  const activeCard = seenThisVisit ?? card;

  if (seenThisVisit && interaction === "idle" && !restoreSession) {
    setRestoreSession(true);
  }

  const reveal = useCallback(() => {
    setInteraction((current) => (current === "idle" ? "revealing" : current));
  }, []);

  const onRevealComplete = useCallback(() => {
    setInteraction("revealed");
    if (oncePerVisit) revealedCard.set(activeCard.id);
    onRevealed?.(activeCard);
  }, [activeCard, oncePerVisit, onRevealed]);

  const onDawnSettled = useCallback(() => {
    if (!oncePerVisit) return;
    if (!findCard(revealedCard.get())) return;
    setInteraction((current) => (current === "idle" ? "revealing" : current));
  }, [oncePerVisit]);

  const value = useMemo(
    () => ({
      status: interaction,
      card: activeCard,
      restored: restoreSession,
      reveal,
      onRevealComplete,
      onDawnSettled,
    }),
    [interaction, activeCard, restoreSession, reveal, onRevealComplete, onDawnSettled],
  );

  return <RevealContext.Provider value={value}>{children}</RevealContext.Provider>;
}

export function useReveal(): RevealContextValue {
  const context = useContext(RevealContext);
  if (!context) throw new Error("useReveal must be used inside a concept RevealProvider");
  return context;
}
