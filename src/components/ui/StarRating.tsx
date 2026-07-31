import { cn } from "@/lib/cn";

/**
 * The five-star mark above each testimonial. Drawn as glyphs so they take a
 * soft white halo (Figma 0 0 13px) without shipping a color-emoji face.
 */
export function StarRating({ className }: { className?: string }) {
  return (
    <p aria-label="Rated 5 out of 5" className={cn("glow-star tracking-[0.1em] text-gold", className)}>
      <span aria-hidden>★★★★★</span>
    </p>
  );
}
