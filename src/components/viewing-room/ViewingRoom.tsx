"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { useSignedIn } from "@/components/account/useSignedIn";
import { Container } from "@/components/layout/Section";
import { FilmPlayer } from "@/components/viewing-room/FilmPlayer";
import { PaymentPanel } from "@/components/viewing-room/PaymentPanel";
import { PaywallModal, type PaywallScreen } from "@/components/viewing-room/PaywallModal";
import { ThumbnailCarousel } from "@/components/viewing-room/ThumbnailCarousel";
import { UnlockPanel } from "@/components/viewing-room/UnlockPanel";
import { viewingRoom, type ViewingRoomCard } from "@/content/viewing-room";
import { cn } from "@/lib/cn";
import { accessStateOf, roomIsInert, type AccessState } from "@/lib/viewing-room-access";
import type { PlaybackFailure } from "@/lib/viewing-room-video";

/**
 * The Viewing Room itself (Figma `384:2`).
 *
 * **The room renders at once and the panel arrives over it.** The deck is
 * public, so there is nothing to wait for before drawing it — only a brief
 * veil while `/me` answers, because a member who sees one frame of the paywall
 * has been told they did not buy what they bought.
 *
 * `inert` on the room is presentation and never the gate: with it removed in
 * dev tools the video endpoint still refuses, every time, which is where
 * access is actually decided.
 */
