"use client";

import { useRouter } from "next/navigation";

import { openAccountMenu, visibleSurface } from "@/components/account/account-menu-store";
import { Button } from "@/components/ui/Button";
import { AccountLine } from "@/components/viewing-room/AccountLine";
import { signInPath } from "@/content/login";
import { viewingRoom } from "@/content/viewing-room";
import { viewingRoomMarks as marks } from "@/lib/assets";
import { cn } from "@/lib/cn";
import { usePassPriceLine } from "@/lib/pass-price";
import type { Customer } from "@/lib/session";
import type { AccessState } from "@/lib/viewing-room-access";

const { panel } = viewingRoom;

/**
 * Where `?next=` sends a phone back to, slashed for `trailingSlash`.
 *
 * Written here rather than imported because this is the one page that is
 * always its own destination: the panel is *in* the Viewing Room, so there is
 * nothing to resolve and nothing a caller could pass that would be right.
 */
const viewingRoomPath = "/viewing-room/";

/**
 * Screen one of the paywall (`384:28`), built as the client drew it.
 *
 * Her panel: the heading, a key divider, the body, three benefits under their
 * icons, the gold button with its keyhole, the price, and the sign-in line.
 * **The ticket claimed the PSD "does not draw" the payment step and that it
 * needed client approval — reading the frame settled that it does.** What it
 * has no wallet row is the only gap, and that is screen two.
 *
 * The heading itself lives in `PaywallModal`, which uses it to label the
 * dialog; everything below it is here.
 */
