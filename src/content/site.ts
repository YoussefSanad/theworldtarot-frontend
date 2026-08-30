import type { SocialIconName } from "@/components/ui/SocialIcon";
import { signInPath } from "@/content/login";
import { icons } from "@/lib/assets";

/**
 * Site-wide navigation and identity. Routes beyond the homepage are not built
 * yet, so links point at the paths from the navigation document and will
 * resolve once those pages land.
 *
 * **`/readings/` carries a trailing slash and the paths below it do not.** The
 * export is a directory of `index.html` files and `next.config.mjs` sets
 * `trailingSlash: true`, so a link without one costs a 308 on the way — the
 * same reasoning as `signInPath` in `content/login.ts`. The slash only buys
 * anything on a route that exists, and every other path named in this file is
 * unbuilt: each answers a 404 whichever way it is written, and slashing them
 * now would say they had been built.
 *
 * **The rule is not yet true of the whole repository, and this file is not the
 * place that would make it so.** `content/home.ts`, `content/checkout.ts` and
 * `content/readings.ts` still link `/readings` and `/readings/month-ahead`
 * without the slash, and both of those are built routes paying the hop. Left
 * for the ticket that owns it rather than swept in here; recorded in
 * `AUTH-REVIEW-FIXES.md` under F4.
 */

export type NavLink = { label: string; href: string };

export const primaryNav: NavLink[] = [
  { label: "WORLD TAROT", href: "/world-tarot" },
  { label: "LIVING TAROT", href: "/living-tarot" },
  { label: "READINGS", href: "/readings/" },
  { label: "LIBRARY", href: "/library" },
  { label: "FAQ", href: "/faq" },
];

/**
 * The masthead's own controls.
 *
 * **`cta` is the site-wide rule for where GET MY READING goes**, and it is
 * worth stating because the same words appear at the foot of several pages
 * with two different destinations. A page that sells one reading sends it to
 * that reading's checkout — on a reading page the checkout is on the page, so
 * it is an anchor. Every other page — the homepage, World Tarot, Living Tarot,
 * the Library, the Collection — sends it here, to the readings index, because
 * there is nothing to check out yet. The masthead is on all of them, so it
 * always takes the second form.
 */
export const headerActions = {
  cta: { label: "GET MY READING", href: "/readings/" },
  /**
   * The icon a visitor presses. `/login/` is a built route since #49 — it was
   * named here from the client's navigation document long before the page
   * existed, and pointed at a 404 for as long as it did.
   */
  account: { label: "Sign in", href: signInPath, icon: icons.login },
  /** The other half of that control, shown once somebody is signed in. */
  signOut: { label: "Sign out" },
  bag: { label: "Your bag", href: "/checkout", icon: icons.bag },
};

export const footerNav: NavLink[] = [
  { label: "World Tarot", href: "/world-tarot" },
  { label: "Living Tarot", href: "/living-tarot" },
  { label: "Readings", href: "/readings/" },
  { label: "Library", href: "/library" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Refund Policy", href: "/refunds" },
];

export const socialLinks: { label: string; href: string; icon: SocialIconName }[] = [
  { label: "Facebook", href: "https://facebook.com", icon: "facebook" },
  { label: "Instagram", href: "https://instagram.com", icon: "instagram" },
  { label: "TikTok", href: "https://tiktok.com", icon: "tiktok" },
  { label: "YouTube", href: "https://youtube.com", icon: "youtube" },
];

export const newsletter = {
  heading: "STAY CONNECTED:",
  blurb: ["Receive occasional reflections and", "readings from sacred places around the world."],
  consent: "I agree to receive emails from The World Tarot and understand I can unsubscribe any time.",
  submitLabel: "stay connected",
};

export const siteName = "The World Tarot";
export const copyright = "© 2026 The World Tarot • All rights reserved.";
