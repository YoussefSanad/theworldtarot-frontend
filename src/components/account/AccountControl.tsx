"use client";

import Link from "next/link";
import { useState } from "react";

import { useSignedIn } from "@/components/account/useSignedIn";
import { headerActions } from "@/content/site";
import { customerLabel, signOut } from "@/lib/session";

/**
 * The masthead's account control, in whichever of its two states applies.
 *
 * Somebody signed out gets the icon that has always been here, pointing at the
 * sign in page. A signed-in customer gets their own name and a way out. **That
 * is what makes signing in legible at all today**: there is no member area to
 * land in, so the header is the only place on the site that shows the session
 * exists.
 *
 * **What it draws when there is no name is `customerLabel`'s and not this
 * component's**, because a buyer who claimed the account checkout made for them
 * has none and that is the ordinary case. Rendering the name straight through
 * left an empty span beside the sign out link, and an empty `title` with it.
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
        /*
          `text-(--header-ink)` explicitly, like `LocaleMenu`'s globe beside it:
          the mark is drawn with `currentColor`, so without a colour here it
          would inherit the header's own and sit at a different weight from the
          controls that do set it.
        */
        className="text-(--header-ink) opacity-90 transition-[opacity,color] duration-300 ease-(--ease-veil) hover:text-(--header-accent) hover:opacity-100 focus-visible:opacity-100"
        onClick={onNavigate}
      >
        <AccountIcon className="size-[clamp(1.25rem,1.98vw,2.375rem)]" />
      </Link>
    );
  }

  /* Their address when they have no name, so the slot is never blank. It is
     longer than a name, which is what the truncation and the title are for. */
  const label = customerLabel(customer);

  return (
    <span className="flex items-center gap-[0.6em]">
      <span className="max-w-[10em] truncate text-(--header-ink)" title={label}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => void onSignOut()}
        disabled={leaving}
        className="text-(--header-ink) underline underline-offset-4 transition-colors hover:text-(--header-accent) focus-visible:text-(--header-accent)"
      >
        {headerActions.signOut.label}
      </button>
    </span>
  );
}

/**
 * The masthead's account mark, inline so it can take `currentColor`.
 *
 * **It was `login-icon.webp` until this**, a flat `#d0d0d0` raster with an
 * alpha channel — which meant it had no colour to inherit, and on the one
 * light page here (see the `:has()` block in globals.css) it stayed pale while
 * the words and the globe beside it went to ink. The workaround was a
 * `brightness(0)` filter, exact only because the source happened to be neutral
 * grey and useless for any third colour. Drawn here instead, it simply follows
 * `--header-ink` like everything else in the row.
 *
 * **Stroked line art, where the old mark was a solid silhouette.** That is the
 * trade this swap makes: the source is line art and the two cannot be
 * reconciled without redrawing one of them. `GlobeIcon`'s note beside it
 * explains why that globe is a solid disc — at the same box height, line art
 * reads noticeably lighter than a filled shape, which is the mismatch to watch
 * here. `stroke-width` is the lever if the pair look uneven; `ConceptHeader`
 * still draws the raster pair and is deliberately untouched, because swapping
 * one of a matched set would break the match.
 *
 * The geometry lives here and nowhere else. It came from an `account.svg` in
 * `public/figma/`, which was deleted once it was inlined — a linked file could
 * not be recoloured anyway, because `images.unoptimized` serves it as an
 * `<img>` and the page's CSS cannot reach into a replaced element's document.
 */
function AccountIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12.1992 12C14.9606 12 17.1992 9.76142 17.1992 7C17.1992 4.23858 14.9606 2 12.1992 2C9.43779 2 7.19922 4.23858 7.19922 7C7.19922 9.76142 9.43779 12 12.1992 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 22C3.57038 20.0332 4.74796 18.2971 6.3644 17.0399C7.98083 15.7827 9.95335 15.0687 12 15C16.12 15 19.63 17.91 21 22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
