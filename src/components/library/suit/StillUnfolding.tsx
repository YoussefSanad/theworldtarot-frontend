/**
 * The block that closes a suit page: a bold line saying the suit is not
 * finished, over the note about cards arriving.
 *
 * **This is her design for the page as it stands, not a placeholder of ours.**
 * The fifty-six Minor Arcana have neither copy nor artwork, and rather than
 * leave the question hanging her frame answers it in the page. When those cards
 * land, this is where their grid goes.
 *
 * The copy is per suit because the singular is — "each Cup", "each Pentacle",
 * "each Sword", "each Wand" — so both lines are stored whole in
 * `suit-content.ts` and nothing is assembled from the suit's name.
 */
export function StillUnfolding({
  heading,
  body,
}: {
  heading: string;
  body: readonly string[];
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <h2 className="font-serif text-card-lead font-bold leading-none tracking-[0.02em] text-card-ink">
        {heading}
      </h2>

      {/*
        **Her line breaks, kept.** The block is three short centred lines in
        every frame rather than a paragraph that wraps, so each is its own
        element — the same reasoning as `ClosingSaying`'s `saying` array.
      */}
      <div className="mt-[clamp(calc(0.5rem*var(--card-scale)),calc(1.04vw*var(--card-scale)),calc(1.25rem*var(--card-scale)))] flex flex-col">
        {body.map((line) => (
          <p key={line} className="font-light text-card-label tracking-[0.01em] text-card-ink-soft">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