export function UnlockPanel({
  state,
  onBuy,
  labels,
  pretendAccount,
}: {
  state: AccessState;
  onBuy: () => void;
  labels: { signedInAs: string; switch: string };
  /** Dev `?state=no-pass` only; see `AccountLine`. */
  pretendAccount?: Customer;
}) {
  /*
    The same `/products` answer the homepage's tiles read, so this screen adds
    no request of its own — `lib/catalogue.ts` asks once per currency however
    many surfaces read it, and the pass is already in that answer because the
    VIEWING ROOM tile keys to it.

    Screen two prices off its own `useProduct(PASS)` fetch, which is the one the
    checkout is built from; see `PaymentPanel`. Here there is nothing to buy
    yet, so the catalogue is both enough and cheaper.
  */
  const priceLine = usePassPriceLine(panel.price, panel.priceNote);
  /** Only the phone's road uses it; see the sign-in line below. */
  const router = useRouter();

  return (
    <div className="mt-4 flex flex-col items-center">
      {/* Her key divider (`384:40`), 452x38, as delivered. */}
      <img
        src={marks.keyDivider.src}
        alt=""
        width={marks.keyDivider.width}
        height={marks.keyDivider.height}
        className="mt-1 h-auto w-full max-w-[min(100%,300px)]"
      />

      <p className="mt-5 max-w-[440px] text-center font-sans text-[clamp(14px,1.25vw,20px)] leading-[1.35] text-[#f9f3d0]">
        {panel.body}
      </p>

      {/*
        Three benefits across at every width down to the phone, where they
        stack: her row is three short captions, and squeezing them onto one
        line on a 360 would shrink the type below the rest of the panel.
      */}
      <ul className="mt-6 grid w-full max-w-[380px] list-none grid-cols-3 gap-4 p-0 max-[420px]:grid-cols-1">
        {panel.benefits.map((benefit) => (
          <li key={benefit.lines.join(" ")} className="flex flex-col items-center gap-3 text-center">
            <BenefitMark name={benefit.lines[0]} />
            <span className="font-sans text-[clamp(10px,0.78vw,13px)] leading-[1.25] tracking-[0.9px] text-[#f9f3d0]">
              {benefit.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>

      {/*
        **The site's own gold button**, not a gradient rebuilt here. `btn-gold`
        carries the real `--gradient-gold`, the button radius, Cinzel, and the
        glow-and-lift on hover that every other call to action on the site
        answers with — none of which a hand-rolled gradient had.
      */}
      <Button
        onClick={onBuy}
        size="fluid"
        className={cn(
          /*
            Her button is 470x66 inside a 772 panel — 61% of its width and
            7.1:1, so it sits snug around its label rather than stretching.
            `w-fit` with her own ratio as padding; the min-height is the 44px
            tap target, which a 7:1 box clears on its own above a phone.
          */
          "mt-7 w-fit min-h-[44px] px-[1.45em] py-[0.42em]",
          /*
            A floor as well as a fit: sized from its label alone the button
            shrank to 5.9:1 on a laptop, where her frame is 7.1:1, so it
            started reading as a chip rather than as the page's one call to
            action. 60% of the 560px panel, less its padding.
          */
          "min-w-[min(100%,330px)]",
          "text-[clamp(13px,1.1vw,18px)] leading-none tracking-[0.01em]",
        )}
      >
        <KeyholeMark />
        {panel.action}
      </Button>

      {/*
        The one line in Magically; everything else in the panel is Gill Sans.

        The number is the backend's once it has answered, and the bundled `$29`
        until then — the button above leads to a checkout in the visitor's own
        currency, so a line that always said `$29` was the wrong price for
        anyone outside the US. See `lib/pass-price.ts`.
      */}
      <p className="mt-3 text-center font-display text-[clamp(16px,1.5vw,24px)] tracking-[0.36px] text-white">
        {priceLine}
      </p>

      {/*
        Signed out: the way back in for somebody who already owns the pass.

        **It opens the masthead's panel on desktop and goes to `/login/` on a
        phone**, and the split is the drawer's doing rather than this panel's.

        The desktop row still hides a real `SignInForm` behind its account
        mark, so there the original reasoning holds in full: somebody who has
        already bought the pass should not have to leave the room they paid for
        in order to prove they paid for it. They never move, and the panel above
        them re-decides the moment the session exists, because it reads the same
        store the sign in writes to.

        The drawer has no form to open since 30 October 2026 — it is a button to
        `/login/` now, for the reasons on `AccountDrawerSection`. Opening it
        would put a visitor in front of a drawer holding a second button to
        press, so the phone takes the trip directly and `?next=` brings them
        back to this room. One navigation each way, against two presses and the
        same navigation.

        The header is `z-50` and this panel `z-30`, so the desktop menu opens
        above it with no stacking work.
      */}
      {state === "signed-out" && (
        <p className="mt-4 text-center font-sans text-[clamp(13px,1.05vw,17px)] tracking-[0.75px] text-[#d4b06a]">
          {panel.signIn.lead}
          <button
            type="button"
            onClick={() => {
              /*
                Read at the press rather than at render: a resize across
                `desktop-nav` between the two would otherwise send a phone to
                the dropdown that is `display: none` on it, which is the fault
                `visibleSurface` exists to avoid.
              */
              if (visibleSurface() === "row") {
                openAccountMenu();
                return;
              }

              router.push(`${signInPath}?next=${encodeURIComponent(viewingRoomPath)}`);
            }}
            className="cursor-pointer underline decoration-from-font underline-offset-2"
          >
            {panel.signIn.link}
          </button>
        </p>
      )}

      {/* Signed in without the pass: say which account, and offer the way out. */}
      {state === "no-pass" && <AccountLine labels={labels} pretend={pretendAccount} />}
    </div>
  );
}

/**
 * The keyhole inside the gold button (`384:36`).
 *
 * **The viewBox is the artwork's own bounds, and that is what centres it.**
 * The first version drew into `0 0 17 29` with the shape spanning y=3..27 and
 * x=2.5..15.5 — three units of empty space above against two below, and the
 * whole figure half a unit right of centre. `flex` centres the *box*, so the
 * mark sat visibly low and slightly right of the label beside it.
 *
 * Here the box is exactly the figure: 14 wide, 24 tall, origin at 0,0, with
 * the stem symmetrical about x=7. Nothing to align around.
 */
function KeyholeMark() {
  return (
    <svg
      viewBox="0 0 14 24"
      aria-hidden
      /*
        **Nudged up, because the label is all capitals.** `flex` centres the
        icon on the text's *line box*, but Cinzel's capitals sit in the upper
        part of that box with the descender space empty beneath them — so a
        perfectly centred icon reads low against the letters. Measured 2.25px
        low off the rendered button at this size; `-0.09em` is that offset
        expressed against the type so it holds as the button scales.
      */
      className="block h-[1.05em] w-auto shrink-0 translate-y-[-0.13em] fill-current"
    >
      <circle cx="7" cy="7" r="7" />
      <path d="M4 12h6l1.6 12H2.4z" />
    </svg>
  );
}

/**
 * Her three marks (`384:41`, `384:34`, `384:35`) — cards, infinity, star.
 *
 * **Hers, not redrawn.** These shipped as inline SVG first, which was a guess
 * at artwork she had already made: her star has a filled roundel and her
 * infinity is a drawn ribbon, neither of which a generic path approximates.
 *
 * Keyed off the caption's first line rather than an index, so reordering the
 * benefits in `content/viewing-room.ts` cannot silently swap the pictures.
 */
function BenefitMark({ name }: { name: string }) {
  const mark = name.startsWith("LIFETIME")
    ? marks.infinity
    : name.startsWith("MOTION")
      ? marks.star
      : marks.cards;

  return (
    <img
      src={mark.src}
      alt=""
      width={mark.width}
      height={mark.height}
      /* Her 69-76px, held to one box so three different sources line up. */
      className="h-[clamp(34px,3.1vw,48px)] w-auto"
    />
  );
}
