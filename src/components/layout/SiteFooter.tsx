import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { copyright, footerNav, socialLinks } from "@/content/site";
import { surfaces } from "@/lib/assets";

export function SiteFooter() {
  return (
    <footer className="stack mt-[clamp(0.5rem,0.73vw,0.875rem)]">
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
            <ul className="flex items-center gap-[1.5rem]">
              {socialLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    className="flex size-[2.75rem] items-center justify-center rounded-full border border-ash transition-[border-color,box-shadow,filter] duration-300 hover:border-gold hover:shadow-[var(--glow-gold)] hover:brightness-110"
                  >
                    <Image src={item.icon.src} alt="" width={item.icon.width} height={item.icon.height} className="size-[1.375rem]" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center text-note text-ash">
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
