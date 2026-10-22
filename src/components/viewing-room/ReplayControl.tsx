"use client";

import { cn } from "@/lib/cn";

/**
 * The way back into a film that has just ended.
 *
 * **The frame draws no post-playback state**, so this is ours rather than the
 * client's. Her film holds its final frame and the composition stops there —
 * which leaves a visitor who has just watched The Star with no way to watch it
 * again except by selecting another card and coming back. This is that way.
 *
 * It borrows the carousel button's vocabulary — a 43px gold disc, the size she
 * draws at `384:23` — so it reads as part of the room rather than as a browser
 * control sitting on top of one.
 *
 * ## Not hover-gated, which is the whole design
 *
 * The obvious build is "appears on hover", and it is wrong twice: hover does
 * not exist on touch, and it is invisible to a keyboard. A control that only
 * appears on hover is a control most phone visitors never find.
 *
 * So it rests quiet and lifts on hover **and** on focus, and starts at full
 * strength where there is no hover to wait for. The effect on a desktop
 * pointer is the one the client asked for; the difference is that everybody
 * else can find it too.
 */
export function ReplayControl({
  onReplay,
  label,
}: {
  onReplay: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onReplay}
      aria-label={label}
      className={cn(
        // Centred on the card and the same 88px disc as the play button: this
        // is the same affordance a second time, so it is the same control.
        "absolute inset-0 z-10 grid place-items-center",
        "opacity-70 transition-opacity duration-300 ease-out",
        "hover:opacity-100 focus-visible:opacity-100",
        // No hover to wait for: show it outright rather than hiding a control
        // behind a gesture the device cannot make.
        "[@media(hover:none)]:opacity-100",
      )}
    >
      <span className="grid size-[88px] place-items-center rounded-full border border-[color:var(--gold-line,#d4b06a)]/70 bg-black/40 text-[color:var(--gold,#d4b06a)] backdrop-blur-sm">
      {/* A circling arrow: replay, in the gold the room already uses. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-8 fill-none stroke-current stroke-[1.6]"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
        <path d="M20 4v4.5h-4.5" />
      </svg>
      </span>
    </button>
  );
}
