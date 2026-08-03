import { Button } from "@/components/ui/Button";
import { newsletter } from "@/content/site";

/**
 * Mailchimp signup. The markup and validation live here; the submit endpoint is
 * a backend contract and is wired up when that route exists.
 */
export function NewsletterForm() {
  return (
    <form className="flex w-full max-w-[36.25rem] flex-col items-center gap-[0.6em]">
      <h2 className="font-display text-h2 text-ash">{newsletter.heading}</h2>

      <div className="grid w-full grid-cols-1 items-center gap-x-[0.5em] gap-y-[0.3em] lg:grid-cols-[auto_1fr]">
        <label htmlFor="newsletter-first-name" className="sr-only lg:not-sr-only lg:text-right lg:text-nav lg:text-ash">
          FIRST NAME:
        </label>
        <input
          id="newsletter-first-name"
          name="firstName"
          type="text"
          autoComplete="given-name"
          maxLength={40}
          placeholder="First name"
          className="field w-full px-3 py-2 text-note lg:placeholder:text-transparent"
        />

        <label htmlFor="newsletter-email" className="sr-only lg:not-sr-only lg:text-right lg:text-nav lg:text-ash">
          EMAIL:
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          /* RFC 5321's maximum addressable length. */
          maxLength={254}
          placeholder="Email"
          className="field w-full px-3 py-2 text-note lg:placeholder:text-transparent"
        />
      </div>

      <p className="text-center text-note text-[#fcfbf8]">
        {newsletter.blurb.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>

      {/* Figma leaves ~29px above and ~24px below the consent row; the form gap covers ~10px of that. */}
      <label className="mt-[clamp(0.75rem,1vw,1.2rem)] mb-[clamp(0.5rem,0.73vw,0.875rem)] flex items-start gap-[0.5em] text-fine text-[#fcfbf8]">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-[0.2em] size-[1.125em] shrink-0 appearance-none border border-ash bg-transparent checked:bg-gold"
        />
        <span>{newsletter.consent}</span>
      </label>

      <Button type="submit" className="lowercase">
        {newsletter.submitLabel}
      </Button>
    </form>
  );
}
