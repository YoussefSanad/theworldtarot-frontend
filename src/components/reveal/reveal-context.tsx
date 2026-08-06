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

/**
 * How long the unprompted warm will wait for a quiet moment before going ahead.
 *
 * Comfortably past a measured LCP of roughly 1.3s on a throttled phone, and far
 * short of the time it takes anyone to read the hero and press the button.
 */
const WARM_CEILING_MS = 2000;

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
  /**
   * True once the backend has answered, one way or the other.
   *
   * Warming must wait for it. Before the answer arrives `card` is the bundled
   * fallback, and fetching that unprompted would pull an 18MB MP4 nobody is
   * going to watch, on the connections least able to afford it.
   */
  settled: boolean;
  /**
   * The drawn card's film couldn't actually play — a fatal HLS failure, not an
   * API failure (that's already handled by the fetch effect below). Routes
   * through the same bundled-card fallback the API-unreachable case uses, so
   * there is one fallback path, not two.
   */
  onFilmFailed: () => void;
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
  const [settled, setSettled] = useState(false);

  // The idle button must not paint for somebody who already has a card, or it
  // flashes and swaps. Hydration alone used to answer that, because the stored
  // card was found synchronously. It now takes a request, so a visitor with a
  // stored id waits for it. A first-time visitor does not, and the hero's
  // primary ask still paints immediately.
  const ready = oncePerVisit ? hydrated && (!storedId || settled) : true;

  /**
   * **This runs in the browser and must keep doing so.** The film's URL is
   * signed against the address the request came from, so drawing on a server or
   * at build time would bind it to that machine and refuse every real visitor.
   * A static export has no server, which is what makes it true today. See
   * `@/lib/api`.
   */
  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      // The homepage draws once per visit. Anywhere else, every mount is a
      // fresh card, so there is nothing to restore.
      const seen = oncePerVisit ? revealedCard.get() : null;

      if (!seen) {
        const drawnCard = await drawCard({ signal: controller.signal });
        setDrawn(drawnCard);

        // Null is the backend saying no card has both a finished film and a
        // poster frame yet. A real state rather than a fault, and worth
        // separating from a broken API, because the two want very different
        // responses from whoever reads this.
        if (!drawnCard) {
          console.info("No card has a film to draw yet, showing the bundled card.");
        }
        return;
      }

      const found = await fetchCard(seen, { signal: controller.signal });
      if (found) {
        setRestoredCard(found);
        return;
      }

      // The stored card is no longer on the site — a 404, not a fault; see
      // `fetchCard`'s doc comment. The visitor gets a fresh draw rather than
      // silently landing on the bundled card every reload. This is stored via
      // `setRestoredCard`, not `setDrawn`: `restored` is derived from
      // `restoredCard`, and a visitor who already used their one reveal this
      // session must not see the idle button reappear.
      //
      // The new id has to replace the stale one in `sessionStorage` right
      // here: this path never reaches `onRevealComplete` (skipped whenever
      // `restored` is true), the only other place a card id is normally
      // written. Skipping this write would mean every reload this session
      // 404s and redraws again, showing a different card each time.
      console.info(`Stored card ${seen} is no longer on the site, drawing a fresh one.`);
      const drawnCard = await drawCard({ signal: controller.signal });
      setRestoredCard(drawnCard);
      if (drawnCard) revealedCard.set(drawnCard.id);
      else console.info("No card has a film to draw yet, showing the bundled card.");
    }

    load()
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        // Loud here and invisible to the visitor: the bundled card takes over
        // below, so a broken API looks like a working homepage. Without this
        // line it would also look like one to us.
        console.error("The reveal could not reach the API, falling back to the bundled card.", error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettled(true);
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

  const onFilmFailed = useCallback(() => {
    // The API drew a card whose film can't actually play. `drawn` is what
    // `activeCard` falls back from, so clearing it routes through the exact
    // same bundled-card path already used when the API is unreachable — one
    // fallback branch, not two.
    setDrawn(null);
  }, []);

  /**
   * Warm without waiting to be asked, because a phone has no hover.
   *
   * Hover is free, and it is also desktop-only: on a touch screen the first
   * signal of intent is the tap itself, which is too late to help. So the film
   * is fetched unprompted, which means paying for it on behalf of visitors who
   * never press the button.
   *
   * **Deferred to the first idle moment, with a hard ceiling**, which is what
   * makes that acceptable. The audit behind this whole project found 230MB
   * loading on arrival and a 21.4 second mobile LCP, so video competing with the
   * hero for bandwidth is the one thing this must not become. Measured LCP on a
   * throttled phone is about 1.3s, so a ceiling above that costs nothing and
   * still lands long before anyone has read the hero and reached for the button.
   *
   * **Deliberately not waiting for the `load` event.** That was the first
   * attempt, and it pushed the fetch to 12 seconds on a throttled phone, because
   * `load` waits for the looping card-back video. Correct about not competing
   * and useless as a head start.
   *
   * The cost is bounded on the other side too: warming stops after one segment,
   * and is skipped entirely on Data Saver or a 2G-class connection.
   */
  useEffect(() => {
    const request =
      window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(cb, WARM_CEILING_MS));

    const idle = request(() => warm(), { timeout: WARM_CEILING_MS });

    return () => window.cancelIdleCallback?.(idle);
  }, [warm]);

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
      onFilmFailed,
      settled,
      onRevealComplete,
    }),
    [
      restored,
      interaction,
      activeCard,
      ready,
      reveal,
      warm,
      warming,
      onFilmFailed,
      settled,
      onRevealComplete,
    ],
  );

  return <RevealContext.Provider value={value}>{children}</RevealContext.Provider>;
}

export function useReveal(): RevealContextValue {
  const context = useContext(RevealContext);
  if (!context) throw new Error("useReveal must be used inside a RevealProvider");
  return context;
}
