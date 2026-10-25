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
import { useViewingRoomDeck } from "@/lib/viewing-room-deck";
import type { PlaybackFailure } from "@/lib/viewing-room-video";

/**
 * The Viewing Room itself (Figma `384:2`).
 *
 * **The room renders at once and the panel arrives over it.** The page's own
 * words — the title, the closing call to action — owe the backend nothing and
 * draw immediately, under a brief veil while `/me` answers: a member who sees
 * one frame of the paywall has been told they did not buy what they bought.
 *
 * **Two requests, and neither blocks the other.** `/me` decides which panel is
 * drawn, `/cards` fills the player and the carousel, and the deck is public
 * either way — a signed-out visitor sees the room they are being sold. So the
 * deck is not gated on the session and the panel does not wait for the deck.
 *
 * `inert` on the room is presentation and never the gate: with it removed in
 * dev tools the video endpoint still refuses, every time, which is where
 * access is actually decided.
 */
export function ViewingRoom() {
  const { customer } = useSignedIn();
  const devState = useDevState();

  const state: AccessState = devState ?? accessStateOf(customer);

  /**
   * The deck, from the backend. **Fetched here rather than passed in**, which
   * is the change phase two made: through phase one the page handed down a
   * bundled list, and this component's own doc called that call site the seam.
   * A static export cannot fetch it at build time, so it is asked for in the
   * browser and the carousel says so while it is in flight.
   */
  const deckState = useViewingRoomDeck();
  const cards = deckState.status === "live" ? deckState.cards : EMPTY_DECK;

  /**
   * The card the **visitor** has picked, and null until they pick one.
   *
   * Not "the card on the player", which is `selected` below: this is only the
   * choice, and the default is derived rather than written here. Through phase
   * one it was seeded with `useState(() => firstPlayable(cards))`, which cannot
   * work now — the deck is empty on the first render and the seed would stick.
   */
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [screen, setScreen] = useState<PaywallScreen>("unlock");

  /**
   * A card the backend has told us is not ready, this visit.
   *
   * A 404 on play means the film is gone or still transcoding even though the
   * list said otherwise, so the card joins the coming-soon ones rather than
   * leaving a player that refuses to start with no explanation.
   */
  const [notReady, setNotReady] = useState<ReadonlySet<number>>(() => new Set());

  const deck = useMemo(
    () =>
      notReady.size === 0
        ? cards
        : cards.map((card) =>
            notReady.has(card.id) ? { ...card, inViewingRoom: false } : card,
          ),
    [cards, notReady],
  );

  /**
   * The card on the player, or null while there is no deck.
   *
   * **Derived, with the default folded into the derivation** rather than
   * written into state by an effect once the deck lands. An effect would have
   * to `setState` synchronously on the render the deck arrives on, which
   * cascades renders and which this repo's lint rules refuse — and it would
   * also mean one render where there is a deck and no selection, which is a
   * frame of the empty room for everybody.
   *
   * `selectedId` stays null until the visitor picks something, and
   * `firstPlayable` answers for them until they do. Falling back to the first
   * card also covers a selection that is no longer in the deck, which is what
   * a refreshed deck that dropped a card leaves behind.
   */
  const selected = deck.find((card) => card.id === selectedId) ?? firstPlayable(deck);

  /** A refusal from the video endpoint, answered with a modal, never a dead player. */
  const onRefused = useCallback((failure: PlaybackFailure, cardId: number) => {
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
            {/*
              **The player waits for a card and the room does not.** The
              title, the atmosphere and the closing call to action are the
              page's own and owe the backend nothing, so they draw at once —
              only the two blocks the deck fills hold a placeholder.

              The placeholder keeps the player's exact aspect, so the carousel
              below it does not jump when the deck lands.
            */}
            {selected ? (
              <FilmPlayer card={selected} onRefused={onRefused} labels={viewingRoom.player} />
            ) : (
              <PlayerPlaceholder />
            )}
          </div>
        </Container>

        <div className="mt-[clamp(32px,5vw,64px)] w-full bg-white/[0.03] py-[clamp(20px,3vw,46px)]">
          {selected ? (
            <ThumbnailCarousel
              cards={deck}
              selectedId={selected.id}
              onSelect={setSelectedId}
              hint={viewingRoom.carouselHint}
              labels={viewingRoom.carousel}
            />
          ) : (
            <DeckNotice state={deckState} labels={viewingRoom.deck} />
          )}
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

        Fixed to the viewport rather than scoped to the player, so it holds
        its place while the page scrolls and the room is dimmed wherever you
        are on it.

        `z-20`: above the room, below the panel, and **below the masthead
        (`z-50`) and the footer (`z-10` in its own stacking context)**. A
        paywall should block the content, never the way off the page —
        before this it covered the whole viewport and a visitor who could
        not or would not buy had no exit but the back button.
      */}
      {(state === "asking" || modal) && (
        <div
          aria-hidden
          className="fixed inset-0 z-20 bg-black/55 backdrop-blur-[3px]"
        />
      )}

      {modal && (
        <PaywallModal screen={screen} state={state} heading={viewingRoom.panel.heading}>
          {screen === "unlock" ? (
            <UnlockPanel
              state={state}
              pretendAccount={devState && !customer ? PRETEND_ACCOUNT : undefined}
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

/**
 * The account `?state=no-pass` names, since that switch signs nobody in.
 *
 * Only ever reached through the dev override — a real no-pass visitor has a
 * session, and the line reads their own address from it.
 */
const PRETEND_ACCOUNT = {
  id: 0,
  name: null,
  email: "someone@example.com",
  hasViewingRoomAccess: false,
} as const;

/**
 * A stable empty deck, so a render before the backend answers does not make a
 * new array every time and re-run everything that depends on one.
 */
const EMPTY_DECK: readonly ViewingRoomCard[] = [];

/**
 * The player's shape with nothing in it yet.
 *
 * **The sizing classes are `FilmPlayer`'s own, copied deliberately.** They are
 * the one measurement on this page that has to survive every breakpoint
 * intact — a 3:5 card capped by height rather than width, for the reasons that
 * component documents at length — and a placeholder that got them even
 * slightly wrong would move the carousel the moment the deck landed. Copied
 * rather than extracted because there are two of them and a shared wrapper
 * would be indirection in the middle of the page's only real layout rule.
 */
function PlayerPlaceholder() {
  return (
    <div
      aria-hidden
      className={cn(
        "relative mx-auto overflow-hidden rounded-[4px]",
        "aspect-[509/842] w-full",
        "max-w-[min(100%,clamp(300px,42vw,640px),calc(86dvh*509/842))]",
        // The rotunda showing through, rather than a grey box: the page's own
        // atmosphere is already behind this and should stay visible.
        "border border-white/5 bg-white/[0.02]",
      )}
    />
  );
}

/**
 * What the carousel's band says when there is no deck in it.
 *
 * **Three states and three sentences**, because a band that is empty for a
 * second and one that is empty for good look identical — and only one of them
 * is worth waiting through. `live` never reaches here; the room draws the real
 * carousel then.
 */
function DeckNotice({
  state,
  labels,
}: {
  state: ReturnType<typeof useViewingRoomDeck>;
  labels: { loading: string; empty: string; unreachable: string; retry: string };
}) {
  const message =
    state.status === "loading"
      ? labels.loading
      : state.status === "empty"
        ? labels.empty
        : labels.unreachable;

  return (
    <div className="flex min-h-[clamp(132px,11.98vw,230px)] flex-col items-center justify-center gap-4 px-6 text-center">
      {/*
        `role="status"` so the wait is announced rather than being a silent
        empty region — and it carries the failure too, which is the same kind
        of news arriving for the same reader.
      */}
      <p role="status" className="font-sans text-sm tracking-wide text-[#f9f3d0]/70">
        {message}
      </p>

      {/*
        A retry only where retrying means anything. An empty deck is the
        backend's considered answer, and asking again will not finish a film.
      */}
      {state.status === "unreachable" && (
        <button
          type="button"
          onClick={state.retry}
          className="rounded-full border border-[color:var(--gold-line,#d4b06a)]/70 px-5 py-2 font-sans text-sm tracking-wide text-[color:var(--gold,#d4b06a)] transition hover:border-[color:var(--gold,#d4b06a)]"
        >
          {labels.retry}
        </button>
      )}
    </div>
  );
}

/**
 * The first card with a film, so the player never opens on a locked one.
 *
 * Null for an empty deck, which is the state before the backend answers. A
 * deck where *every* card is unplayable still answers its first card rather
 * than null: the room then shows a card whose play button refuses, which is
 * better than showing nothing at all.
 */
function firstPlayable(cards: readonly ViewingRoomCard[]): ViewingRoomCard | null {
  if (cards.length === 0) return null;

  return cards.find((card) => card.inViewingRoom) ?? cards[0];
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
 * Deleted in phase two, when the pass can actually be bought.
 */
function stateOverrideAllowed(): boolean {
  /*
    **Derived from the API base, not a flag of its own.**

    `NEXT_PUBLIC_API_BASE_URL` is already set in every environment and is
    already what tells the builds apart — staging points at
    `staging-api.theworldtarot.com`, production does not. Asking it costs
    the deploy nothing, where a dedicated variable has to be remembered in
    a build config and silently does nothing when it is not.

    **Presentation only.** The video endpoint decides access on every call,
    so this cannot play a film for anybody without the pass — it chooses
    which panel is drawn and nothing else. On production it is false, and
    `next.config.mjs` refuses a build that tries to force it.
  */
  if (process.env.NODE_ENV !== "production") return true;

  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").includes("staging-api.theworldtarot.com");
}

/** The server snapshot: a build machine has no URL and nobody is signed in. */
function readNothing(): AccessState | null {
  return null;
}

function readDevState(): AccessState | null {
  if (!stateOverrideAllowed()) return null;

  const value = new URLSearchParams(window.location.search).get("state");

  return value === "signed-out" || value === "no-pass" || value === "member" || value === "asking"
    ? value
    : null;
}
