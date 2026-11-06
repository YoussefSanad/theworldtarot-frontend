"use client";

import type { MenuSurface } from "@/components/account/account-menu-store";
import { AccountMenu } from "@/components/account/AccountMenu";

/**
 * The masthead's account control.
 *
 * **A thin host since the dropdown arrived.** It used to be the whole thing: an
 * icon linking to `/login/` when signed out, and a name beside a sign-out link
 * when signed in. Both of those now live in `AccountMenu`, together with the
 * panel that opens under them — the icon is a trigger rather than a link, and
 * signing out asks first.
 *
 * Kept as its own component rather than folded away because `SiteHeader` calls
 * it twice, in the desktop row and in the mobile drawer, and `surface` is how
 * the two tell themselves apart. Only one of them is on screen at a time, by
 * CSS rather than by unmounting, so a request to open "the" account menu has to
 * pick the visible one. See `account-menu-store.ts`.
 */
export function AccountControl({
  surface = "row",
  onNavigate,
}: {
  surface?: MenuSurface;
  onNavigate?: () => void;
}) {
  return <AccountMenu surface={surface} onNavigate={onNavigate} />;
}