export function ViewingRoom({ cards }: { cards: readonly ViewingRoomCard[] }) {
  const { customer } = useSignedIn();
  const devState = useDevState();

  const state: AccessState = devState ?? accessStateOf(customer);

  const [selectedId, setSelectedId] = useState(() => firstPlayable(cards));
  const [screen, setScreen] = useState<PaywallScreen>("unlock");

  /**
   * A card the backend has told us is not ready, this visit.
   *
   * A 404 on play means the film is gone or still transcoding even though the
   * list said otherwise, so the card joins the coming-soon ones rather than
   * leaving a player that refuses to start with no explanation.
   */
  const [notReady, setNotReady] = useState<ReadonlySet<string>>(() => new Set());

  const deck = useMemo(
    () =>
      notReady.size === 0
        ? cards
        : cards.map((card) =>
            notReady.has(card.id) ? { ...card, inViewingRoom: false } : card,
          ),
    [cards, notReady],
  );

  const selected = deck.find((card) => card.id === selectedId) ?? deck[0];

  /** A refusal from the video endpoint, answered with a modal, never a dead player. */
  const onRefused = useCallback((failure: PlaybackFailure, cardId: string) => {
    if (failure === "not-ready") {
      setNotReady((previous) => new Set(previous).add(cardId));
      return;
    }

    // 401 and 403 are the session changing underneath the visitor. The modal
    // follows from `state`, which follows from the store — so re-asking is
    // what brings the right panel back, rather than setting a flag here.
    setScreen("unlock");
  }, []);

  const modal = roomIsInert(state);

  return (
    <>
      <div
        /*
          Inert while the panel is up: no pointer, no focus, no screen reader.
          `aria-hidden` says the same thing to anything that does not know
          `inert` yet.
        */
        {...(modal ? { inert: true, "aria-hidden": true } : {})}
        // A stable hook for the browser check, which must not depend on this
        // being a particular child of `main` — `PageAtmosphere` is one too.
        data-viewing-room=""
        className={cn(modal && "pointer-events-none select-none")}
      >
        <Container className="flex flex-col items-center">
          <header className="text-center">
            <h1 className="font-display text-[clamp(32px,4.5vw,58px)] leading-tight text-white">
              {viewingRoom.title}
            </h1>
            <p className="mt-3 font-serif text-[clamp(13px,1.8vw,24px)] tracking-[0.2em] text-[#f9f3d0]/80">
              {viewingRoom.subtitle}
            </p>
          </header>

          <div className="relative mt-[clamp(28px,4vw,52px)] w-full">
            <FilmPlayer card={selected} onRefused={onRefused} labels={viewingRoom.player} />

            {/*
              The veil, not a spinner: the room is already drawn underneath and
              this is the half-second before we know who is looking at it.
            */}
            {state === "asking" && (
              <div aria-hidden className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
            )}
          </div>
        </Container>

        <div className="mt-[clamp(32px,5vw,64px)] w-full bg-white/[0.03] py-[clamp(20px,3vw,46px)]">
          <ThumbnailCarousel
            cards={deck}
            selectedId={selected.id}
            onSelect={setSelectedId}
            hint={viewingRoom.carouselHint}
            labels={viewingRoom.carousel}
          />
        </div>

        <Container className="mt-[clamp(40px,6vw,96px)] flex flex-col items-center text-center">
          <p className="text-[clamp(18px,2.4vw,30px)] text-white/90">
            {viewingRoom.closing.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>

          <Link
            href="/readings/"
            className="mt-6 rounded-full bg-gradient-to-b from-[#f4dfa8] via-[#d4b06a] to-[#b8923f] px-8 py-3 text-[clamp(14px,1.6vw,20px)] tracking-wide text-[#101b2e]"
          >
            {viewingRoom.closing.action}
          </Link>
        </Container>

        {/*
          Room between the button and the footer, which her frame never budgets
          for because it draws no footer — the problem `library/page.tsx`
          documents at length. Trimmed by eye against the rendered page rather
          than spending her 744px literally, which stacks empty rotunda on top
          of a 522px footer. **This is the tuned number**; move it, not the
          values above, if the client wants more air or less.
        */}
        <div aria-hidden className="h-[clamp(48px,14vw,276px)]" />
      </div>

      {modal && (
        <PaywallModal screen={screen} state={state} heading={viewingRoom.panel.heading}>
          {screen === "unlock" ? (
            <UnlockPanel
              state={state}
              onBuy={() => setScreen("payment")}
              labels={viewingRoom.panel.account}
            />
          ) : (
            <PaymentPanel
              onBack={() => setScreen("unlock")}
              labels={viewingRoom.panel.payment}
            />
          )}
        </PaywallModal>
      )}
    </>
  );
}

/** The first card with a film, so the player never opens on a locked one. */
function firstPlayable(cards: readonly ViewingRoomCard[]): string {
  return (cards.find((card) => card.inViewingRoom) ?? cards[0]).id;
}

/**
 * `?state=signed-out|no-pass|member|asking`, **outside production only**.
 *
 * `asking` is included so the veil can be held open deliberately — it is the
 * state a slow or hanging `/me` produces, and it is otherwise a half-second
 * nobody can look at.
 *
 * Phase one has no backend to sign anybody in, so without this the signed-out
 * panel is the only reachable state and the member's room — the thing the
 * client is actually buying — could not be reviewed or screenshotted at all.
 *
 * It overrides presentation and nothing else. It cannot make the backend serve
 * a film, and in phase two it is deleted.
 */
function useDevState(): AccessState | null {
  /*
    Read after mount, never during render. This is a static export: the HTML is
    built on a machine with no URL, so a render that reads `window.location`
    produces different markup than the one it is adopting — a hydration
    mismatch, in the one environment this switch exists for. `useSignedIn`
    goes to the same trouble for the same reason.
  */
  return useSyncExternalStore(subscribeToNothing, readDevState, readNothing);
}

/** The URL never changes under this page, so there is nothing to subscribe to. */
function subscribeToNothing(): () => void {
  return () => {};
}

/** The server snapshot: a build machine has no URL and nobody is signed in. */
function readNothing(): AccessState | null {
  return null;
}

function readDevState(): AccessState | null {
  if (process.env.NODE_ENV === "production") return null;

  const value = new URLSearchParams(window.location.search).get("state");

  return value === "signed-out" || value === "no-pass" || value === "member" || value === "asking"
    ? value
    : null;
}
