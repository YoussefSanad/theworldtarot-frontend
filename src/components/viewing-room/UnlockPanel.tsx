"use client";

import Link from "next/link";

import { AccountLine } from "@/components/viewing-room/AccountLine";
import { viewingRoom } from "@/content/viewing-room";
import { cn } from "@/lib/cn";
import type { AccessState } from "@/lib/viewing-room-access";

const { panel } = viewingRoom;

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
}: {
  state: AccessState;
  onBuy: () => void;
  labels: { signedInAs: string; switch: string };
}) {
  return (
    <div className="mt-4 flex flex-col items-center">
      {/* Her key divider (`384:40`), as a rule with a keyhole at its middle. */}
      <div aria-hidden className="flex w-full max-w-[380px] items-center gap-3 opacity-80">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4b06a]/60" />
        <KeyMark />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4b06a]/60" />
      </div>

      <p className="mt-5 max-w-[560px] text-center text-[clamp(14px,1.25vw,20px)] leading-[1.35] text-[#f9f3d0]">
        {panel.body}
      </p>

      {/*
        Three benefits across at every width down to the phone, where they
        stack: her row is three short captions, and squeezing them onto one
        line on a 360 would shrink the type below the rest of the panel.
      */}
      <ul className="mt-6 grid w-full max-w-[460px] list-none grid-cols-3 gap-4 p-0 max-[420px]:grid-cols-1">
        {panel.benefits.map((benefit) => (
          <li key={benefit.lines.join(" ")} className="flex flex-col items-center gap-3 text-center">
            <BenefitMark name={benefit.lines[0]} />
            <span className="font-serif text-[clamp(10px,0.78vw,13px)] leading-[1.25] tracking-[0.9px] text-[#f9f3d0]">
              {benefit.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onBuy}
        className={cn(
          "mt-7 flex w-full max-w-[390px] items-center justify-center gap-3",
          // 66px at her size, never below the 44px tap target on a phone.
          "min-h-[clamp(48px,3.4vw,56px)] rounded-full px-6",
          "bg-gradient-to-b from-[#f4dfa8] via-[#d4b06a] to-[#b8923f]",
          "font-serif text-[clamp(14px,1.25vw,20px)] tracking-[-0.3px] text-[#101b2e]",
          "transition-[filter] hover:brightness-110",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        )}
      >
        <KeyholeMark />
        {panel.action}
      </button>

      <p className="mt-3 text-center text-[clamp(15px,1.4vw,22px)] tracking-[0.36px] text-white">
        {panel.price}
      </p>

      {/*
        Signed out: the way back in for somebody who already owns the pass.
        `next` brings them back here rather than to the homepage — the return
        path itself is #132's, and this is the link it will honour.
      */}
      {state === "signed-out" && (
        <p className="mt-4 text-center text-[clamp(13px,1.05vw,17px)] tracking-[0.75px] text-[#d4b06a]">
          {panel.signIn.lead}
          <Link
            href="/login/?next=/viewing-room/"
            className="underline decoration-from-font underline-offset-2"
          >
            {panel.signIn.link}
          </Link>
        </p>
      )}

      {/* Signed in without the pass: say which account, and offer the way out. */}
      {state === "no-pass" && <AccountLine labels={labels} />}
    </div>
  );
}

function KeyMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-[#d4b06a] stroke-[1.4]">
      <circle cx="8" cy="12" r="3.2" />
      <path d="M11.2 12H21M18 12v3M15 12v2.2" strokeLinecap="round" />
    </svg>
  );
}

function KeyholeMark() {
  return (
    <svg viewBox="0 0 17 29" aria-hidden className="h-[1.1em] w-auto shrink-0 fill-[#101b2e]">
      <circle cx="8.5" cy="9" r="6" />
      <path d="M5.5 14h6l2 13h-10z" />
    </svg>
  );
}

/**
 * Her three icons (`384:34`, `384:35`, `384:41`) — cards, infinity, star —
 * drawn rather than shipped as bitmaps, in the same gold as the rest of the
 * panel. They are simple enough that three more PNGs would cost more than
 * they return.
 */
function BenefitMark({ name }: { name: string }) {
  const common = "size-[clamp(32px,2.9vw,46px)] fill-none stroke-[#d4b06a] stroke-[1.2]";

  if (name.startsWith("LIFETIME")) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden className={common}>
        <path d="M17 24c0-4 3-7 7-7s7 3 7 7-3 7-7 7-7-3-7-7z" opacity="0" />
        <path d="M14 19c-3 0-5 2.2-5 5s2 5 5 5c5 0 7-10 12-10 3 0 5 2.2 5 5s-2 5-5 5c-5 0-7-10-12-10z" />
        <circle cx="24" cy="24" r="22" opacity="0.35" />
      </svg>
    );
  }

  if (name.startsWith("MOTION")) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden className={common}>
        <path d="M24 10l3.6 8.2 8.9.9-6.7 6 1.9 8.8L24 29.4 16.3 33.9l1.9-8.8-6.7-6 8.9-.9z" />
        <circle cx="24" cy="24" r="22" opacity="0.35" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden className={common}>
      <rect x="13" y="12" width="16" height="24" rx="2" />
      <path d="M31 16l5 2-6 18-4-1.4" />
      <circle cx="24" cy="24" r="22" opacity="0.35" />
    </svg>
  );
}
