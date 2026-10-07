/**
 * The width to cut out of the LOOK FOR rule for a label of this length.
 *
 * Her `divider-look-for.webp` is one image with a transparent band masked
 * through its middle, and `.look-for__rule` sizes that band in `ch` against its
 * own copy of the label's font — so one `ch` here is one character there. See
 * globals.css for why the rule is masked rather than the label painted.
 *
 * Three characters of clearance is what "LOOK FOR:" was tuned with, and the
 * floor keeps a short label from pulling the cut tighter than the design: the
 * band is also what holds the two halves of her rule apart.
 *
 * **Its own module, not `LookFor.tsx`.** The test runner is `node --test` with
 * `--experimental-strip-types`, which strips TypeScript but not JSX — a `.tsx`
 * import fails with `ERR_UNKNOWN_FILE_EXTENSION`, so every test in this repo is
 * on a `.ts` file. A pure function that needs testing therefore lives beside
 * the component rather than inside it.
 */
export function lookForGap(label: string): string {
  return `${Math.max(12, label.length + 3)}ch`;
}
