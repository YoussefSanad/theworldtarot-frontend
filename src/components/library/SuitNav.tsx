import Link from "next/link";

import { majorArcanaNav, suits } from "@/content/library";
import { cn } from "@/lib/cn";

/**
 * The mini navigation above the grid: MAJOR ARCANA | SWORDS | CUPS | WANDS |
 * PENTACLES.
 *
 * **Major Arcana is the Library's own path**, not a section within it. The
 * grid is the default view of `/library/`, so the first item points at the page
 * it is on whenever the grid is showing, and acts as the way back from a suit.
 *
 * **The current item is marked, which Figma does not draw.** A static mockup
 * has no state to show, so this is an addition rather than a departure — the
 * same kind as the mobile menu button and the carousel dots (see
 * `src/app/README.md`): a navigation that cannot say where you are is a hole in
 * the page, not a faithful rendering of it. The mark is `aria-current` for a
 * screen reader and full-strength gold against dimmed siblings for everyone
 * else, so it never rests on colour alone to be noticed.
 *
 * The separators are drawn by CSS rather than typed between the links, so they
 * are never read aloud as "pipe" and never end up inside a link's own text.
 */
export function SuitNav({ current }: { current?: string }) {
  const items = [majorArcanaNav, ...suits.map((suit) => ({ label: suit.label, href: suit.href, slug: suit.slug }))];

  return (
    <nav aria-label="Library sections" className="library-suit-nav">
      <ul>
        {items.map((item) => {
          const slug = "slug" in item ? item.slug : undefined;
          /* No slug is the Major Arcana entry, which is current on the grid itself. */
          const isCurrent = slug === undefined ? current === undefined : current === slug;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn("library-suit-nav__link", isCurrent && "is-current")}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
