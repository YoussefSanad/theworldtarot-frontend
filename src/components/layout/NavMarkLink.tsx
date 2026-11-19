"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { navAriaCurrent } from "@/lib/nav-active";
import { cn } from "@/lib/cn";

/**
 * A primary-nav link that marks the page the visitor is on — the plain
 * desktop links and the drawer's rows.
 *
 * **A dropdown group's own label is deliberately not one of these.** LIBRARY
 * and READINGS stay unmarked on every page; the current page is shown by its
 * row inside the panel (desktop) or under the label (drawer) instead.
 *
 * **The mark is the localization dropdown's own**: gold text and the small gold
 * point (`.menu-option-dot`) carrying `--glow-gold`, with `aria-current` in the
 * markup. The point is a shape, so the mark does not rest on colour alone.
 *
 * **The point hangs in the space before the label** (`.nav-mark-link`) rather
 * than taking a slot in the row. The locale rows can afford a slot because
 * every row there has one; a nav of plain words cannot, or every item would
 * move apart to make room for a mark only one of them shows.
 *
 * The text colour is chosen here, not stacked: `cn` does not merge Tailwind
 * classes, so `ink` and `accent` on one element would leave the winner to the
 * stylesheet's order.
 *
 * `exact` is for dropdown children, active only on their own page; top-level
 * items are active for their whole section. See `lib/nav-active.ts`.
 */
export function NavMarkLink({
  href,
  exact,
  className,
  onClick,
  children,
}: {
  href: string;
  exact?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const current = navAriaCurrent(usePathname(), href, { exact });

  return (
    <Link
      href={href}
      aria-current={current}
      onClick={onClick}
      className={cn(
        "nav-mark-link tracking-[0.01em] transition-colors hover:text-(--header-accent) focus-visible:text-(--header-accent)",
        current ? "text-(--header-accent)" : "text-(--header-ink)",
        className,
      )}
    >
      <span aria-hidden className="menu-option-dot" />
      {children}
    </Link>
  );
}
