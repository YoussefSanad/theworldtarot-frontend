/**
 * Stopping the page behind an overlay from scrolling, once, however many
 * overlays are open.
 *
 * ## Why this is a seam and not two effects
 *
 * It was two: `PaywallModal` saved `body.style.overflow`, set it to `hidden`,
 * and restored what it saved on unmount, and the masthead's drawer did the same
 * to `documentElement` and `body` with a snapshot of its own. Two independent
 * save-and-restore pairs on one property, which works perfectly until they
 * overlap.
 *
 * Overlapped, they corrupt each other. The paywall captures "the page scrolls",
 * the drawer opens over it and captures "hidden" — the paywall's own doing —
 * and then whichever unwinds second writes its snapshot last. Close them in the
 * wrong order and the page is left unscrollable with nothing on top of it to
 * explain why, which on a phone is a dead site.
 *
 * That order is not hypothetical: a member signing out from inside the drawer
 * on the Viewing Room unmounts the paywall while the drawer is still open.
 *
 * So the lock counts its holders. The first one captures and locks; the last
 * one to leave restores. Nobody in between captures anything, which is the
 * whole fix — the snapshot is of the page before *any* overlay, and it can only
 * be taken once.
 */

/** How many overlays are currently holding the page still. */
let holders = 0;

/** The page as it was before the first of them, or null when nothing holds it. */
let captured: {
  rootOverflow: string;
  rootPaddingRight: string;
  bodyOverflow: string;
} | null = null;

/**
 * Holds the page still, and answers with the release.
 *
 * Call it in an effect and return its answer as the cleanup:
 * `useEffect(() => lockScroll(), [])`.
 *
 * **The release is idempotent**, because React's development double-mount and a
 * component that unmounts mid-transition both make a second call easy to reach,
 * and a release that decremented twice would hand the page back while another
 * overlay was still up.
 *
 * `documentElement` as well as `body`: the root carries `overflow-x: hidden`
 * on this site, so locking only `body` leaves the page scrolling underneath.
 * The scrollbar's width goes on as padding while it is gone, or the layout
 * jumps sideways as the overlay opens.
 */
export function lockScroll(): () => void {
  const root = document.documentElement;

  if (holders === 0) {
    captured = {
      rootOverflow: root.style.overflow,
      rootPaddingRight: root.style.paddingRight,
      bodyOverflow: document.body.style.overflow,
    };

    /* Measured before anything is hidden: once `overflow` is `hidden` the
       scrollbar is already gone and the difference reads as zero. */
    const scrollbarWidth = window.innerWidth - root.clientWidth;

    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) root.style.paddingRight = `${scrollbarWidth}px`;
  }

  holders += 1;

  let released = false;

  return () => {
    if (released) return;
    released = true;
    holders -= 1;

    if (holders > 0 || captured === null) return;

    root.style.overflow = captured.rootOverflow;
    root.style.paddingRight = captured.rootPaddingRight;
    document.body.style.overflow = captured.bodyOverflow;
    captured = null;
  };
}
