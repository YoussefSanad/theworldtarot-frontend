"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { useSignedIn } from "@/components/account/useSignedIn";
import { Container } from "@/components/layout/Section";
import { ButtonLink } from "@/components/ui/Button";
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
          <header className="mt-[clamp(16px,2.2vw,40px)] text-center">
            <h1 className="font-display text-[clamp(32px,4.5vw,58px)] leading-tight text-white">
              {viewingRoom.title}
            </h1>
            {/*
              Her own 0.0125em, not the 0.2em this carried. The frame sets
              tracking 0.3 on a 24px line — small-caps spacing, not the wide
              display tracking that was here, which pushed the line most of
              the way across the player beneath it.
            */}
            <p className="mt-2 font-serif text-[clamp(13px,1.8vw,24px)] tracking-[0.0125em] text-[#f9f3d0]/80">
              {viewingRoom.subtitle}
            </p>
          </header>

          <div className="relative mt-[clamp(44px,6vw,88px)] w-full">
            <FilmPlayer card={selected} onRefused={onRefused} labels={viewingRoom.player} />

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
          {/*
            `ClosingSaying`'s own treatment — Magically at `text-h2-lg` in
            champagne — rather than the one-off this carried. That component
            draws this same line above GET A READING on every readings page
            and at the foot of the Library, so a different face here reads as
            a different page rather than as the same voice.
          */}
          <p className="font-display text-h2-lg leading-[1.1] text-champagne">
            {viewingRoom.closing.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>

          {/*
            The site's own gold button, as `ClosingSaying` draws the same call
            to action at the foot of every readings page — not a gradient
            rebuilt here, which is what this was and why it matched nothing.
          */}
          <ButtonLink
            href="/readings/"
            size="fluid"
            className="mt-6 min-h-[clamp(48px,3.4vw,56px)] px-[1.2em] text-[clamp(14px,1.25vw,20px)] leading-none tracking-[0.01em]"
          >
            {viewingRoom.closing.action}
          </ButtonLink>
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

      {/*
        **The veil covers the page, and stays under the panel.**

        It was `absolute inset-0` inside the player's own wrapper, so it
        dimmed the card and nothing else — the room either side of it stayed
        bright behind a panel that is meant to be the only thing you can use.
        Fixed to the viewport instead, and shown for the whole time the room
        is out of reach rather than only during the half-second `asking`.

        `z-40` sits above the room and below the panel's own `z-50`.
      */}
      {(state === "asking" || modal) && (
        <div
          aria-hidden
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px]"
        />
      )}

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

/**
 * Whether `?state=` may override what `/me` said.
 *
 * **Development always, and staging when the deploy asks for it.** Phase one
 * has no way to buy the pass, so without this nobody can look at the member's
 * room on staging — which is the thing the client is actually approving.
 *
 * `NEXT_PUBLIC_ALLOW_STATE_OVERRIDE` is inlined at build time, so production
 * builds strip this whole path as dead code rather than carrying a flag that
 * could be flipped at runtime. An env var rather than a hostname check
 * because the exception then lives in the deploy config, where it is visible,
 * instead of in a string that outlives the reason for it.
 *
 * **It overrides presentation only.** The video endpoint decides access on
 * every call, so this cannot play a film for somebody without the pass — it
 * only chooses which panel is drawn. Deleted in phase two.
 */
const STATE_OVERRIDE_ALLOWED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ALLOW_STATE_OVERRIDE === "1";

/** The server snapshot: a build machine has no URL and nobody is signed in. */
function readNothing(): AccessState | null {
  return null;
}

function readDevState(): AccessState | null {
  if (!STATE_OVERRIDE_ALLOWED) return null;

  const value = new URLSearchParams(window.location.search).get("state");

  return value === "signed-out" || value === "no-pass" || value === "member" || value === "asking"
    ? value
    : null;
}
