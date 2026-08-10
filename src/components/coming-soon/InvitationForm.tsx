import { Button } from "@/components/ui/Button";
import { comingSoon } from "@/content/coming-soon";

/**
 * Mirrors NewsletterForm.tsx's markup, `.field` styling and HTML5-only
 * validation exactly — no submit handler, no backend. Same caveat as that
 * component: the endpoint is wired up when one exists.
 */
export function InvitationForm() {
  return (
    <form className="flex w-full max-w-[36.25rem] flex-col items-center gap-[0.6em]">
      <div className="flex w-full items-center gap-[0.5em]">
        <label htmlFor="invitation-email" className="shrink-0 text-nav text-champagne">
          {comingSoon.emailLabel}
        </label>
        <input
          id="invitation-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          /* RFC 5321's maximum addressable length. */
          maxLength={254}
          className="field w-full px-3 py-2 text-note"
        />
      </div>

      <label className="flex items-start gap-[0.5em] text-note text-champagne">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-[0.2em] size-[1.125em] shrink-0 appearance-none border border-ash bg-transparent checked:bg-gold"
        />
        <span className="text-left">{comingSoon.consent}</span>
      </label>

      <Button type="submit" className="lowercase">
        {comingSoon.submitLabel}
      </Button>

      <p className="rounded-full bg-night/25 px-[1.1em] py-[0.5em] text-center text-fine text-champagne">
        {comingSoon.finePrint.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>
    </form>
  );
}
