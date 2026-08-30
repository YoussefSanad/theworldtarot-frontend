import Link from "next/link";
import { Fragment } from "react";

import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { copyright, footerNav, socialLinks } from "@/content/site";
import { surfaces } from "@/lib/assets";

export function SiteFooter() {
  return (
    <footer className="relative z-10 stack mt-[clamp(0.5rem,0.73vw,0.875rem)]">
      <div
        aria-hidden
        className="veil size-full"
        style={{ backgroundImage: `linear-gradient(var(--veil-ink), var(--veil-ink)), url(${surfaces.footer})` }}
      />

      <div className="shell shell--page relative flex flex-col items-center gap-[1.9em] px-gutter pt-[clamp(1.5rem,2.71vw,3.25rem)] pb-[clamp(1rem,1.46vw,1.75rem)]">
        <div className="flex w-full flex-col items-center gap-[2em] lg:flex-row lg:items-start lg:justify-between lg:gap-gutter">
          <NewsletterForm />

          <span aria-hidden className="hidden w-px self-stretch bg-ash lg:block" />

          <section className="flex flex-col items-center gap-[0.9em]">
            <h2 className="font-display text-h2 text-ash">FOLLOW THE JOURNEY:</h2>
            {/*
              Same gold as the newsletter's submit, so `.btn-gold` carries the
              gradient, the ink-deep glyph colour and the hover glow rather than
              this restating them.
            */}
            <ul className="flex items-center gap-[1.5rem]">
              {socialLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    className="btn btn-gold size-[2.75rem] rounded-full [--btn-hover-scale:1.08]"
                  >
                    <SocialIcon name={item.icon} className="size-[1.5rem]" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Margin rather than a wider column gap, which also sets nav-to-copyright. */}
        <nav
          aria-label="Footer"
          className="mt-[clamp(0.75rem,1.6vw,1.875rem)] flex flex-wrap items-center justify-center text-note text-ash"
        >
          {footerNav.map((link, index) => (
            <Fragment key={link.href}>
              {index > 0 ? <span aria-hidden className="px-[0.5em] opacity-70">I</span> : null}
              <Link href={link.href} className="transition-colors hover:text-gold">
                {link.label}
              </Link>
            </Fragment>
          ))}
        </nav>

        <p className="text-center text-note text-ash">{copyright}</p>
      </div>
    </footer>
  );
}
