/**
 * Which primary-nav items mark the page the visitor is on.
 *
 * One pure function for the desktop nav, the dropdown panel and the mobile
 * drawer, so the three cannot disagree about where you are.
 *
 * **Both sides are normalised before they are compared**, rather than trusting
 * the strings. `trailingSlash: true` is on, so the router reports every
 * pathname with its slash — but two nav hrefs are spelled without one
 * (`/faq`, `/readings/one-card`), and a query or hash on an href must not
 * stop it matching. Neither of those two routes exists yet, so they can never
 * be active today; this is what makes them work the day they ship.
 *
 * **A top-level item is active for its whole section** (`exact: false`):
 * LIBRARY on `/library/`, the four suit pages and every card page; READINGS on
 * the index and every reading under it. **A dropdown row is active only on its
 * own page** (`exact: true`), so MAJOR ARCANA (`/library/`) does not light up
 * on a suit.
 *
 * Matching is by whole path segment: the normalised href always ends in a
 * slash, so `/library/` never matches `/libraryfoo/`. `/` matches only itself,
 * or a home item would be active on every page.
 */
export function normalisePath(path: string): string {
  const bare = path.split(/[?#]/, 1)[0];

  return bare.endsWith("/") ? bare : `${bare}/`;
}

export function isNavActive(
  pathname: string | null | undefined,
  href: string,
  { exact = false }: { exact?: boolean } = {},
): boolean {
  /* `usePathname()` can be null under the Pages Router; nothing is current then. */
  if (!pathname) return false;

  const here = normalisePath(pathname);
  const target = normalisePath(href);

  if (here === target) return true;

  return !exact && target !== "/" && here.startsWith(target);
}

/**
 * The `aria-current` value for an item, or `undefined` when it is not current.
 *
 * `"page"` is the page itself. `"true"` is a section the visitor is inside but
 * not on the landing page of — READINGS while on `/readings/three-card/` —
 * so a screen reader hears one current page, not two.
 */
export function navAriaCurrent(
  pathname: string | null | undefined,
  href: string,
  options: { exact?: boolean } = {},
): "page" | "true" | undefined {
  if (!isNavActive(pathname, href, options)) return undefined;

  return pathname && normalisePath(pathname) === normalisePath(href) ? "page" : "true";
}
