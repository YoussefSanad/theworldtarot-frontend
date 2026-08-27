import type { SocialIconName } from "@/components/ui/SocialIcon";
import { icons } from "@/lib/assets";

/**
 * Site-wide navigation and identity. Routes beyond the homepage are not built
 * yet, so links point at the paths from the navigation document and will
 * resolve once those pages land.
 */

export type NavLink = { label: string; href: string };

export const primaryNav: NavLink[] = [
  { label: "WORLD TAROT", href: "/world-tarot" },
  { label: "LIVING TAROT", href: "/living-tarot" },
  { label: "READINGS", href: "/readings" },
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
  cta: { label: "GET MY READING", href: "/readings" },
  account: { label: "Sign in", href: "/login", icon: icons.login },
  bag: { label: "Your bag", href: "/checkout", icon: icons.bag },
};

export const footerNav: NavLink[] = [
  { label: "World Tarot", href: "/world-tarot" },
  { label: "Living Tarot", href: "/living-tarot" },
  { label: "Readings", href: "/readings" },
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
