"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useSignedIn } from "@/components/account/useSignedIn";
import { headerActions } from "@/content/site";
import { signOut } from "@/lib/session";

/**
 * The masthead's account control, in whichever of its two states applies.
 *
 * A visitor gets the icon that has always been here, pointing at the sign in
 * page. A signed-in customer gets their own name and a way out. **That is what
 * makes signing in legible at all today**: there is no member area to land in,
 * so the header is the only place on the site that shows the session exists.
 *
 * Rendered twice by `SiteHeader` — once on the desktop row and once in the
 * mobile drawer — which is why the answer it draws comes from a shared store
 * rather than from state of its own. Both instances ask; only one request goes
 * out.
 */
export function AccountControl({ onNavigate }: { onNavigate?: () => void }) {
  const { customer, setCustomer } = useSignedIn();
  const [leaving, setLeaving] = useState(false);

  async function onSignOut() {
    if (leaving) return;

    setLeaving(true);

    /*
      Caught rather than only `finally`-ed. `finally` runs the cleanup and then
      lets the rejection carry on, and the sole caller below discards the
      promise with `void` — so a refused sign out cleared the masthead and then
      surfaced as an unhandled rejection, which is exactly the console noise
      this swallow exists to prevent.
    */
    try {
      await signOut();
    } catch {
      /*
        Ignored on purpose. A refused sign out is almost always a session that
        had already ended, and there is nothing a person could do with the
        difference.
      */
    } finally {
      /*
        Cleared whether or not the API answered. A masthead still showing
        somebody's name after they pressed this is the one outcome that would
        be read as a fault. The next `/me` on the next page load is the truth
        either way.
      */
      setCustomer(null);
      setLeaving(false);
    }
  }

  if (!customer) {
    return (
      <Link
        href={headerActions.account.href}
        aria-label={headerActions.account.label}
        className="opacity-90 transition-opacity hover:opacity-100"
        onClick={onNavigate}
      >
        <Image
          src={headerActions.account.icon.src}
          alt=""
          width={headerActions.account.icon.width}
          height={headerActions.account.icon.height}
          className="h-[clamp(1.25rem,1.98vw,2.375rem)] w-auto"
        />
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-[0.6em]">
      <span className="max-w-[10em] truncate text-mist-dim" title={customer.name}>
        {customer.name}
      </span>
      <button
        type="button"
        onClick={() => void onSignOut()}
        disabled={leaving}
        className="text-mist-dim underline underline-offset-4 transition-colors hover:text-gold focus-visible:text-gold"
      >
        {headerActions.signOut.label}
      </button>
    </span>
  );
}
