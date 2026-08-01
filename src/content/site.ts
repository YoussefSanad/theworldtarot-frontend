import { icons, social } from "@/lib/assets";

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
  { label: "CONCEPT", href: "/concept/" },
];

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

export const socialLinks = [
  { label: "Facebook", href: "https://facebook.com", icon: social.facebook },
  { label: "Instagram", href: "https://instagram.com", icon: social.instagram },
  { label: "X", href: "https://x.com", icon: social.x },
  { label: "YouTube", href: "https://youtube.com", icon: social.youtube },
];

export const newsletter = {
  heading: "STAY CONNECTED:",
  blurb: ["Receive occasional reflections and", "readings from sacred places around the world."],
  consent: "I agree to receive emails from The World Tarot and understand I can unsubscribe any time.",
  submitLabel: "stay connected",
};

export const siteName = "The World Tarot";
export const copyright = "© 2026 The World Tarot • All rights reserved.";
