"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { headerActions, primaryNav, siteName } from "@/content/site";
import { brand } from "@/lib/assets";
import { cn } from "@/lib/cn";

/**
 * Masthead: logo on the left, actions and navigation stacked on the right.
 * Transparent so the page atmosphere continues behind it into the hero.
 * Below the large breakpoint the navigation collapses behind a menu button.
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-20">
      <div className="relative mx-auto flex w-full max-w-[1920px] flex-wrap items-center justify-between gap-x-gutter gap-y-4 px-gutter py-2">
        <Link href="/" aria-label={`${siteName} home`} className="shrink-0">
          <Image
            src={brand.logo.src}
            alt={siteName}
            width={brand.logo.width}
            height={brand.logo.height}
            priority
            className="w-[clamp(11rem,20.9vw,25.0625rem)]"
          />
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          className="btn btn-ghost px-4 py-2 text-note lg:hidden"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>

        <div
          id="primary-navigation"
          className={cn(
            "w-full flex-col items-stretch gap-6 pb-4 lg:flex lg:w-auto lg:items-end lg:pb-0",
            menuOpen ? "flex" : "hidden",
          )}
        >
          <div className="flex flex-wrap items-center gap-[0.93em] text-nav lg:justify-end">
            <ButtonLink
              href={headerActions.cta.href}
              variant="ghost"
              size="fluid"
              className="min-h-[2.03em] px-[1.4em] py-[0.2em] text-nav text-champagne"
            >
              {headerActions.cta.label}
            </ButtonLink>

            {[headerActions.account, headerActions.bag].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                aria-label={action.label}
                className="opacity-90 transition-opacity hover:opacity-100"
              >
                <Image
                  src={action.icon.src}
                  alt=""
                  width={action.icon.width}
                  height={action.icon.height}
                  className="h-[clamp(1.375rem,2.4vw,2.875rem)] w-auto"
                />
              </Link>
            ))}
          </div>

          <nav aria-label="Primary" className="flex flex-col gap-4 text-nav lg:flex-row lg:items-center lg:gap-[1.33em]">
            {primaryNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-mist-dim tracking-[0.01em] transition-colors hover:text-gold focus-visible:text-gold"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
