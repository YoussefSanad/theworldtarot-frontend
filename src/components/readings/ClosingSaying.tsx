import { Container, Section, type ContainerWidth } from "@/components/layout/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Divider, type DividerVariant } from "@/components/ui/Divider";
import { Phrase } from "@/components/ui/Phrase";
import { closing } from "@/content/readings";
import { cn } from "@/lib/cn";

/**
 * The line a readings page closes on, ruled above and below, with its last
 * call to action under it. Figma draws the two rules from the same 448x55
 * artwork the rest of the site uses.
 *
 * **Both readings frames end this way** — the index (`300:68`) and a single
 * reading's own page (`329:496`) — with the same rules, the same 50px display
 * type and the same gold button under them. Only the words, the colour of them
 * and where the button goes change, so those are props and the block is one
 * definition rather than two that drift.
 *
 * Shares the panels' measure so the button lines up with the content above it,
 * and runs full width below `lg` — her mobile mockup sets every button on the
 * index to the panel's own width, and only lets them hug their label on the
 * desktop frame.
 *
 * The air below the button is the client's, not the PSD's: she wants the room
 * to run on well past the last call to action before the footer cuts it off.
 * Because the artwork stands on the floor of the page, every pixel of this
 * padding is another pixel of the room on show — so this is the one number to
 * move if she wants more of it or less.
 *
 * Below `lg` that room-space is section padding, with the button sitting right
 * under the rule the way the mobile mockup draws it. At `lg` the same clamp
 * becomes the button's own box instead, so the button centres in the space
 * rather than hugging the rule above it.
 *
 * **That centring is right only where this block owns the room.** On a page
 * that carries its own air below the closing line — World Tarot and the
 * Library both do, on their wrappers — the two are spent one on top of the
 * other and the button drifts a long way under the quote. Those pages pass
 * `hugRule`, which collapses the box so the button stays with the line; each
 * one's wrapper then carries the share the box used to contribute.
 */
export function ClosingSaying({
  saying = closing.saying,
  action = closing.action,
  tone = "champagne",
  width = "readings",
  rule = "hero",
  className,
  hugRule = false,
}: {
  saying?: readonly string[];
  /**
   * **`null` is a page with nowhere to send them**, and it renders the saying
   * and its rules with no button under them. That is `/redeem/`, where this
   * block is still the reading's closing line and the checkout it would
   * otherwise scroll to is not on the page; see `ReadingPresentation`.
   *
   * Only an explicit `null` — omitting it is still the readings index's own
   * call to action, which is what every caller that predates this wanted.
   */
  action?: { label: string; href: string } | null;
  /**
   * **Champagne is the site's closing colour**, which is why it is the default.
   * The World Tarot page, a reading's own page and the Library all close in
   * `--color-champagne`; the readings index was the last frame closing in gold,
   * and the client read that as off against the rest of the site — the same
   * note she gave on the Library, which moved for this reason first.
   *
   * `ink` is the exception that stays an exception: a card's reference page is
   * the one page closing on a light ground rather than a dark one, so it needs
   * a dark ink rather than either warm tone.
   *
   * `gold` is kept because the token and the treatment are still real, but no
   * page uses it now. A new caller reaching for it is probably reaching for the
   * default by mistake.
   */
  tone?: "gold" | "champagne" | "ink";
  width?: ContainerWidth;
  /**
   * Both readings frames draw this rule at 448px and take the default. The
   * World Tarot frame draws the same block at 538px — the wider of the two
   * exports the site already has — so that page asks for `heroWide` rather
   * than this block being copied to change one number.
   */
  rule?: DividerVariant;
  /**
   * Replaces this block's own room-space, for a page that owns the air under
   * its closing line rather than leaving it to the artwork behind.
   *
   * The card reference page is that case: its closing sits on a sheet of paper
   * with 305px of her own empty paper below it, so the readings pages' "show as
   * much of the room as possible" padding would be room this page does not
   * have.
   */
  className?: string;
  /**
   * Collapses the box the button is centred in, so it sits under the rule
   * instead of floating in the middle of up to 256px of air.
   *
   * **A page that owns the room below its closing line wants this**, because
   * otherwise that air is spent twice — once on the page's own bottom padding
   * and again on this box — and the button drifts away from the quote it
   * belongs under. The World Tarot and Library pages both ask for it, and both
   * carry the box's share on their own wrapper instead; each says so where its
   * padding is set.
   *
   * ~~It used to ride on `className`~~, which conflated two unrelated things:
   * a caller that only wanted different padding also silently moved the
   * button, and a caller that only wanted the button moved had to restate the
   * default padding to avoid losing it. `CardReferencePage` is the caller that
   * proves they are separate — it passes `className` and `action={null}`, so
   * it has padding of its own and no button to place.
   */
  hugRule?: boolean;
}) {
  return (
    <Section padding="none" className={cn(className ?? "pb-[clamp(calc(4rem*var(--block-rhythm)),calc(10vw*var(--block-rhythm)),calc(12rem*var(--block-rhythm)))] lg:pb-0")}>
      <Container width={width} className="flex flex-col items-center text-center">
        <Divider variant={rule} />

        <p
          className={cn(
            "mt-[clamp(calc(0.5rem*var(--block-rhythm)),calc(0.78vw*var(--block-rhythm)),calc(0.9375rem*var(--block-rhythm)))] font-display leading-[1.1]",
            /*
              The size travels with the tone, because on the page that asks for
              `ink` they are one decision: the readings frames set this line at
              50px and the card reference frame sets it at 42px, so an `ink`
              caller at `text-h2-lg` would simply be wrong against her drawing.
            */
            tone === "ink" ? "text-h3" : "text-h2-lg",
            tone === "gold" ? "text-gold" : tone === "ink" ? "text-card-ink" : "text-champagne",
          )}
        >
          <Phrase parts={saying} />
        </p>

        <Divider variant={rule} className="mt-[clamp(calc(0.5rem*var(--block-rhythm)),calc(1.04vw*var(--block-rhythm)),calc(1.25rem*var(--block-rhythm)))]" />

        {/*
          The box stays when the button does not. Its height is the room-space
          above — the client's air between the last rule and the footer, which
          is another slice of the artwork on show — and a page without a call
          to action wants that air as much as one with it.
        */}
        <div
          className={cn(
            "mt-[clamp(calc(0.75rem*var(--block-rhythm)),calc(2.19vw*var(--block-rhythm)),calc(2.625rem*var(--block-rhythm)))] flex flex-col items-center justify-center",
            /*
              The room-space box is the readings pages' air; a caller that owns
              its own asks for `hugRule`.

              **Which one it is also decides where the button sits.** With the
              box, the button centres in up to 256px and `lg:mt-0` hands the
              spacing to that centring. With the box collapsed there is nothing
              to centre in, so the margin above has to stay at `lg` or the
              button lands flush against the rule — that is the World Tarot
              frame's own 17px, near enough the 2.19vw this already sets.
            */
            hugRule ? "lg:h-0" : "lg:mt-0 lg:h-[clamp(calc(6rem*var(--block-scale)),calc(14vw*var(--block-scale)),calc(16rem*var(--block-scale)))]",
          )}
        >
          {/* 68px tall at 30px type in Figma; the width is the label's own. */}
          {action === null ? null : (
            <ButtonLink
              href={action.href}
              size="fluid"
              className="readings-cta tracking-[0.01em] lg:py-[0.633em] lg:text-nav lg:leading-none"
            >
              {action.label}
            </ButtonLink>
          )}
        </div>
      </Container>
    </Section>
  );
}
