"use client";

import { useSyncExternalStore } from "react";

/**
 * Which account menu is open, shared so that something outside the masthead can
 * ask for one.
 *
 * A module-scoped store read with `useSyncExternalStore`, in the shape
 * `useSignedIn.ts` already uses and for its reason: two components need one
 * answer, and syncing that answer between them in effects is how they end up
 * disagreeing. Here the answer is "is the account menu open", and the third
 * party is the Viewing Room's paywall, whose sign-in line has to open a panel
 * in the masthead without being anywhere near it in the tree.
 *
 * ## Why a surface and not a boolean
 *
 * **`SiteHeader` renders `AccountControl` twice** — once in the desktop row and
 * once inside the mobile drawer — and only one of them is visible at a time,
 * by CSS rather than by unmounting. A single shared `open` flag would therefore
 * open both: the invisible one draws nothing a visitor can see but is still in
 * the document, so it takes focus, and a sighted keyboard user ends up typing
 * into a form that is not on screen.
 *
 * So a holder names its surface, and only the one that matches is open. The
 * paywall does not choose: `openAccountMenu` picks by the same breakpoint the
 * header uses to decide which of the two is showing.
 */

/** The two places an account menu is drawn. */
export type MenuSurface = "row" | "drawer";

/** The surface whose menu is open, or null when none is. */
type Snapshot = MenuSurface | null;

let open: Snapshot = null;
const listeners = new Set<() => void>();

/**
 * What to call when the drawer itself has to be opened first.
 *
 * **The drawer's account control is not mounted until the drawer is**, which is
 * the whole reason this exists. `SiteHeader` renders that control inside its
 * `{menuOpen ? …}` block, so on a phone — where the drawer *is* the masthead —
 * publishing the `"drawer"` surface reaches nothing at all: there is no
 * subscriber, and the press that asked for a sign in form does nothing.
 *
 * A code review caught that, and caught what it costs: the Viewing Room's
 * paywall has no close button, no Escape and no backdrop dismiss, so a visitor
 * who already owns the pass and presses the one line offering them a way in was
 * left with no way into the room they had paid for.
 *
 * `SiteHeader` registers its own opener here, which is the only honest
 * direction for this dependency — the store cannot reach into a component's
 * state, and the paywall must not have to know a masthead exists.
 */
let openDrawer: (() => void) | null = null;

function publish(next: Snapshot): void {
  open = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function read(): Snapshot {
  return open;
}

/**
 * Nothing is open during the server render.
 *
 * The static export renders every page as HTML at build time, where no panel is
 * open and nobody is signed in. Hydration has to start there or the first
 * client paint disagrees with the markup it is adopting.
 */
function readOnServer(): Snapshot {
  return null;
}

/**
 * The media query that decides which of the two controls a visitor can see.
 *
 * **Copied from the `desktop-nav` custom variant in `globals.css`, in full.**
 * It is tempting to treat this as a width and ask `innerWidth >= 1024`, and
 * that is wrong: the variant also requires a real pointer, so a 1200px tablet
 * with a touchscreen shows the *drawer* despite being wider than the
 * breakpoint. A width-only test would open the desktop row's panel, which on
 * that device is `display: none` — a form a visitor cannot see, holding their
 * focus.
 *
 * If the variant in `globals.css` changes, this changes with it. There is no
 * way to read a custom variant from script, so the duplication is the price and
 * this comment is the warning.
 */
const DESKTOP_NAV_QUERY = "(min-width: 64rem) and (hover: hover) and (pointer: fine)";

/** Which of the two controls is the one on screen right now. */
export function visibleSurface(): MenuSurface {
  return window.matchMedia(DESKTOP_NAV_QUERY).matches ? "row" : "drawer";
}

/**
 * Lets the masthead say how its drawer is opened. Returns the deregistration.
 *
 * Called from an effect in `SiteHeader`, so the store holds a live opener for
 * as long as a masthead is mounted and nothing at all when none is.
 */
export function registerDrawerOpener(opener: () => void): () => void {
  openDrawer = opener;

  return () => {
    if (openDrawer === opener) openDrawer = null;
  };
}

/**
 * Opens the account menu on whichever surface is currently showing.
 *
 * For callers outside the masthead — today the Viewing Room's paywall, whose
 * visitor must be able to sign in without leaving the room.
 *
 * **On a phone this opens the drawer first**, because the drawer's account
 * control does not exist until it does. The surface is published either way, so
 * the control opens its panel as soon as it mounts and the visitor arrives at a
 * sign in form rather than at an open drawer they have to read.
 *
 * **The `"drawer"` branch is unreachable from 30 October 2026**, and is kept
 * rather than deleted because what made it unreachable is a decision about the
 * drawer rather than about this store. The drawer holds no form any more — it
 * is a button to `/login/`, see `AccountDrawerSection` — so the paywall, this
 * module's only outside caller, tests `visibleSurface()` itself and takes a
 * phone straight to that page instead of asking for a panel that is not there.
 * Everything below still works; nothing currently asks it to. If a form ever
 * returns to the drawer, this is the seam that already knows how to reach it.
 */
export function openAccountMenu(): void {
  const surface = visibleSurface();

  publish(surface);

  if (surface === "drawer") openDrawer?.();
}

/** Closes whichever is open. */
export function closeAccountMenu(): void {
  publish(null);
}

/**
 * Whether this surface's menu is open, and the two ways to change that.
 *
 * `setOpen` publishes this surface or null, so one control opening always
 * closes the other — they are two renderings of one thing, and both open at
 * once is a state with no meaning.
 */
export function useAccountMenu(surface: MenuSurface): {
  open: boolean;
  setOpen: (open: boolean) => void;
} {
  const openSurface = useSyncExternalStore(subscribe, read, readOnServer);

  return {
    open: openSurface === surface,
    setOpen: (next: boolean) => publish(next ? surface : null),
  };
}
